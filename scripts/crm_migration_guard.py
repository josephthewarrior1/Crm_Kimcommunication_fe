#!/usr/bin/env python3
"""Private, read-only checks for the paired CRM destination-schema release."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys


CHANGESETS = (
    "crm-explicit-database-destinations",
    "crm-pms-event-binding-20261109",
    "crm-strict-database-destinations-20261109",
    "crm-participant-organization-fields-20261109",
)
ORGANIZATION = {
    "organization_group_name": "character varying(255)",
    "organization_brand_name": "character varying(255)",
    "organization_address": "text",
    "organization_office_phone": "character varying(50)",
    "organization_industry": "character varying(100)",
    "organization_size_revenue": "character varying(100)",
    "organization_size_employee": "character varying(100)",
    "organization_branch_name": "character varying(255)",
    "organization_postal_code": "character varying(20)",
    "organization_website": "text",
}
REQUIRED_TABLES = {
    "databases", "database_emails", "events", "event_participants",
    "event_participant_activities", "groups", "companies", "company_branches",
    "flagged_identities", "removal_requests", "audit_logs", "database_merge_audits",
}
FEATURE_COLUMNS = {
    "databases": {"database_destination", "institution_name", "participant_category", *ORGANIZATION},
    "events": {"sync_destination", "pms_event_id"},
    "database_emails": {"database_destination"},
}


class GuardError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise GuardError(message)


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def identifier(value):
    return '"' + value.replace('"', '""') + '"'


class Guard:
    def __init__(self, work, local_test=False):
        self.work = Path(work)
        require(not self.work.is_symlink(), "Work directory cannot be a symbolic link.")
        self.work.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.work = self.work.resolve()
        os.chmod(self.work, 0o700)
        if local_test:
            executable = os.environ.get("CRM_GUARD_PSQL_BIN", "")
            require(Path(executable).is_absolute() and Path(executable).is_file(), "Local test requires an absolute native psql executable.")
            require(os.environ.get("PGHOST") in {"localhost", "127.0.0.1", "::1"} and bool(os.environ.get("PGDATABASE")), "Local test requires an explicit local database.")
            self.command = [executable, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-At"]
        else:
            self.command = [
                "docker", "exec", "-i", "crm-kimtele-postgres", "sh", "-eu", "-c",
                'unset PGHOST PGHOSTADDR PGPORT PGSERVICE PGSERVICEFILE PGOPTIONS PGDATABASE; '
                'exec psql -X -q -w -h /var/run/postgresql -p 5432 -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At',
            ]

    def sql(self, query, output=None):
        statement = ("BEGIN READ ONLY; SET LOCAL lock_timeout='30s'; SET LOCAL statement_timeout='5min'; SET LOCAL timezone='UTC'; SET LOCAL datestyle='ISO'; "
                     "SET LOCAL extra_float_digits=3; SET LOCAL client_encoding='UTF8';\n" + query + "\nCOMMIT;\n")
        with (self.work / "guard-errors.log").open("ab") as errors:
            try:
                result = subprocess.run(self.command, input=statement.encode("utf-8"),
                                        stdout=output if output is not None else subprocess.PIPE,
                                        stderr=errors, check=False)
            except OSError as error:
                errors.write((type(error).__name__ + ": " + str(error) + "\n").encode("utf-8"))
                raise GuardError("Could not execute the database checker; see guard-errors.log.") from None
        require(result.returncode == 0, "Database check failed; see guard-errors.log.")
        return result.stdout.decode("utf-8").strip() if output is None else None

    def state(self):
        changes = ",".join(map(literal, CHANGESETS))
        return json.loads(self.sql("""
SELECT jsonb_build_object(
 'identity',jsonb_build_object('database',current_database(),'oid',(SELECT oid FROM pg_database WHERE datname=current_database())),
 'tables',(SELECT jsonb_object_agg(t.relname,t.columns) FROM (
   SELECT c.relname,jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
     'notnull',a.attnotnull,'default',pg_get_expr(ad.adbin,ad.adrelid)) ORDER BY a.attnum) AS columns
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
   LEFT JOIN pg_attrdef ad ON ad.adrelid=c.oid AND ad.adnum=a.attnum
   WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname NOT IN ('databasechangelog','databasechangeloglock')
   GROUP BY c.relname) t),
 'changes',(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'author',author,'filename',filename,
   'execution',exectype,'checksum',md5sum,'position',orderexecuted) ORDER BY orderexecuted),'[]'::jsonb)
   FROM public.databasechangelog WHERE id IN (""" + changes + """)),
 'locked',(SELECT COALESCE(bool_or(locked),false) FROM public.databasechangeloglock),
 'constraints',(SELECT COALESCE(jsonb_agg(jsonb_build_object('table',c.relname,'name',co.conname,'type',co.contype,
   'valid',co.convalidated,'definition',pg_get_constraintdef(co.oid))),'[]'::jsonb)
   FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname IN ('databases','database_emails','events')),
 'triggers',(SELECT COALESCE(jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'enabled',t.tgenabled,
   'type',t.tgtype,'definition',pg_get_triggerdef(t.oid),'function',pg_get_functiondef(t.tgfoid))),'[]'::jsonb)
   FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname IN ('databases','database_emails')),
 'indexes',(SELECT COALESCE(jsonb_agg(jsonb_build_object('name',ic.relname,'table',tc.relname,
   'unique',i.indisunique,'valid',i.indisvalid,'ready',i.indisready,'keys',i.indnkeyatts,
   'first',pg_get_indexdef(i.indexrelid,1,true),'second',CASE WHEN i.indnkeyatts>=2 THEN pg_get_indexdef(i.indexrelid,2,true) END,
   'predicate',pg_get_expr(i.indpred,i.indrelid))),'[]'::jsonb)
   FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid JOIN pg_class tc ON tc.oid=i.indrelid
   JOIN pg_namespace n ON n.oid=tc.relnamespace WHERE n.nspname='public' AND tc.relname='database_emails')
);
"""))

    def compatible(self, state=None):
        state = state or self.state()
        require(not state["locked"], "Liquibase is locked; stop and investigate.")
        require(REQUIRED_TABLES <= state["tables"].keys(), "Required CRM tables are missing.")
        touched = any(set(FEATURE_COLUMNS[table]) & {c["name"] for c in state["tables"][table]} for table in FEATURE_COLUMNS)
        if not state["changes"] and not touched and "database_destination_splits" not in state["tables"]:
            return "original-main", state
        require(len(state["changes"]) == len(CHANGESETS), "Prototype or partial destination migration detected; deployment stopped.")
        self.check_schema(state)
        return "current-strict", state

    def check_schema(self, state=None):
        state = state or self.state()
        require(not state["locked"], "Liquibase is still locked.")
        changes = state["changes"]
        require(len(changes) == len(CHANGESETS) and [c["id"] for c in changes] == list(CHANGESETS), "Required CRM migrations are missing, duplicated, or out of order.")
        require(all(c["author"] == "codex" and c["execution"] in {"EXECUTED", "RERAN"} and c["checksum"] for c in changes), "CRM migration bookkeeping is invalid.")
        columns = {t: {c["name"]: c for c in cols} for t, cols in state["tables"].items()}
        expected = {
            "databases": {"database_destination": ("character varying(16)", True), "institution_name": ("character varying(255)", False),
                          "participant_category": ("character varying(32)", False), **{k: (v, False) for k, v in ORGANIZATION.items()}},
            "database_emails": {"database_destination": ("character varying(16)", True)},
            "events": {"sync_destination": ("character varying(16)", False), "pms_event_id": ("bigint", False)},
            "database_destination_splits": {"company_database_id": ("bigint", True), "participant_database_id": ("bigint", True)},
        }
        for table, fields in expected.items():
            for field, (sql_type, notnull) in fields.items():
                column = columns.get(table, {}).get(field, {})
                require(column.get("type") == sql_type and column.get("notnull") == notnull, "CRM migration column definition is invalid.")
        require("COMPANY" in (columns["databases"]["database_destination"]["default"] or ""), "Company default is missing.")
        require(all(columns["databases"][field]["default"] is None for field in ORGANIZATION), "Participant fields must remain optional without defaults.")
        constraints = {(c["table"], c["name"]): c for c in state["constraints"]}
        required_constraints = {
            ("databases", "chk_database_destination_exact"): ("c", ("database_destination", "COMPANY", "PARTICIPANT")),
            ("databases", "chk_participant_detached_company"): ("c", ("database_destination", "PARTICIPANT", "company_id", "branch_id")),
            ("database_emails", "chk_email_destination_exact"): ("c", ("database_destination", "COMPANY", "PARTICIPANT")),
            ("events", "uq_events_pms_event_id"): ("u", ("pms_event_id",)),
            ("events", "chk_events_pms_event_positive"): ("c", ("pms_event_id", "> 0")),
        }
        for key, (kind, tokens) in required_constraints.items():
            constraint = constraints.get(key, {})
            require(constraint.get("valid") and constraint.get("type") == kind and all(token in constraint.get("definition", "") for token in tokens), "A required CRM database constraint is missing or invalid.")
        triggers = {(t["table"], t["name"]): t for t in state["triggers"]}
        for key, kind, tokens in (
            (("databases", "crm_database_destination_immutable"), 19, ("NEW.database_destination IS DISTINCT FROM OLD.database_destination", "23514")),
            (("database_emails", "crm_email_destination_scope"), 23, ("parent_destination", "OLD.database_destination<>parent_destination", "NEW.database_destination=parent_destination", "23514")),
        ):
            trigger = triggers.get(key, {})
            require(trigger.get("enabled") in {"O", "A"} and trigger.get("type") == kind and all(token in trigger.get("function", "") for token in tokens), "A CRM destination guard is missing or disabled.")
        indexes = {i["name"]: i for i in state["indexes"]}
        index = indexes.get("unique_personal_email_destination_lower", {})
        require(index.get("unique") and index.get("valid") and index.get("ready") and index.get("keys") == 2
                and index.get("first") == "database_destination" and "lower" in index.get("second", "") and "email" in index.get("second", "")
                and "personal" in (index.get("predicate") or "") and "unique_personal_email_lower" not in indexes,
                "Scoped personal email uniqueness is missing or invalid.")
        company_fields = " OR ".join(identifier(field) + " IS NOT NULL" for field in ORGANIZATION)
        violations = json.loads(self.sql("""
SELECT jsonb_build_object(
 'kind',(SELECT COUNT(*) FROM databases WHERE database_destination IS NULL OR database_destination NOT IN ('COMPANY','PARTICIPANT')),
 'participant_masters',(SELECT COUNT(*) FROM databases WHERE database_destination='PARTICIPANT' AND (company_id IS NOT NULL OR branch_id IS NOT NULL)),
 'email_scope',(SELECT COUNT(*) FROM database_emails e LEFT JOIN databases d ON d.id=e.database_id WHERE d.id IS NULL OR e.database_destination IS DISTINCT FROM d.database_destination),
 'event_kind',(SELECT COUNT(*) FROM events WHERE sync_destination IS NOT NULL AND sync_destination NOT IN ('COMPANY','PARTICIPANT')),
 'event_scope',(SELECT COUNT(*) FROM event_participants ep JOIN events e ON e.id=ep.event_id JOIN databases d ON d.id=ep.database_id WHERE e.sync_destination IS NOT NULL AND d.database_destination IS DISTINCT FROM e.sync_destination),
 'orphan_event',(SELECT COUNT(*) FROM event_participants ep LEFT JOIN events e ON e.id=ep.event_id LEFT JOIN databases d ON d.id=ep.database_id WHERE e.id IS NULL OR d.id IS NULL),
 'orphan_activity',(SELECT COUNT(*) FROM event_participant_activities a LEFT JOIN event_participants ep ON ep.id=a.event_participant_id WHERE ep.id IS NULL),
 'pms_id',(SELECT COUNT(*) FROM events WHERE pms_event_id IS NOT NULL AND pms_event_id<=0),
 'pms_duplicate',(SELECT COUNT(*) FROM (SELECT pms_event_id FROM events WHERE pms_event_id IS NOT NULL GROUP BY pms_event_id HAVING COUNT(*)>1) duplicates),
 'company_organization',(SELECT COUNT(*) FROM databases WHERE database_destination='COMPANY' AND (""" + company_fields + ")));"))
        require(all(value == 0 for value in violations.values()), "CRM destination data invariants failed.")
        return state

    def snapshot(self, table, columns, path):
        projection = ",".join(identifier(c) for c in columns)
        key = 'row_data."id"::text' if "id" in columns else "''::text"
        order = 'row_data."id"' if "id" in columns else "md5(to_jsonb(row_data)::text)"
        query = ("SELECT " + key + " || '|' || md5(to_jsonb(row_data)::text) FROM (SELECT " + projection
                 + " FROM public." + identifier(table) + ") row_data ORDER BY " + order + ";")
        temporary = path.with_suffix(".partial")
        with temporary.open("wb") as output:
            self.sql(query, output)
        temporary.replace(path)
        checksum = hashlib.sha256()
        count = 0
        with path.open("rb") as rows:
            for row in rows:
                require(re.fullmatch(rb"[^|\r\n]*\|[0-9a-f]{32}\r?\n", row) is not None, "Invalid snapshot output; no release applied.")
                checksum.update(row)
                count += 1
        return {"count": count, "sha256": checksum.hexdigest()}

    def capture(self):
        target = self.work / "guard-baseline.json"
        require(not target.exists(), "Baseline already exists; never replace the pre-migration snapshot.")
        mode, state = self.compatible()
        tables = {}
        for table, metadata in sorted(state["tables"].items()):
            columns = [c["name"] for c in metadata]
            # Catalog table names can contain path separators: use a nonsemantic safe filename.
            filename = "guard-table-" + hashlib.sha256(table.encode("utf-8")).hexdigest() + ".before"
            tables[table] = {"columns": columns, "filename": filename,
                             **self.snapshot(table, columns, self.work / filename)}
        temporary = target.with_suffix(".partial")
        temporary.write_text(json.dumps({"version": 1, "mode": mode, "identity": state["identity"], "tables": tables}, indent=2), encoding="utf-8")
        temporary.replace(target)
        print("PASS: private CRM baseline captured (" + str(len(tables)) + " tables).")

    def verify(self):
        path = self.work / "guard-baseline.json"
        require(path.is_file() and not path.is_symlink(), "Pre-migration baseline is missing.")
        baseline = json.loads(path.read_text(encoding="utf-8"))
        require(baseline.get("version") == 1 and baseline.get("mode") in {"original-main", "current-strict"}, "Baseline format is invalid.")
        state = self.check_schema()
        require(state["identity"] == baseline["identity"], "Database identity changed after capture.")
        extra = set(state["tables"]) - set(baseline["tables"])
        require(extra <= {"database_destination_splits"}, "Unexpected tables appeared during migration.")
        total = 0
        for table, before in sorted(baseline["tables"].items()):
            require(table in state["tables"] and set(before["columns"]) <= {c["name"] for c in state["tables"][table]}, "An original CRM table or column disappeared.")
            prefix = "guard-table-" + hashlib.sha256(table.encode("utf-8")).hexdigest()
            original = self.work / (prefix + ".before")
            require(before["filename"] == original.name and original.is_file() and not original.is_symlink(), "A private baseline table snapshot is missing.")
            checksum = hashlib.sha256()
            with original.open("rb") as rows:
                for row in rows:
                    checksum.update(row)
            require(checksum.hexdigest() == before["sha256"], "A private baseline table snapshot changed.")
            after = self.snapshot(table, before["columns"], self.work / (prefix + ".after"))
            require(after["count"] == before["count"] and after["sha256"] == before["sha256"], "Original CRM data changed; keep application services stopped.")
            total += after["count"]
        if baseline["mode"] == "original-main":
            require(self.sql("SELECT (SELECT COUNT(*) FROM databases WHERE database_destination<>'COMPANY') + (SELECT COUNT(*) FROM database_destination_splits) + (SELECT COUNT(*) FROM events WHERE sync_destination IS NOT NULL OR pms_event_id IS NOT NULL);") == "0", "Legacy CRM classification changed unexpectedly.")
        print("PASS: original CRM rows preserved (" + str(total) + " rows).")


def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("require-compatible", "capture", "verify", "schema"))
    parser.add_argument("work", help="Private deployment work directory")
    parser.add_argument("--local-test", action="store_true", help="Explicit native psql testing against a local sandbox only")
    args = parser.parse_args()
    try:
        guard = Guard(args.work, args.local_test)
        if args.action == "require-compatible":
            mode, _ = guard.compatible()
            print("PASS: compatible CRM schema (" + mode + ").")
        elif args.action == "schema":
            guard.check_schema()
            print("PASS: CRM migrations, schema guards, and destination invariants verified.")
        else:
            getattr(guard, args.action)()
    except GuardError as error:
        print("ERROR: " + str(error), file=sys.stderr)
        return 1
    except (OSError, ValueError, KeyError, TypeError):
        print("ERROR: CRM guard metadata could not be read; keep application services stopped.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
