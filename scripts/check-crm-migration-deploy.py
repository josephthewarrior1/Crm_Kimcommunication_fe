"""Offline Bash/Git regression for the CRM schema release; never contacts a server."""
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import uuid


REPO = Path(__file__).resolve().parent.parent
SOURCE = (REPO / 'scripts/deploy-crm-migration.sh').read_text(encoding='utf-8')
BASH = next((p for p in (r'C:\Program Files\Git\bin\bash.exe', shutil.which('bash'))
             if p and Path(p).is_file()), None)
assert BASH and shutil.which('git'), 'Git and Bash are required'
ROOT = REPO / 'outputs' / ('crm-migration-check-' + uuid.uuid4().hex[:8])
ROOT.mkdir(parents=True)
ENV = dict(os.environ, GIT_TERMINAL_PROMPT='0', GIT_CONFIG_NOSYSTEM='1',
           GIT_CONFIG_GLOBAL=os.devnull, GIT_ALLOW_PROTOCOL='file', LC_ALL='C')


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8', newline='\n')


def function(name):
    match = re.search(r'^' + re.escape(name) + r'\(\) \{\n.*?^\}', SOURCE, re.M | re.S)
    assert match, 'Missing deployer function: ' + name
    return match.group(0) + '\n'


def git(directory, *args):
    result = subprocess.run(['git', '-C', str(directory), *args], env=ENV, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


def shell(directory, body, name):
    work = directory / 'work'
    work.mkdir(parents=True, exist_ok=True)
    for tool in ('docker', 'curl', 'wget', 'ssh', 'scp', 'rsync', 'pm2'):
        blocker = work / 'offline-bin' / tool
        write(blocker, '#!/usr/bin/env bash\nprintf "Unexpected external tool blocked: %s\\n" "$0" >&2\nexit 97\n')
        blocker.chmod(0o755)
    script = work / (name + '.sh')
    write(script, '''set -Eeuo pipefail
work="$TEST_DIRECTORY/work"
export PATH="$work/offline-bin:$PATH"
fe="$TEST_DIRECTORY/frontend"
be="$TEST_DIRECTORY/backend"
node=mock_node
pm2_cli=pm2
compose=(mock_compose)
compose_old=(mock_compose)
old_image=old-image
old_tag=old-tag
id=offline-release
migration_container=crm-schema-offline-release
canary_pid=
frozen=0
sources_switched=0
frontend_swapped=0
migration_started=0
complete=0
event() { printf '%s\\n' "$*" >> "$work/events"; }
python3() { "$TEST_PYTHON" "$@"; }
''' + body)
    env = dict(ENV, TEST_DIRECTORY=directory.as_posix(), TEST_PYTHON=Path(sys.executable).as_posix())
    result = subprocess.run([BASH, str(script)], env=env, capture_output=True, text=True)
    write(work / (name + '.stdout'), result.stdout)
    write(work / (name + '.stderr'), result.stderr)
    return result


def fixture(name):
    directory = ROOT / name
    for area in ('frontend', 'backend'):
        write(directory / area / 'source.txt', 'new source retained\n')
    for name in ('database.dump', 'uploads.tar.gz', 'config.txt'):
        write(directory / 'work' / 'backup' / name, 'verified private backup fixture\n')
    write(directory / 'work/backup.tar.gz', 'verified archive fixture\n')
    write(directory / 'work/backup.sha256', 'verified archive checksum fixture\n')
    write(directory / 'work/frontend-state', 'running\n')
    write(directory / 'work/backend-state', 'running\n')
    return directory


MOCK_SERVICES = r'''
mock_node() {
  event "node $*"
  if [[ "$*" == *'stop crm-fe'* ]]; then
    printf 'stopped\n' > "$work/frontend-state"
    test "$CASE" != post-migration-stop-fails
  elif [[ "$*" == *'restart crm-fe'* ]]; then
    test "$CASE" != original-restart-fails || return 1
    printf 'running\n' > "$work/frontend-state"
  fi
}
docker() {
  event "docker $*"
  if [ "$1" = stop ]; then printf 'stopped\n' > "$work/backend-state"; fi
  if [ "$1" = start ]; then
    test "$CASE" != original-container-start-fails || return 1
    printf 'running\n' > "$work/backend-state"
  fi
  if [ "$1" = inspect ]; then printf 'old-image\n'; fi
}
mock_compose() {
  event "compose $*"
  test "$CASE" != original-compose-fails || return 1
  if [[ "$*" == *'up '* ]]; then printf 'running\n' > "$work/backend-state"; fi
}
restore_sources() { event restore_sources; test "$CASE" != source-restore-fails; }
health() { event "health $*"; }
'''


write(ROOT / 'tested-deployer.sh', SOURCE)
syntax = subprocess.run([BASH, '-n', str(ROOT / 'tested-deployer.sh')], capture_output=True, text=True)
assert syntax.returncode == 0, syntax.stderr
cleanup = function('restart_original') + function('cleanup')
cases = [
    ('before-restart', 0, 0, 0, 0, 0, 'FAILED_BEFORE_RESTART'),
    ('backup-fails-before-migration', 1, 0, 0, 0, 0, 'FAILED_RESTORED_BEFORE_MIGRATION'),
    ('sources-before-migration', 1, 1, 0, 0, 0, 'FAILED_RESTORED_BEFORE_MIGRATION'),
    ('original-container-start-fails', 1, 0, 0, 0, 0, 'FAILED_NEEDS_ATTENTION'),
    ('original-restart-fails', 1, 0, 0, 0, 0, 'FAILED_NEEDS_ATTENTION'),
    ('source-restore-fails', 1, 1, 0, 0, 0, 'FAILED_NEEDS_ATTENTION'),
    ('post-migration', 1, 1, 1, 1, 0, 'FAILED_NEEDS_ATTENTION'),
    ('uncertain-migration', 0, 0, 0, 1, 0, 'FAILED_NEEDS_ATTENTION'),
    ('durable-migration-marker', 1, 1, 0, 0, 0, 'FAILED_NEEDS_ATTENTION'),
    ('post-migration-stop-fails', 1, 1, 1, 1, 0, 'FAILED_NEEDS_ATTENTION'),
    ('complete', 1, 1, 1, 1, 1, 'COMPLETE'),
]
for case, frozen, switched, swapped, started, complete, status in cases:
    directory = fixture(case)
    work = directory / 'work'
    retained = {p: p.read_bytes() for p in directory.rglob('*') if p.is_file() and p.name not in ('frontend-state', 'backend-state')}
    write(work / 'status', 'COMPLETE\n' if complete else 'PREPARING\n')
    if case == 'durable-migration-marker':
        write(work / 'migration-started', 'new-backend-sha\n')
    body = MOCK_SERVICES + cleanup + f'''
CASE={case}
frozen={frozen}
sources_switched={switched}
frontend_swapped={swapped}
migration_started={started}
complete={complete}
set +e
(exit {0 if complete else 17})
cleanup
'''
    result = shell(directory, body, 'cleanup')
    assert result.returncode == (0 if complete else 17), (case, result.returncode, result.stderr)
    assert (work / 'status').read_text().strip() == status, (case, result.stderr)
    if not complete:
        assert (work / 'exit-code').read_text().strip() == '17', case
    events = (work / 'events').read_text().splitlines() if (work / 'events').exists() else []
    for path, content in retained.items():
        assert path.read_bytes() == content, (case, 'modified retained source/backup', path)
    assert not any('pg_restore' in value or ' reset ' in value for value in events), (case, events)
    if (started or case == 'durable-migration-marker') and not complete:
        assert 'node pm2 stop crm-fe' in events and 'docker stop crm-kimtele-backend' in events, (case, events)
        assert not any('restart' in value or 'restore_sources' in value or 'image tag' in value or 'compose ' in value for value in events), (case, events)
    elif complete or not frozen:
        assert not events, (case, events)
    elif status == 'FAILED_RESTORED_BEFORE_MIGRATION':
        assert any('restart crm-fe' in value for value in events), (case, events)
        assert (work / 'frontend-state').read_text().strip() == 'running', case
        assert (work / 'backend-state').read_text().strip() == 'running', case
        assert ('restore_sources' in events) == bool(switched), (case, events)

print('PASS: syntax and migration failure boundaries; old apps never restart after migration begins.')


for case, expected, first, wanted in (
        ('ready', '200', '200', 0), ('api-unauthorized', '401', '401', 0),
        ('retry', '200', '502', 0), ('transport-retry', '200', '000', 0),
        ('unhealthy', '200', '503', 1)):
    directory = fixture('health-' + case)
    body = r'''
curl() {
  count=0
  [ ! -f "$work/curl-count" ] || read -r count < "$work/curl-count"
  count=$((count+1)); printf '%s\n' "$count" > "$work/curl-count"
  if [ "$CASE" = unhealthy ] || [ "$count" = 1 ]; then printf '%s' "$FIRST_CODE"; else printf '%s' "$EXPECTED_CODE"; fi
  if [ "$CASE" = transport-retry ] && [ "$count" = 1 ]; then return 7; fi
}
sleep() { event "sleep $*"; }
''' + function('health') + f'''
CASE={case}
FIRST_CODE={first}
EXPECTED_CODE={expected}
health https://offline.example.invalid/check {expected}
'''
    result = shell(directory, body, 'health')
    assert (result.returncode == 0) == (wanted == 0), (case, result.stderr)
    count = int((directory / 'work/curl-count').read_text())
    assert count == 1 if case in ('ready', 'api-unauthorized') else count >= 2, (case, count)
    if case == 'unhealthy':
        assert count < 300, 'Health retries must remain bounded'
print('PASS: HTTP expected codes, transient/transport retry, and bounded failure (mock curl; no network).')


for case in ('success', 'database-unavailable'):
    directory = fixture('sql-' + case)
    body = r'''
docker() {
  event "docker $*"
  cat > "$work/sql-query"
  if [ "$CASE" = database-unavailable ]; then return 23; fi
  printf '41\n'
}
''' + function('sql_scalar') + f'''
CASE={case}
sql_scalar "SELECT 41;"
'''
    result = shell(directory, body, 'sql')
    assert result.returncode == (0 if case == 'success' else 23), (case, result.stderr)
    if case == 'success':
        assert result.stdout.strip() == '41', result.stdout
    assert 'SELECT 41;' in (directory / 'work/sql-query').read_text()
print('PASS: SQL helper returns scalar output and propagates database errors without guessing schema state.')


def git_fixture(name):
    directory = ROOT / ('git-' + name)
    for area in ('frontend', 'backend'):
        live = directory / area
        live.mkdir(parents=True)
        git(live, 'init', '--initial-branch=main')
        git(live, 'config', 'user.name', 'CRM offline check')
        git(live, 'config', 'user.email', 'offline@example.invalid')
        git(live, 'config', 'core.autocrlf', 'false')
        git(live, 'config', 'core.longpaths', 'true')
        write(live / '.gitignore', '.env.production\n.env.ems-v2\ndocker-compose.override.yml\n.next/\nnode_modules/\nuploads/\n')
        write(live / ('app/contact.tsx' if area == 'frontend' else 'src/main/java/Contact.java'), 'reviewed application\n')
        config = 'package-lock.json' if area == 'frontend' else '.env'
        write(live / config, 'tracked baseline config\n')
        if area == 'frontend':
            write(live / 'package.json', '{}\n')
            write(live / 'next.config.js', 'module.exports={}\n')
        else:
            write(live / 'src/main/resources/db/changelog.yaml', 'current schema\n')
            write(live / 'docker-compose.yml', 'current compose\n')
        git(live, 'add', '.')
        git(live, 'commit', '-m', 'Reviewed local fixture')
        write(live / config, 'private retained config ' + area + '\n')
        write(live / ('.env.production' if area == 'frontend' else '.env.ems-v2'), 'private runtime fixture\n')
    return directory


source_state = function('source_state')
for case in ('clean', 'dirty-source', 'untracked-source', 'wrong-branch', 'config-drift', 'source-drift', 'customer-upload'):
    directory = git_fixture(case)
    fe, be = directory / 'frontend', directory / 'backend'
    if case == 'dirty-source':
        write(fe / 'app/contact.tsx', 'unreviewed edit\n')
    if case == 'untracked-source':
        write(be / 'src/main/java/Unreviewed.java', 'unreviewed addition\n')
    if case == 'wrong-branch':
        git(fe, 'checkout', '-b', 'deferred-feature')
    if case == 'customer-upload':
        write(be / 'uploads/customer.csv', 'private customer fixture\n')
    body = source_state + '\nsource_state save\n'
    if case == 'config-drift':
        body += 'printf changed >> "$be/.env"\n'
    if case == 'source-drift':
        body += 'printf changed >> "$fe/app/contact.tsx"\n'
    body += 'source_state check\n'
    result = shell(directory, body, 'source-state')
    assert (result.returncode == 0) == (case in ('clean', 'customer-upload')), (case, result.stderr)
    if case == 'customer-upload':
        assert (be / 'uploads/customer.csv').read_text() == 'private customer fixture\n'
print('PASS: real-Git main/source/config snapshot guards; allowed config and customer uploads preserved.')


BACKUP_MOCKS = r'''
docker() {
  event "docker $*"
  if [[ "$*" == *pg_dump* ]]; then
    test "$CASE" != dump-fails || return 31
    [ "$CASE" = dump-empty ] || printf 'fixture custom-format database dump\n'
  elif [[ "$*" == *pg_restore* ]]; then
    cat > "$work/restore-input"
    test "$CASE" != dump-validation-fails || return 32
  else return 97
  fi
}
tar() {
  event "tar $*"
  if [ "$CASE" = uploads-write-fails ] && [[ "$*" == *'-czf '*'/uploads.tar.gz'* ]]; then return 33; fi
  if [ "$CASE" = uploads-validation-fails ] && [[ "$*" == '-tzf '*'/uploads.tar.gz' ]]; then return 34; fi
  if [ "$CASE" = archive-write-fails ] && [[ "$*" == *'-czf '*'/backup-final.tar.gz'* ]]; then return 35; fi
  if [ "$CASE" = archive-validation-fails ] && [[ "$*" == '-tzf '*'/backup-final.tar.gz' ]]; then return 36; fi
  command tar --force-local "$@"
}
sha256sum() {
  event "sha256sum $*"
  if [ "$CASE" = checksum-write-fails ] && [ "$1" != --check ]; then return 37; fi
  if [ "$CASE" = checksum-validation-fails ] && [ "$1" = --check ]; then return 38; fi
  command sha256sum "$@"
}
'''
for case in ('success', 'dump-fails', 'dump-empty', 'dump-validation-fails', 'uploads-write-fails',
             'uploads-validation-fails', 'archive-write-fails', 'archive-validation-fails',
             'checksum-write-fails', 'checksum-validation-fails'):
    directory = fixture('backup-' + case)
    (directory / 'work/final').mkdir()
    write(directory / 'backend/uploads/customer.txt', 'original customer upload\n')
    result = shell(directory, BACKUP_MOCKS + function('backup_data') + f'''
CASE={case}
backup_data final
printf verified > "$work/after-backup"
''', 'backup')
    assert (result.returncode == 0) == (case == 'success'), (case, result.stderr)
    assert (directory / 'work/after-backup').exists() == (case == 'success'), case
    assert (directory / 'backend/uploads/customer.txt').read_text() == 'original customer upload\n'
    events = (directory / 'work/events').read_text()
    assert not any(value in events for value in ('docker start', 'docker stop', 'compose ', 'image tag'))
    if case == 'success':
        import hashlib
        digest = hashlib.sha256((directory / 'work/backup-final.tar.gz').read_bytes()).hexdigest()
        assert (directory / 'work/backup-final.sha256').read_text().split()[0] == digest
        assert (directory / 'work/restore-input').read_bytes() == (directory / 'work/final/database.dump').read_bytes()
print('PASS: real upload/archive/checksum backup pipeline and nine injected verification/write failures; no service changes.')


phase = SOURCE[SOURCE.index("printf 'STOPPING_WRITERS\\n'"):]
marker_start = phase.index('python3 - "$work" "$be_target" <<\'MARKER\'')
marker_end = phase.index('\nMARKER', marker_start) + len('\nMARKER')
marker = phase[marker_start:marker_end]
assert "'migration-started'),'x'" in marker and 'os.fsync(f.fileno())' in marker and 'os.fsync(fd)' in marker
assert phase.index('backup_data final') < phase.index('migration_guard.py" capture') < marker_start
assert marker_end < phase.index('migration_started=1') < phase.index(' run --no-deps ')
assert '--service-ports' not in next(line for line in phase.splitlines() if '"${compose[@]}" run ' in line)
# The directory fsync is Linux-specific. Execute the remaining production phase unchanged;
# model its exclusive, durable marker separately so this check also runs on Windows Git Bash.
phase = phase[:marker_start] + 'mark_migration_started' + phase[marker_end:]
PHASE_MOCKS = r'''
docker() {
  event "docker $*"
  if [[ "$*" == *pg_dump* ]]; then printf 'fixture database dump\n'
  elif [[ "$*" == *pg_restore* ]]; then cat > "$work/restore-input"
  elif [ "$1" = stop ]; then
    if [ "${!#}" = crm-kimtele-backend ]; then printf stopped > "$work/backend-state"; fi
  elif [ "$1" = start ]; then printf running > "$work/backend-state"
  elif [ "$1" = inspect ] && [[ "$*" == *'.State.Running'* ]]; then printf 'false\n'
  elif [ "$1" = inspect ] && [[ "$*" == *'.Image'* ]]; then cat "$work/backend-image"
  elif [ "$1" = inspect ]; then
    ports='{}'; ip=172.30.0.9; image=new-image; network=test; mount=$be/uploads
    [ "$CASE" != private-published-port ] || ports='{"8081/tcp":[{"HostPort":"8081"}]}'
    [ "$CASE" != private-public-ip ] || ip=8.8.8.8
    [ "$CASE" != private-wrong-image ] || image=old-image
    [ "$CASE" != private-host-network ] || network=host
    [ "$CASE" != private-wrong-mount ] || mount=/wrong/uploads
    printf '[{"Image":"%s","State":{"Running":true},"HostConfig":{"PortBindings":%s,"NetworkMode":"%s"},"Mounts":[{"Type":"bind","Source":"%s","Destination":"/app/uploads"}],"NetworkSettings":{"Networks":{"test":{"IPAddress":"%s"}}}}]\n' "$image" "$ports" "$network" "$mount" "$ip"
  elif [ "$1" = logs ]; then printf 'offline migration log\n'
  elif [ "$1 $2" = 'image tag' ]; then :
  else return 97
  fi
}
mock_node() {
  event "node $*"
  if [[ "$*" == *'stop crm-fe'* ]]; then
    test "$CASE" != stop-writers-fails || return 43
    printf stopped > "$work/frontend-state"
  elif [[ "$*" == *'restart crm-fe'* ]]; then printf running > "$work/frontend-state"
  fi
}
mock_compose() {
  event "compose $*"
  if [[ "$*" == *' run '* ]]; then
    test -f "$work/backup-verified" && test -f "$work/guard-capture" && test -f "$work/migration-started" || return 96
    test "$CASE" != private-start-fails || return 44
    printf 'private-container-id\n'
  elif [[ "$*" == *' up '* ]]; then
    test -f "$work/guard-verify" && test -f "$work/guard-schema" || return 95
    printf new-image > "$work/backend-image"
    printf running > "$work/backend-state"
  fi
}
health() {
  event "health $*"
  if [[ "$1" == http://172.* ]] && [ "$CASE" = private-health-fails ]; then return 45; fi
}
sql_scalar() { event "sql $*"; printf '0\n'; }
sha256sum() {
  event "sha256sum $*"
  if [ "$CASE" = checksum-validation-fails ] && [ "$1" = --check ]; then return 38; fi
  command sha256sum "$@" || return
  if [ "$1" = --check ]; then printf verified > "$work/backup-verified"; fi
}
python3() {
  if [ "$1" = "$work/migration_guard.py" ]; then
    event "guard $2"
    if [ "$CASE" = capture-fails ] && [ "$2" = capture ]; then return 46; fi
    if [ "$CASE" = hash-comparison-fails ] && [ "$2" = verify ]; then return 47; fi
    if [ "$CASE" = schema-fails ] && [ "$2" = schema ]; then return 48; fi
    printf verified > "$work/guard-$2"
    if [ "$CASE" = source-drift ] && [ "$2" = capture ]; then printf drift >> "$fe/app/contact.tsx"; fi
  else "$TEST_PYTHON" "$@"
  fi
}
mark_migration_started() {
  test ! -e "$work/migration-started"
  printf '%s\n' "$be_target" > "$work/migration-started"
  event durable-marker
}
'''
for case in ('success', 'stop-writers-fails', 'checksum-validation-fails', 'capture-fails', 'source-drift',
             'private-start-fails', 'private-published-port', 'private-public-ip', 'private-health-fails',
             'private-wrong-image', 'private-host-network', 'private-wrong-mount',
             'hash-comparison-fails', 'schema-fails'):
    directory = git_fixture('phase-' + case)
    work = directory / 'work'
    targets, old_heads = {}, {}
    for area in ('frontend', 'backend'):
        live = directory / area
        old_heads[area] = git(live, 'rev-parse', 'HEAD')
        path = 'app/contact.tsx' if area == 'frontend' else 'src/main/java/Contact.java'
        write(live / path, 'new reviewed application\n')
        git(live, 'add', path)
        git(live, 'commit', '-m', 'New reviewed fixture')
        targets[area] = git(live, 'rev-parse', 'HEAD')
        git(live, 'reset', '--keep', old_heads[area])
        write(work / 'backup' / (area + '-head'), old_heads[area] + '\n')
    for source, target in ((directory / 'frontend/.env.production', 'frontend.env.production'),
                           (directory / 'backend/.env', 'backend.env'),
                           (directory / 'backend/.env.ems-v2', 'backend.env.ems-v2'),
                           (directory / 'backend/docker-compose.yml', 'docker-compose.yml')):
        shutil.copy2(source, work / 'backup' / target)
    for name in ('.next', 'node_modules'):
        write(directory / 'frontend' / name / 'artifact', 'old artifact\n')
        write(work / 'frontend' / name / 'artifact', 'new artifact\n')
    (work / 'rollback').mkdir()
    (work / 'final').mkdir()
    write(directory / 'backend/uploads/customer.txt', 'original customer upload\n')
    write(work / 'backend-image', 'old-image')
    write(work / 'frontend-state', 'running')
    write(work / 'backend-state', 'running')
    body = BACKUP_MOCKS + function('backup_data') + source_state + function('restore_sources') + cleanup + PHASE_MOCKS + f'''
CASE={case}
new_image=new-image
fe_target={targets['frontend']}
be_target={targets['backend']}
source_state save
trap cleanup EXIT
''' + phase
    result = shell(directory, body, 'migration-phase')
    assert (result.returncode == 0) == (case == 'success'), (case, result.stderr)
    status = (work / 'status').read_text().strip()
    started = (work / 'migration-started').exists()
    expected = 'COMPLETE' if case == 'success' else 'FAILED_NEEDS_ATTENTION' if started else 'FAILED_RESTORED_BEFORE_MIGRATION'
    assert status == expected, (case, status, result.stderr)
    events = (work / 'events').read_text().splitlines()
    private = next((index for index, value in enumerate(events) if value.startswith('compose ') and ' run ' in value), None)
    if private is not None:
        verified = next(i for i, value in enumerate(events) if value.startswith('sha256sum --check --status'))
        assert verified < events.index('guard capture') < events.index('durable-marker') < private, (case, events)
    if started and case != 'success':
        assert not any('restart crm-fe' in value or value == 'docker start crm-kimtele-backend' for value in events), (case, events)
        assert not any(' up ' in value or value.startswith('docker image tag') for value in events), (case, events)
        assert (work / 'frontend-state').read_text() == 'stopped'
        assert (work / 'backend-state').read_text() == 'stopped'
    if not started:
        assert private is None
    for area in ('frontend', 'backend'):
        assert git(directory / area, 'rev-parse', 'HEAD') == (targets[area] if started else old_heads[area]), case
    assert (directory / 'backend/uploads/customer.txt').read_text() == 'original customer upload\n'
    if case == 'success':
        assert events.index('guard verify') < next(i for i, value in enumerate(events) if ' up ' in value)
        assert events.count('guard schema') == 2
        for name in ('.next', 'node_modules'):
            assert (directory / 'frontend' / name / 'artifact').read_text() == 'new artifact\n'
            assert (work / 'rollback' / name / 'artifact').read_text() == 'old artifact\n'
print('PASS: real-Git cutover phase: verified cold backup/capture precede durable marker/private Java; private health/schema/hash failures retain backups/new code and stop both apps.')


targets_start = SOURCE.index('for area in frontend backend; do')
targets_end = SOURCE.index('\ndone\n', targets_start) + len('\ndone\n')
targets_block = SOURCE[targets_start:targets_end]
allowed_schema = 'src/main/resources/db/changelog/changes/changelog-crm-participant-organization-fields.yml'
for case_number, case in enumerate(('allowed-schema', 'frontend-dependency', 'backend-config', 'backend-dependency',
                                   'tagtog-path', 'tagtog-content', 'eo-path', 'unrelated-schema', 'diverged-main', 'off-main-target')):
    directory = git_fixture('t' + str(case_number))
    work = directory / 'work'
    records = {}
    for area in ('frontend', 'backend'):
        live = directory / area
        old = git(live, 'rev-parse', 'HEAD')
        application = 'app/contact.tsx' if area == 'frontend' else 'src/main/java/Contact.java'
        write(live / application, 'new reviewed application\n')
        paths = [application]
        if area == 'backend':
            write(live / allowed_schema, 'databaseChangeLog: []\n')
            paths.append(allowed_schema)
        unsafe = None
        if area == 'frontend':
            if case == 'frontend-dependency':
                unsafe = 'package.json'
            if case == 'tagtog-path':
                unsafe = 'app/api/tagtog/start/route.ts'
            if case == 'tagtog-content':
                write(live / application, 'Continue with TAGTOG\n')
        else:
            if case == 'backend-config':
                unsafe = 'src/main/resources/application.properties'
            if case == 'backend-dependency':
                unsafe = 'Dockerfile'
            if case == 'eo-path':
                unsafe = 'src/main/java/com/crm/EoProspectController.java'
            if case == 'unrelated-schema':
                unsafe = 'src/main/resources/db/changelog/changes/changelog-unreviewed.yml'
        if unsafe:
            write(live / unsafe, 'deferred or unreviewed change\n')
            paths.append(unsafe)
        git(live, 'add', '--', *paths)
        git(live, 'commit', '-m', 'Pinned target fixture')
        target = git(live, 'rev-parse', 'HEAD')
        remote = directory / ('fe.git' if area == 'frontend' else 'be.git')
        remote.mkdir()
        git(remote, 'init', '--bare', '--initial-branch=main')
        git(remote, 'config', 'core.longpaths', 'true')
        git(live, 'remote', 'add', 'origin', str(remote))
        git(live, 'push', 'origin', 'main')
        git(live, 'reset', '--keep', old)
        if area == 'frontend' and case == 'diverged-main':
            write(live / 'local-only.txt', 'local main diverged\n')
            git(live, 'add', 'local-only.txt')
            git(live, 'commit', '-m', 'Local divergent main')
            old = git(live, 'rev-parse', 'HEAD')
        if area == 'frontend' and case == 'off-main-target':
            git(live, 'checkout', '-b', 'unmerged-feature')
            write(live / 'feature-only.txt', 'off main target\n')
            git(live, 'add', 'feature-only.txt')
            git(live, 'commit', '-m', 'Unmerged target')
            target = git(live, 'rev-parse', 'HEAD')
            git(live, 'checkout', 'main')
        records[area] = (old, target, remote)
        (work / area).mkdir(parents=True, exist_ok=True)
    (work / 'backup').mkdir()
    body = source_state + f'''
fe_url='{records['frontend'][2].as_posix()}'
be_url='{records['backend'][2].as_posix()}'
fe_target={records['frontend'][1]}
be_target={records['backend'][1]}
source_state save
''' + targets_block + '\nsource_state check\n'
    result = shell(directory, body, 'target-guards')
    assert (result.returncode == 0) == (case == 'allowed-schema'), (case, result.stderr)
    for area in ('frontend', 'backend'):
        assert git(directory / area, 'rev-parse', 'HEAD') == records[area][0], case
        config = 'package-lock.json' if area == 'frontend' else '.env'
        assert (directory / area / config).read_text() == 'private retained config ' + area + '\n', case
    if case == 'allowed-schema':
        assert (work / 'frontend/app/contact.tsx').read_text() == 'new reviewed application\n'
        assert (work / 'backend' / allowed_schema).exists()
print('PASS: local-only fetch/pinned-main ancestry, allowed schema staging, and dependency/config/TAGTOG/EO/unrelated-schema/divergence rejection before live changes.')
print('Offline artifacts:', ROOT)
