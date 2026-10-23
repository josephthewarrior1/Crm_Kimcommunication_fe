#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
mode=${1:?configure, prepare or apply}
id=${2:?release ID}
checksum=${3:?SHA256}
[[ "$id" =~ ^[0-9]{8}T[0-9]{6}-[a-f0-9]{6}$ ]]
[[ "$checksum" =~ ^[a-f0-9]{64}$ ]]
work=/root/crm-main-release-$id
fe=/var/www/crm-fe
be=/var/www/crm-be
ems_env=$be/.env.ems-v2
override=$be/docker-compose.override.yml
node=/opt/node-v22.23.4-linux-x64/bin/node
export PATH="$(dirname "$node"):$PATH"
pm2_cli=$(readlink -f "$(command -v pm2)")
compose_old=(docker compose -p crm-kimtele --project-directory "$be" -f "$be/docker-compose.yml")
compose_new=("${compose_old[@]}" -f "$override")
canary_pid=
switched=0
complete=0
exec 9>/var/lock/crm-main-deploy.lock
flock -n 9 || { printf 'Another CRM deployment is running.\n' >&2; exit 1; }

health() {
  local url=$1 expected=$2 code
  for attempt in $(seq 1 60); do
    code=$(curl --silent --max-time 3 --output /dev/null --write-out '%{http_code}' "$url" || true)
    if [ "$code" = "$expected" ]; then return 0; fi
    sleep 1
  done
  printf 'Health check failed: %s (expected %s, got %s)\n' "$url" "$expected" "$code" >&2
  return 1
}

sql_scalar() {
  docker exec -i crm-kimtele-postgres sh -eu -c 'exec psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' <<< "$1"
}

nonlegacy_mappings() {
  local present
  present=$(sql_scalar "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='ems_source';") || return 1
  if [ "$present" = 0 ]; then printf '0\n'; return; fi
  test "$present" = 1 || return 1
  sql_scalar "SELECT count(*) FROM events WHERE upper(coalesce(ems_source,'LEGACY')) <> 'LEGACY' AND ems_event_id IS NOT NULL;"
}

restore_sources() {
  python3 - "$work" "$fe" "$be" <<'RESTORE'
import json, os, shutil, sys
w, fe, be = sys.argv[1:]
m = json.load(open(w + '/payload/manifest.json'))
for area, root in (('frontend', fe), ('backend', be)):
    for f in m[area + 'Files']:
        saved, target = w + '/rollback/' + area + '/' + f, root + '/' + f
        if os.path.isfile(saved):
            os.makedirs(os.path.dirname(target), exist_ok=True)
            shutil.copy2(saved, target)
        elif os.path.isfile(target):
            os.unlink(target)
RESTORE
}

rollback_step() {
  "$@" || { printf 'Rollback step failed; CRM needs operator attention. Backup: %s/backup.tar.gz\n' "$work" >&2; exit 1; }
}

cleanup() {
  result=$?
  trap - EXIT
  if [ -n "$canary_pid" ]; then kill "$canary_pid" 2>/dev/null || true; fi
  if [ "$switched" = 1 ] && [ "$complete" != 1 ]; then
    set +e
    "$node" "$pm2_cli" stop crm-fe
    # Freeze writes before deciding whether the legacy application can return.
    if ! docker stop crm-kimtele-backend >/dev/null; then
      printf 'Cannot freeze CRM API. Automatic rollback stopped; inspect %s.\n' "$work" >&2
      exit 1
    fi
    mappings=$(nonlegacy_mappings)
    if [ "$?" != 0 ] || [ "$mappings" != 0 ]; then
      printf 'Automatic downgrade stopped: new EMS mappings exist or could not be checked.\nCRM is stopped to avoid interpreting v2 IDs as legacy IDs. Keep the new code/schema; inspect %s.\n' "$work" >&2
      exit 1
    fi
    rollback_step restore_sources
    for directory in .next node_modules; do
      if [ -d "$work/rollback/$directory" ]; then
        if [ -e "$fe/$directory" ]; then rollback_step mv "$fe/$directory" "$work/failed-$directory"; fi
        rollback_step mv "$work/rollback/$directory" "$fe/$directory"
      fi
    done
    if [ -f "$override" ] && cmp -s "$override" "$work/compose.override.json"; then rollback_step rm -- "$override"; fi
    rollback_step docker image tag "$(cat "$work/old-image-id")" "$(cat "$work/old-image-tag")"
    rollback_step "${compose_old[@]}" up -d --no-deps --no-build --pull never backend
    rollback_step "$node" "$pm2_cli" restart crm-fe
    rollback_step "$node" "$pm2_cli" save
    if health https://crm.kimcommunication.id/login 200 && health https://crm-api.kimcommunication.id/api/auth/me 401; then
      printf 'Previous CRM application restored. Additive EMS schema retained; database was not restored or dropped.\n' >&2
    else
      printf 'Rollback needs operator attention. Backup retained at %s.\n' "$work" >&2
    fi
  elif [ "$result" != 0 ]; then
    printf 'CRM preparation stopped before service changes. Inspect %s/prepare.log.\n' "$work" >&2
  fi
  exit "$result"
}
trap cleanup EXIT

ems_config() {
  python3 - "$ems_env" "$1" <<'EMS_CONFIG'
import json, re, sys, urllib.error, urllib.parse, urllib.request
file, mode = sys.argv[1:]
allowed = {'EMS_V2_API_URL','EMS_V2_IAM_URL','EMS_V2_ADMIN_EMAIL','EMS_V2_ADMIN_PASSWORD','EMS_V2_ACCESS_TOKEN'}
values = {}
try:
    with open(file) as stream:
        for line in stream.read().splitlines():
            if not line.strip() or line.lstrip().startswith('#'): continue
            key, value = line.split('=', 1)
            assert key in allowed and key not in values, 'Use only the five EMS_V2 settings, once each'
            values[key] = value
    assert values.get('EMS_V2_API_URL','').startswith('https://'), 'EMS_V2_API_URL must use HTTPS'
    if not values.get('EMS_V2_ACCESS_TOKEN','').strip():
        assert values.get('EMS_V2_IAM_URL','').startswith('https://'), 'EMS_V2_IAM_URL must use HTTPS'
        assert values.get('EMS_V2_ADMIN_EMAIL','').strip() and values.get('EMS_V2_ADMIN_PASSWORD','').strip(), 'Fill the EMS v2 account on the server first'
    for key in ('EMS_V2_API_URL','EMS_V2_IAM_URL'):
        if not values.get(key): continue
        parsed = urllib.parse.urlsplit(values[key])
        assert parsed.scheme == 'https' and parsed.hostname and not parsed.username and not parsed.password and not parsed.query and not parsed.fragment, 'Invalid EMS HTTPS base URL'
    if mode == 'check':
        print('EMS server configuration present; values hidden.')
        sys.exit(0)
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl): return None
    opener = urllib.request.build_opener(NoRedirect())
    def request(base, path, body=None, token=None):
        headers = {'Accept':'application/json'}
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers['Content-Type'] = 'application/json'
        if token: headers['Authorization'] = 'Bearer ' + token
        req = urllib.request.Request(base.rstrip('/') + path, data=data, headers=headers)
        with opener.open(req, timeout=30) as response: envelope = json.load(response)
        assert isinstance(envelope, dict) and envelope.get('error') is None and envelope.get('data') is not None
        return envelope['data']
    token = re.sub(r'(?i)^Bearer\s+', '', values.get('EMS_V2_ACCESS_TOKEN','').strip()).strip()
    if not token:
        login = request(values['EMS_V2_IAM_URL'], '/api/auth/login', {'email':values['EMS_V2_ADMIN_EMAIL'].strip(),'password':values['EMS_V2_ADMIN_PASSWORD']})
        assert login.get('tokenType','').lower() == 'bearer'
        token = login['accessToken']
    events = request(values['EMS_V2_API_URL'], '/api/events?archived=false', token=token)
    assert isinstance(events, list)
    print('EMS v2 read check passed: %d accessible events. No CRM synchronization performed.' % len(events))
except (Exception, AssertionError):
    sys.exit('EMS configuration/read check failed. Check the server env file, HTTPS URLs, credentials and read permissions; values are never printed.')
EMS_CONFIG
}

source_state() {
  python3 - "$1" "$work" "$fe" "$be" "$ems_env" <<'SOURCE_STATE'
import hashlib, json, os, subprocess, sys
mode, work, fe, be, env = sys.argv[1:]
areas = ((fe, 'app components lib public package.json next.config.js tsconfig.json tailwind.config.js postcss.config.js eslint.config.mjs'.split(), ['package-lock.json','.env.production']), (be, ['src','pom.xml','Dockerfile','.dockerignore'], ['.env','docker-compose.yml','.env.ems-v2']))
state = {}
for root, sources, config in areas:
    subprocess.run(['git','-C',root,'diff','--quiet','HEAD','--',*sources],check=True)
    assert not subprocess.check_output(['git','-C',root,'ls-files','--others','--exclude-standard','--',*sources],text=True).strip(), 'Unreviewed application source exists'
    for entry in sources + config:
        path = root + '/' + entry
        paths = [path]
        if os.path.isdir(path):
            paths = []
            for directory, dirs, files in os.walk(path):
                assert not any(os.path.islink(os.path.join(directory,d)) for d in dirs), 'Directory symlink refused'
                paths.extend(os.path.join(directory,f) for f in files)
        for file in paths:
            assert not os.path.islink(file), 'Source symlink refused'
            if os.path.isfile(file):
                with open(file,'rb') as stream: state[file] = hashlib.file_digest(stream,'sha256').hexdigest()
target = work + '/source-state.json'
if mode == 'save':
    with open(target,'w') as stream: json.dump(state,stream,sort_keys=True)
else: assert state == json.load(open(target)), 'Source/config changed during preparation; stopped'
SOURCE_STATE
}

prepare() {
  printf '%s  %s\n' "$checksum" "$work/source.tar.gz" | sha256sum --check -
  test ! -e "$override"
  test -f "$ems_env"
  chmod 600 "$ems_env"
  ems_config check
  mkdir -m 700 "$work/payload" "$work/rollback" "$work/backup"
  python3 - "$work" "$fe" "$be" <<'PREFLIGHT'
import json, os, pathlib, subprocess, sys, tarfile
w, fe, be = sys.argv[1:]
with tarfile.open(w + '/source.tar.gz') as archive:
    for member in archive.getmembers():
        parts = member.name.split('/')
        assert not member.name.startswith('/') and '..' not in parts and (member.isdir() or member.isfile())
        assert parts[0] in ('frontend','backend','manifest.json')
    archive.extractall(w + '/payload',filter='data')
m = json.load(open(w + '/payload/manifest.json'))
assert m['frontendSource'] == '39c8bf84c04506801d3672ba1d95823e3337cfd9'
assert m['backendSource'] == 'd93f41d49a5651522ec381177f2bc5fa81baf3e6'
for area, root in (('frontend',fe),('backend',be)):
    assert subprocess.check_output(['git','-C',root,'rev-parse','HEAD'],text=True).strip() == m[area + 'Base'], 'Live Git base differs'
    listed = set(m[area + 'Files'])
    actual = {str(p.relative_to(w + '/payload/' + area)) for p in pathlib.Path(w + '/payload/' + area).rglob('*') if p.is_file()}
    assert listed == actual
    for f in listed:
        assert f and not f.startswith('/') and '..' not in f.split('/')
        target = pathlib.Path(root,f)
        assert target.resolve().is_relative_to(root) and not target.is_symlink()
        tracked = subprocess.run(['git','-C',root,'ls-files','--error-unmatch',f],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode == 0
        assert tracked or not target.exists(), 'New release path already exists: ' + f
PREFLIGHT
  source_state save
  "$node" "$pm2_cli" jlist > "$work/pm2-before.json"
  python3 - "$work" <<'PM2_CHECK'
import json, sys
w = sys.argv[1]
p = next(p for p in json.load(open(w + '/pm2-before.json')) if p['name']=='crm-fe')
assert p['pm2_env']['pm_cwd']=='/var/www/crm-fe'
assert p['pm2_env']['exec_interpreter']=='/opt/node-v22.23.4-linux-x64/bin/node'
assert p['pm2_env']['args']==['start','--','-p','3000']
open(w + '/old-fe-pid','w').write(str(p['pid']))
PM2_CHECK
  docker inspect --format '{{.Id}}' crm-kimtele-backend > "$work/old-container-id"
  docker inspect --format '{{.Image}}' crm-kimtele-backend > "$work/old-image-id"
  docker inspect --format '{{.Config.Image}}' crm-kimtele-backend > "$work/old-image-tag"
  test "$(cat "$work/old-image-tag")" = crm-kimtele-backend
  docker inspect crm-kimtele-backend crm-kimtele-postgres > "$work/backup/crm-containers.json"
  cp "$work/pm2-before.json" "$work/backup/pm2-before.json"
  python3 - "$ems_env" "$work" <<'COMPOSE_OVERRIDE'
import json, sys
env, work = sys.argv[1:]
with open(work + '/compose.override.json','w') as stream:
    json.dump({'services':{'backend':{'env_file':[{'path':env,'format':'raw'}]}}},stream)
COMPOSE_OVERRIDE
  "${compose_old[@]}" -f "$work/compose.override.json" config --quiet
  ems_config probe
  cp "$fe/.env.production" "$work/payload/frontend/.env.production"
  (
    cd "$work/payload/frontend"
    export NEXT_PUBLIC_API_BASE_URL=https://crm-api.kimcommunication.id
    "$node" /opt/node-v22.23.4-linux-x64/lib/node_modules/npm/bin/npm-cli.js ci --no-audit --no-fund
    "$node" <<'VERIFY_DEPENDENCIES'
const assert = require('node:assert/strict');
assert.equal(require('next/package.json').version,'16.4.2');
assert.equal(require('react/package.json').version,'19.3.1');
assert.equal(require('react-dom/package.json').version,'19.3.1');
const sharp = require('sharp').versions.sharp, p = sharp.split('.').map(Number);
assert(/^\d+\.\d+\.\d+$/.test(sharp) && (p[0]>0 || p[1]>35 || (p[1]===35 && p[2]>=5)),'Unpatched Sharp');
VERIFY_DEPENDENCIES
    "$node" /opt/node-v22.23.4-linux-x64/lib/node_modules/npm/bin/npm-cli.js run build
  )
  docker build -t "crm-main-backend:$id" "$work/payload/backend"
  test -z "$(ss -lntH '( sport = :13000 )')"
  (cd "$work/payload/frontend" && exec "$node" node_modules/next/dist/bin/next start -p 13000 --hostname 127.0.0.1) < /dev/null > "$work/canary.log" 2>&1 &
  canary_pid=$!
  health http://127.0.0.1:13000/login 200
  kill "$canary_pid"
  wait "$canary_pid" || true
  canary_pid=
  # Logical snapshot, not a copy of running PostgreSQL data files.
  docker exec crm-kimtele-postgres sh -eu -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$work/backup/crm_kimtele.dump"
  docker exec -i crm-kimtele-postgres pg_restore --file=/dev/null < "$work/backup/crm_kimtele.dump"
  tar -C / --exclude='var/www/crm-fe/node_modules' --exclude='var/www/crm-fe/.git' --exclude='var/www/crm-fe/.next/cache' --exclude='var/www/crm-be/.git' --exclude='var/www/crm-be/target' -cf "$work/backup/application-and-uploads.tar" var/www/crm-fe var/www/crm-be
  tar -C "$work/backup" -czf "$work/backup.tar.gz" .
  tar -tzf "$work/backup.tar.gz" > /dev/null
  sha256sum "$work/backup.tar.gz" | cut -d ' ' -f 1 > "$work/backup.sha256"
  python3 - "$work" "$fe" "$be" <<'SAVE_SOURCES'
import json, os, shutil, sys
w, fe, be = sys.argv[1:]
m = json.load(open(w + '/payload/manifest.json'))
for area, root in (('frontend',fe),('backend',be)):
    for f in m[area + 'Files']:
        source, target = root + '/' + f, w + '/rollback/' + area + '/' + f
        if os.path.isfile(source):
            os.makedirs(os.path.dirname(target),exist_ok=True)
            shutil.copy2(source,target)
SAVE_SOURCES
  touch "$work/prepared"
}

test "$(realpath "$fe")" = "$fe"
test "$(realpath "$be")" = "$be"
test "$("$node" --version)" = v22.23.4

case "$mode" in
  configure)
    if [ ! -e "$ems_env" ]; then install -m 600 "$work/ems-v2.env.example" "$ems_env"; fi
    chmod 600 "$ems_env"
    nano "$ems_env"
    ems_config check
    ;;
  prepare)
    prepare > "$work/prepare.log" 2>&1
    python3 - "$work" <<'REPORT'
import json, os, sys
w = sys.argv[1]
print(json.dumps({'backup':w + '/backup.tar.gz','bytes':os.path.getsize(w + '/backup.tar.gz'),'sha256':open(w + '/backup.sha256').read().strip()}))
REPORT
    ;;
  apply)
    test -f "$work/prepared"
    test ! -e "$work/apply-started"
    test ! -e "$override"
    test "$checksum" = "$(cat "$work/backup.sha256")"
    source_state check
    test "$(docker inspect --format '{{.Id}}' crm-kimtele-backend)" = "$(cat "$work/old-container-id")"
    "$node" "$pm2_cli" jlist | python3 -c 'import json,sys; w=sys.argv[1]; p=next(p for p in json.load(sys.stdin) if p["name"]=="crm-fe"); assert str(p["pid"])==open(w+"/old-fe-pid").read()' "$work"
    touch "$work/apply-started"
    switched=1
    "$node" "$pm2_cli" stop crm-fe
    python3 - "$work" "$fe" "$be" <<'INSTALL_SOURCES'
import json, os, shutil, sys
w, fe, be = sys.argv[1:]
m = json.load(open(w + '/payload/manifest.json'))
for area, root in (('frontend',fe),('backend',be)):
    for f in m[area + 'Files']:
        target = root + '/' + f
        os.makedirs(os.path.dirname(target),exist_ok=True)
        shutil.copy2(w + '/payload/' + area + '/' + f,target)
INSTALL_SOURCES
    cp "$work/compose.override.json" "$override"
    docker image tag "crm-main-backend:$id" "$(cat "$work/old-image-tag")"
    "${compose_new[@]}" up -d --no-deps --no-build --pull never backend
    health https://crm-api.kimcommunication.id/api/auth/me 401
    test "$(sql_scalar "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='ems_source';")" = 1
    test "$(sql_scalar "SELECT count(*) FROM databasechangelog WHERE id='add-ems-source-to-events';")" = 1
    mv "$fe/.next" "$work/rollback/.next"
    mv "$work/payload/frontend/.next" "$fe/.next"
    mv "$fe/node_modules" "$work/rollback/node_modules"
    mv "$work/payload/frontend/node_modules" "$fe/node_modules"
    "$node" "$pm2_cli" restart crm-fe
    health http://127.0.0.1:3000/login 200
    health https://crm.kimcommunication.id/login 200
    "$node" "$pm2_cli" save
    complete=1
    touch "$work/complete"
    printf 'CRM security/dashboard/EMS v2 release deployed. EO Scout and TAGTOG excluded.\nBackup: %s/backup.tar.gz\n' "$work"
    ;;
  *) printf 'Use configure, prepare or apply.\n' >&2; exit 2;;
esac
