#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
mode=${1:?prepare or apply}
id=${2:?release ID}
checksum=${3:?SHA256}
[[ "$id" =~ ^[0-9]{8}T[0-9]{6}-[a-f0-9]{6}$ ]]
[[ "$checksum" =~ ^[a-f0-9]{64}$ ]]
work=/root/crm-ui-release-$id
fe=/var/www/crm-fe
be=/var/www/crm-be
node=/opt/node-v22.23.4-linux-x64/bin/node
export PATH="$(dirname "$node"):$PATH"
pm2_cli=$(readlink -f "$(command -v pm2)")
compose=(docker compose -p crm-kimtele --project-directory "$be" -f "$be/docker-compose.yml")
canary_pid=
switched=0
complete=0

health() {
  local url=$1 expected=$2 code
  for attempt in $(seq 1 45); do
    code=$(curl --silent --max-time 3 --output /dev/null --write-out '%{http_code}' "$url" || true)
    if [ "$code" = "$expected" ]; then return 0; fi
    sleep 1
  done
  printf 'Health check failed: %s (expected %s, got %s)\n' "$url" "$expected" "$code" >&2
  return 1
}

restore_sources() {
  for area in frontend backend; do
    if [ "$area" = frontend ]; then destination=$fe; else destination=$be; fi
    if [ -d "$work/rollback/$area" ]; then
      cp -a "$work/rollback/$area/." "$destination/"
    fi
  done
  python3 - "$work" "$fe" <<'REMOVE_ADDED'
import json, os, sys
work, root = sys.argv[1:]
for f in json.load(open(work + '/payload/manifest.json'))['frontendFiles']:
    if not os.path.isfile(work + '/rollback/frontend/' + f) and os.path.isfile(root + '/' + f):
        os.unlink(root + '/' + f)
REMOVE_ADDED
}

cleanup() {
  result=$?
  trap - EXIT
  if [ -n "$canary_pid" ]; then kill "$canary_pid" 2>/dev/null || true; fi
  if [ "$switched" = 1 ] && [ "$complete" != 1 ]; then
    set +e
    printf 'Deploy failed; rolling back CRM application/build (not the database).\n' >&2
    "$node" "$pm2_cli" stop crm-fe
    if [ -d "$work/rollback/next" ]; then
      if [ -e "$fe/.next" ]; then mv "$fe/.next" "$work/failed-next"; fi
      mv "$work/rollback/next" "$fe/.next"
    fi
    if [ -d "$work/rollback/node_modules" ]; then
      if [ -e "$fe/node_modules" ]; then mv "$fe/node_modules" "$work/failed-node_modules"; fi
      mv "$work/rollback/node_modules" "$fe/node_modules"
    fi
    restore_sources
    docker image tag "$(cat "$work/old-image-id")" "$(cat "$work/old-image-tag")"
    "${compose[@]}" up -d --no-deps --no-build --pull never backend
    "$node" "$pm2_cli" restart crm-fe
    "$node" "$pm2_cli" save
    if health https://crm.kimcommunication.id/login 200 && health https://crm-api.kimcommunication.id/api/auth/me 401; then
      printf 'Rollback HTTP checks passed. Inspect the release logs before retrying.\n' >&2
    else
      printf 'Rollback needs operator attention. Backup retained at %s.\n' "$work" >&2
    fi
  fi
  exit "$result"
}
trap cleanup EXIT

test "$(realpath "$fe")" = "$fe"
test "$(realpath "$be")" = "$be"
test "$("$node" --version)" = v22.23.4

source_state() {
  python3 - "$1" "$work" "$fe" "$be" <<'SOURCE_STATE'
import hashlib, json, os, subprocess, sys
mode, work, fe, be = sys.argv[1:]
fe_source = 'app components lib public styles package.json next.config.js tsconfig.json tailwind.config.js postcss.config.js eslint.config.mjs .eslintrc.json .eslintrc.js'.split()
be_source = 'src pom.xml Dockerfile .dockerignore .mvn mvnw'.split()
state = {}
for root, sources, config in ((fe, fe_source, ['package-lock.json', '.env.production']), (be, be_source, ['.env', 'docker-compose.yml'])):
    subprocess.run(['git', '-C', root, 'diff', '--quiet', 'HEAD', '--', *sources], check=True)
    extra = subprocess.check_output(['git', '-C', root, 'ls-files', '--others', '--exclude-standard', '--', *sources], text=True)
    assert not extra.strip(), 'Untracked application source must be reviewed first: ' + extra
    for entry in sources + config:
        path = os.path.join(root, entry)
        paths = [path]
        if os.path.isdir(path):
            paths = []
            for directory, dirs, files in os.walk(path):
                assert not any(os.path.islink(os.path.join(directory, d)) for d in dirs), 'Source directory symlink refused'
                paths.extend(os.path.join(directory, f) for f in files)
        for file in paths:
            assert not os.path.islink(file), 'Source symlink refused: ' + file
            if os.path.isfile(file):
                with open(file, 'rb') as stream:
                    state[file] = hashlib.file_digest(stream, 'sha256').hexdigest()
target = work + '/source-state.json'
if mode == 'save':
    with open(target, 'w') as stream: json.dump(state, stream, sort_keys=True)
else:
    assert state == json.load(open(target)), 'Application source/config changed during preparation; deployment stopped'
SOURCE_STATE
}

prepare() {
  printf '%s  %s\n' "$checksum" "$work/source.tar.gz" | sha256sum --check -
  mkdir -m 700 "$work/payload" "$work/staging" "$work/rollback" "$work/backup"
  python3 - "$work" "$fe" "$be" <<'PREFLIGHT'
import json, os, subprocess, sys, tarfile
work, fe, be = sys.argv[1:]
with tarfile.open(work + '/source.tar.gz') as t:
    for m in t.getmembers():
        parts = m.name.split('/')
        assert not m.name.startswith('/') and '..' not in parts and not m.issym() and not m.islnk(), m.name
        assert parts[0] in ('frontend', 'patches', 'manifest.json'), m.name
    t.extractall(work + '/payload', filter='data')
m = json.load(open(work + '/payload/manifest.json'))
for root, key in ((fe, 'frontendHead'), (be, 'backendHead')):
    assert subprocess.check_output(['git', '-C', root, 'rev-parse', 'HEAD'], text=True).strip() == m[key], 'Server base revision differs'
for f in m['frontendFiles']:
    assert f and not f.startswith('/') and '..' not in f.split('/')
    target = os.path.join(fe, f)
    tracked = subprocess.run(['git', '-C', fe, 'ls-files', '--error-unmatch', f], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    if tracked and f != 'package-lock.json':
        subprocess.run(['git', '-C', fe, 'diff', '--quiet', 'HEAD', '--', f], check=True)
    elif not tracked:
        assert not os.path.exists(target), 'New UI path already exists: ' + f
PREFLIGHT
  source_state save
  "$node" "$pm2_cli" jlist > "$work/pm2-before.json"
  python3 - "$work" <<'PM2_CHECK'
import json, sys
work = sys.argv[1]
p = next(p for p in json.load(open(work + '/pm2-before.json')) if p['name'] == 'crm-fe')
assert p['pm2_env']['pm_cwd'] == '/var/www/crm-fe'
assert p['pm2_env']['exec_interpreter'] == '/opt/node-v22.23.4-linux-x64/bin/node'
assert p['pm2_env']['args'] == ['start', '--', '-p', '3000']
open(work + '/old-fe-pid', 'w').write(str(p['pid']))
PM2_CHECK
  docker inspect --format '{{.Id}}' crm-kimtele-backend > "$work/old-container-id"
  docker inspect --format '{{.Image}}' crm-kimtele-backend > "$work/old-image-id"
  docker inspect --format '{{.Config.Image}}' crm-kimtele-backend > "$work/old-image-tag"
  test "$(cat "$work/old-image-tag")" = crm-kimtele-backend
  docker inspect crm-kimtele-backend crm-kimtele-postgres > "$work/backup/crm-containers.json"
  cp "$work/pm2-before.json" "$work/backup/pm2-before.json"

  mkdir -p "$work/staging/frontend" "$work/staging/backend"
  for entry in app components lib public styles package.json package-lock.json next.config.js next-env.d.ts tsconfig.json tailwind.config.js postcss.config.js eslint.config.mjs .eslintrc.json .eslintrc.js; do
    if [ -e "$fe/$entry" ]; then cp -a "$fe/$entry" "$work/staging/frontend/"; fi
  done
  test -f "$fe/.env.production"
  cp "$fe/.env.production" "$work/staging/frontend/.env.production"
  cp -a "$work/payload/frontend/." "$work/staging/frontend/"
  for entry in src pom.xml Dockerfile .dockerignore .mvn mvnw; do
    if [ -e "$be/$entry" ]; then cp -a "$be/$entry" "$work/staging/backend/"; fi
  done
  (
    cd "$work/staging/backend"
    git apply --check "$work/payload/patches/dashboard.patch"
    git apply "$work/payload/patches/dashboard.patch"
    git apply --check "$work/payload/patches/database.patch"
    git apply "$work/payload/patches/database.patch"
  )
  (
    cd "$work/staging/frontend"
    export NEXT_PUBLIC_API_BASE_URL=https://crm-api.kimcommunication.id
    "$node" /opt/node-v22.23.4-linux-x64/lib/node_modules/npm/bin/npm-cli.js ci --no-audit --no-fund
    "$node" <<'VERIFY_DEPENDENCIES'
const assert = require('node:assert/strict');
assert.equal(require('next/package.json').version, '16.4.2', 'Next.js security version differs');
assert.equal(require('react/package.json').version, '19.3.1', 'React security version differs');
assert.equal(require('react-dom/package.json').version, '19.3.1', 'React DOM security version differs');
const sharp = require('sharp').versions.sharp;
const parts = sharp.split('.').map(Number);
assert(/^\d+\.\d+\.\d+$/.test(sharp) && (parts[0] > 0 || parts[1] > 35 || (parts[1] === 35 && parts[2] >= 5)), 'Sharp must be patched to 0.35.5 or newer');
VERIFY_DEPENDENCIES
    "$node" /opt/node-v22.23.4-linux-x64/lib/node_modules/npm/bin/npm-cli.js run build
  )
  docker build -t "crm-ui-backend:$id" "$work/staging/backend"

  test -z "$(ss -lntH '( sport = :13000 )')"
  (cd "$work/staging/frontend" && exec "$node" node_modules/next/dist/bin/next start -p 13000 --hostname 127.0.0.1) < /dev/null > "$work/canary.log" 2>&1 &
  canary_pid=$!
  health http://127.0.0.1:13000/login 200
  kill "$canary_pid"
  wait "$canary_pid" || true
  canary_pid=

  # Fresh logical DB snapshot and complete application/uploads backup. No PGDATA copy.
  docker exec crm-kimtele-postgres sh -eu -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$work/backup/crm_kimtele.dump"
  docker exec -i crm-kimtele-postgres pg_restore --file=/dev/null < "$work/backup/crm_kimtele.dump"
  tar -C / --exclude='var/www/crm-fe/node_modules' --exclude='var/www/crm-fe/.git' --exclude='var/www/crm-fe/.next/cache' --exclude='var/www/crm-be/.git' --exclude='var/www/crm-be/target' -cf "$work/backup/application-and-uploads.tar" var/www/crm-fe var/www/crm-be
  tar -C "$work/backup" -czf "$work/backup.tar.gz" .
  tar -tzf "$work/backup.tar.gz" > /dev/null
  sha256sum "$work/backup.tar.gz" | cut -d ' ' -f 1 > "$work/backup.sha256"
  mkdir -p "$work/rollback/frontend" "$work/rollback/backend/src/main/java/com/crm/controller"
  python3 - "$work" "$fe" <<'COPY_ROLLBACK'
import json, os, shutil, sys
work, root = sys.argv[1:]
for f in json.load(open(work + '/payload/manifest.json'))['frontendFiles']:
    if os.path.isfile(root + '/' + f):
        dst = work + '/rollback/frontend/' + f
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(root + '/' + f, dst)
COPY_ROLLBACK
  cp -a "$be/src/main/java/com/crm/controller/DatabaseController.java" "$be/src/main/java/com/crm/controller/DashboardController.java" "$work/rollback/backend/src/main/java/com/crm/controller/"
  touch "$work/prepared"
}

case "$mode" in
  prepare)
    prepare > "$work/prepare.log" 2>&1
    python3 - "$work" <<'REPORT'
import json, os, sys
w = sys.argv[1]
print(json.dumps({'backup': w + '/backup.tar.gz', 'bytes': os.path.getsize(w + '/backup.tar.gz'), 'sha256': open(w + '/backup.sha256').read().strip()}))
REPORT
    ;;
  apply)
    test -f "$work/prepared"
    test "$checksum" = "$(cat "$work/backup.sha256")"
    source_state check
    test "$(docker inspect --format '{{.Id}}' crm-kimtele-backend)" = "$(cat "$work/old-container-id")"
    "$node" "$pm2_cli" jlist | python3 -c 'import json,sys; w=sys.argv[1]; p=next(p for p in json.load(sys.stdin) if p["name"]=="crm-fe"); assert str(p["pid"])==open(w+"/old-fe-pid").read()' "$work"
    switched=1
    cp -a "$work/staging/backend/src/main/java/com/crm/controller/DatabaseController.java" "$work/staging/backend/src/main/java/com/crm/controller/DashboardController.java" "$be/src/main/java/com/crm/controller/"
    docker image tag "crm-ui-backend:$id" "$(cat "$work/old-image-tag")"
    "${compose[@]}" up -d --no-deps --no-build --pull never backend
    health https://crm-api.kimcommunication.id/api/auth/me 401
    "$node" "$pm2_cli" stop crm-fe
    cp -a "$work/payload/frontend/." "$fe/"
    mv "$fe/.next" "$work/rollback/next"
    mv "$work/staging/frontend/.next" "$fe/.next"
    mv "$fe/node_modules" "$work/rollback/node_modules"
    mv "$work/staging/frontend/node_modules" "$fe/node_modules"
    "$node" "$pm2_cli" restart crm-fe
    health http://127.0.0.1:3000/login 200
    health https://crm.kimcommunication.id/login 200
    "$node" "$pm2_cli" save
    complete=1
    printf 'CRM UI deployed. Database migrations/EMS v2/EO Scout/TAGTOG were not deployed.\nBackup: %s/backup.tar.gz\n' "$work"
    ;;
  *) printf 'Use prepare or apply.\n' >&2; exit 2;;
esac
