#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
mode=${1:-start}
case "$mode" in start|prepare|continue|apply|logs|status) ;; *) printf 'Usage: deploy-crm-git.sh [start|continue|logs|status] [release-folder]\n' >&2; exit 2;; esac
case "$mode" in
  start) test "$#" -le 1 ;;
  apply) test "$#" = 3 ;;
  *) test "$#" = 2 ;;
esac
[ "$(id -u)" = 0 ] || { printf 'Jalankan sebagai root.\n' >&2; exit 1; }
fe=/var/www/crm-fe
be=/var/www/crm-be
ems_env=$be/.env.ems-v2
override=$be/docker-compose.override.yml
node=/opt/node-v24.22.1-linux-x64/bin/node
npm_cli=/opt/node-v24.22.1-linux-x64/lib/node_modules/npm/bin/npm-cli.js
pm2_cli=$(readlink -f "$(command -v pm2)")
fe_url=https://github.com/josephthewarrior1/Crm_Kimcommunication_fe.git
be_url=https://github.com/josephthewarrior1/Crm_Kimcommunication_be.git
export GIT_TERMINAL_PROMPT=0
if [ "$mode" = start ]; then
  for program in nohup setsid; do command -v "$program" >/dev/null; done
  id=$(date -u +%Y%m%dT%H%M%S)-$(python3 -c 'import secrets; print(secrets.token_hex(3))')
  work=/root/crm-git-deploy-$id
  mkdir -m 700 "$work"
  cp -- "$(realpath "$0")" "$work/deploy.sh"
  touch "$work/apply.log"
  nohup setsid bash "$work/deploy.sh" prepare "$work" < /dev/null > "$work/prepare.log" 2>&1 &
  printf 'Git main FE/BE + Node 24.22.1 + Next.js 16.4.3. Build dan backup berjalan di background.\nFolder: %s\nLog: bash "%s/deploy.sh" logs "%s"\nStatus: bash "%s/deploy.sh" status "%s"\nSetelah prepared, lanjutkan backup ke PC dan deploy: bash "%s/deploy.sh" continue "%s"\n' "$work" "$work" "$work" "$work" "$work" "$work" "$work"
  exit 0
fi
work=${2:?release folder}
[[ "$work" =~ ^/root/crm-git-deploy-([0-9]{8}T[0-9]{6}-[a-f0-9]{6})$ ]]
id=${BASH_REMATCH[1]}
test "$(realpath "$work")" = "$work"
if [ "$mode" = logs ]; then exec tail -n 80 -F "$work/prepare.log" "$work/apply.log"; fi
if [ "$mode" = status ]; then
  if [ -f "$work/complete" ]; then
    printf 'DEPLOY SELESAI; pemeriksaan layanan berhasil.\n'
  elif [ -f "$work/apply-started" ]; then
    printf 'Deploy sudah dimulai dan belum tercatat berhasil. Periksa apply.log.\n'
  elif [ -f "$work/prepare.exit" ]; then
    result=$(cat "$work/prepare.exit")
    if [ "$result" = 0 ] && [ -f "$work/prepared" ]; then
      printf 'BUILD DAN BACKUP SIAP; jalankan continue untuk verifikasi backup PC dan deploy.\n'
    else
      printf 'Persiapan berhenti (exit %s). Periksa prepare.log.\n' "$result"
    fi
  else
    printf 'Persiapan belum mencatat hasil akhir. Periksa prepare.log.\n'
  fi
  exit 0
fi
if [ "$mode" = continue ]; then
  test -f "$work/prepared"
  test "$(cat "$work/prepare.exit")" = 0
  test ! -e "$work/apply-started"
  test ! -e "$work/complete"
  python3 - "$work" "$id" <<'PC_BACKUP'
import json,sys
w,release=sys.argv[1:]
b=json.load(open(w+'/prepared.json'))
assert b['backup']==w+'/backup.tar.gz'
print('BACKUP SIAP. Jalankan di PowerShell PC:')
print("$crmBackup = Join-Path $env:USERPROFILE 'Downloads\\CRM-Backup-Git-"+release+"'")
print('New-Item -ItemType Directory -Force -Path $crmBackup | Out-Null')
print('scp.exe -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -i "$env:USERPROFILE\\.ssh\\id_ed25519" root@146.190.101.90:'+w+'/backup.tar.gz "$crmBackup\\crm-before-git.tar.gz"')
print("if ($LASTEXITCODE -ne 0) { throw 'Salin backup gagal.' }")
print('$crmHash = (Get-FileHash -Algorithm SHA256 -LiteralPath "$crmBackup\\crm-before-git.tar.gz").Hash.ToLowerInvariant()')
print("if ($crmHash -ne '"+b['sha256']+"') { throw 'Checksum backup berbeda.' }")
print('$crmHash | Set-Content -LiteralPath "$crmBackup\\SHA256.txt"')
print('Write-Output $crmHash')
print('Paste SHA256 hasil PC pada prompt server berikut. Backup berisi data dan konfigurasi privat.')
PC_BACKUP
  read -r -p 'SHA256 backup yang sudah diverifikasi di PC: ' pc_hash < /dev/tty
  [[ "$pc_hash" =~ ^[a-f0-9]{64}$ ]]
  bash "$work/deploy.sh" apply "$work" "$pc_hash" 2>&1 | tee -a "$work/apply.log"
  exit 0
fi
compose_old=(docker compose -p crm-kimtele --project-directory "$be" -f "$be/docker-compose.yml")
compose_new=("${compose_old[@]}" -f "$override")
canary_pid=
switched=0
complete=0
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
  python3 - "$1" "$work" "$fe" "$be" <<'STATE'
import hashlib,json,os,pathlib,subprocess,sys
mode,w,fe,be=sys.argv[1:]
state={}
for root,allowed,extras,runtime in [(fe,{'package-lock.json'},['.env.production'],['app','components','lib','public']),(be,{'.env'},['.env.ems-v2','docker-compose.yml'],['src'])]:
    git=lambda *args: subprocess.check_output(['git','-C',root,*args],text=True).strip()
    assert git('symbolic-ref','--short','HEAD')=='main', 'Live branch must be main'
    changed=set(git('diff','--name-only','HEAD').splitlines())
    assert changed <= allowed, 'Unreviewed tracked source changes exist'
    assert not git('ls-files','--others','--exclude-standard','--',*runtime), 'Untracked application source exists'
    files=git('ls-files').splitlines()+extras
    hashes={}
    for name in set(files):
        p=pathlib.Path(root,name)
        assert not p.is_symlink(), 'Symlink source/config refused'
        if p.is_file(): hashes[name]=hashlib.sha256(p.read_bytes()).hexdigest()
    state[root]={'head':git('rev-parse','HEAD'),'files':hashes}
p=pathlib.Path(w,'source-state.json')
if mode=='save': p.write_text(json.dumps(state,sort_keys=True))
else: assert state==json.loads(p.read_text()), 'Source/config changed during build'
STATE
}

rollback_step() {
  "$@" || { printf 'Rollback gagal; layanan tetap memerlukan pemeriksaan. Backup: %s\n' "$work" >&2; exit 1; }
}

cleanup() {
  result=$?
  trap - EXIT
  if [ -n "$canary_pid" ]; then kill "$canary_pid" 2>/dev/null || true; fi
  if [ "$switched" = 1 ] && [ "$complete" != 1 ]; then
    set +e
    "$node" "$pm2_cli" stop crm-fe >/dev/null
    if ! docker stop crm-kimtele-backend >/dev/null; then
      printf 'API tidak dapat dihentikan. Rollback ditunda; periksa %s.\n' "$work" >&2
      exit 1
    fi
    mappings=$(nonlegacy_mappings)
    if [ "$?" != 0 ] || [ "$mappings" != 0 ]; then
      printf 'Downgrade dihentikan: mapping EMS baru sudah ada atau pemeriksaannya gagal. CRM dihentikan; pertahankan kode/schema baru dan periksa %s.\n' "$work" >&2
      exit 1
    fi
    rollback_step git -C "$fe" -c core.hooksPath=/dev/null reset --keep "$(cat "$work/old-fe-head")"
    rollback_step git -C "$be" -c core.hooksPath=/dev/null reset --keep "$(cat "$work/old-be-head")"
    rollback_step cp -p "$work/config/frontend-package-lock.json" "$fe/package-lock.json"
    rollback_step cp -p "$work/config/backend.env" "$be/.env"
    for directory in .next node_modules; do
      if [ -d "$work/rollback/$directory" ]; then
        if [ -e "$fe/$directory" ]; then rollback_step mv "$fe/$directory" "$work/failed-$directory"; fi
        rollback_step mv "$work/rollback/$directory" "$fe/$directory"
      fi
    done
    if [ -f "$override" ] && cmp -s "$override" "$work/compose.override.json"; then rollback_step rm -- "$override"; fi
    rollback_step docker image tag "$(cat "$work/old-image-id")" "$(cat "$work/old-image-tag")"
    rollback_step "${compose_old[@]}" up -d --no-deps --no-build --pull never backend
    old_node=$(cat "$work/old-fe-node")
    export PATH="$(cat "$work/old-fe-path")"
    rollback_step "$old_node" "$pm2_cli" restart crm-fe --interpreter "$old_node" --update-env
    rollback_step "$old_node" "$pm2_cli" save
    if health https://crm.kimcommunication.id/login 200 && health https://crm-api.kimcommunication.id/api/auth/me 401; then
      printf 'Aplikasi sebelumnya dipulihkan. Schema EMS tambahan dipertahankan; database tidak direstore/dihapus.\n' >&2
    else
      printf 'Rollback perlu pemeriksaan operator. Backup tetap di %s.\n' "$work" >&2
    fi
  fi
  if [ "$mode" = prepare ]; then
    printf '%s\n' "$result" > "$work/prepare.exit.tmp"
    mv -- "$work/prepare.exit.tmp" "$work/prepare.exit"
  fi
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
exec 9>/var/lock/crm-main-deploy.lock
flock -n 9 || { printf 'Deploy CRM lain masih berjalan.\n' >&2; exit 1; }

install_node() {
  test "$(uname -m)" = x86_64
  if [ ! -e /opt/node-v24.22.1-linux-x64 ]; then
    curl --fail --location --proto '=https' --tlsv1.2 --connect-timeout 15 --max-time 180 https://nodejs.org/dist/v24.22.1/node-v24.22.1-linux-x64.tar.xz -o "$work/node.tar.xz"
    printf '%s  %s\n' 6c172a9ab6718f7b801fb5a7bd486af2ee5e32758086a04b84fcce2aa77095e6 "$work/node.tar.xz" | sha256sum --check -
    tar -xJf "$work/node.tar.xz" -C /opt
  fi
  test "$("$node" --version)" = v24.22.1
  export PATH="$(dirname "$node"):$PATH"
}

prepare() {
  test "$(realpath "$fe")" = "$fe"
  test "$(realpath "$be")" = "$be"
  test ! -e "$override"
  test -f "$fe/.env.production"
  test -f "$ems_env"
  test ! -L "$fe/.next"
  test ! -L "$fe/node_modules"
  mkdir -m 700 "$work/backup" "$work/config" "$work/rollback"
  source_state save
  ems_config probe
  cp -p "$fe/package-lock.json" "$work/config/frontend-package-lock.json"
  cp -p "$be/.env" "$work/config/backend.env"
  git -C "$fe" rev-parse HEAD > "$work/old-fe-head"
  git -C "$be" rev-parse HEAD > "$work/old-be-head"
  pm2 jlist > "$work/backup/pm2-before.json"
  python3 - "$work" <<'PM2'
import json,pathlib,sys
w=pathlib.Path(sys.argv[1])
apps=[p for p in json.loads((w/'backup/pm2-before.json').read_text()) if p['name']=='crm-fe']
assert len(apps)==1
p=apps[0]
e=p['pm2_env']
assert e['status']=='online' and p['pid']>0
assert e['pm_cwd']=='/var/www/crm-fe' and e['args']==['start','--','-p','3000']
assert pathlib.Path(e['exec_interpreter']).is_file()
(w/'old-fe-node').write_text(e['exec_interpreter'])
old_path=e.get('PATH') or e.get('env',{}).get('PATH')
assert old_path
(w/'old-fe-path').write_text(old_path)
(w/'old-fe-pid').write_text(str(p['pid']))
PM2
  docker inspect --format '{{.Id}}' crm-kimtele-backend > "$work/old-container-id"
  docker inspect --format '{{.Image}}' crm-kimtele-backend > "$work/old-image-id"
  docker inspect --format '{{.Config.Image}}' crm-kimtele-backend > "$work/old-image-tag"
  test "$(cat "$work/old-image-tag")" = crm-kimtele-backend
  docker inspect crm-kimtele-backend crm-kimtele-postgres > "$work/backup/containers.json"
  install_node
  for area in frontend backend; do
    if [ "$area" = frontend ]; then repo=$fe; url=$fe_url; else repo=$be; url=$be_url; fi
    git -C "$repo" fetch --no-tags "$url" main
    target=$(git -C "$repo" rev-parse FETCH_HEAD)
    git -C "$repo" merge-base --is-ancestor HEAD "$target"
    git -C "$repo" -c core.hooksPath=/dev/null worktree add --detach "$work/$area" "$target"
    printf '%s\n' "$target" > "$work/$area-head"
    if git -C "$work/$area" ls-files -- app components lib src | grep -Ei '(^|/)(eo-scout|EoBot|EoProspect|EoSocial|HermesResearch)|tagtog'; then
      printf 'Sumber main masih memuat fitur yang ditunda.\n' >&2; return 1
    fi
  done
  git -C "$be" diff --quiet HEAD "$(cat "$work/backend-head")" -- .env docker-compose.yml
  python3 - "$ems_env" "$work" <<'OVERRIDE'
import json,sys
env,w=sys.argv[1:]
with open(w+'/compose.override.json','w') as f: json.dump({'services':{'backend':{'env_file':[{'path':env,'format':'raw'}]}}},f)
OVERRIDE
  "${compose_old[@]}" -f "$work/compose.override.json" config --quiet
  cp "$fe/.env.production" "$work/frontend/.env.production"
  (
    cd "$work/frontend"
    export NEXT_PUBLIC_API_BASE_URL=https://crm-api.kimcommunication.id
    "$node" "$npm_cli" ci --include=dev --no-audit --no-fund
    "$node" scripts/check-chart-dependencies.cjs
    "$node" <<'VERSIONS'
const a=require('node:assert/strict');
a.equal(require('next/package.json').version,'16.4.3');
a.equal(require('react/package.json').version,'19.3.1');
a.equal(require('react-dom/package.json').version,'19.3.1');
const p=require('sharp').versions.sharp.split('.').map(Number);
a(p[0]>0||p[1]>35||(p[1]===35&&p[2]>=5));
VERSIONS
    NODE_ENV=production "$node" "$npm_cli" run build
  )
  docker build -t "crm-git-backend:$id" "$work/backend"
  test -z "$(ss -lntH '( sport = :13000 )')"
  (cd "$work/frontend" && exec "$node" node_modules/next/dist/bin/next start -p 13000 --hostname 127.0.0.1) < /dev/null > "$work/canary.log" 2>&1 &
  canary_pid=$!
  health http://127.0.0.1:13000/login 200
  kill "$canary_pid"
  wait "$canary_pid" || true
  canary_pid=
  docker exec crm-kimtele-postgres sh -eu -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$work/backup/crm_kimtele.dump"
  docker exec -i crm-kimtele-postgres pg_restore --file=/dev/null < "$work/backup/crm_kimtele.dump"
  tar -C / --exclude='var/www/crm-fe/node_modules' --exclude='var/www/crm-fe/.git' --exclude='var/www/crm-fe/.next/cache' --exclude='var/www/crm-be/.git' --exclude='var/www/crm-be/target' -cf "$work/backup/application-and-uploads.tar" var/www/crm-fe var/www/crm-be
  cp "$work/old-fe-head" "$work/old-be-head" "$work/backup/"
  tar -C "$work/backup" -czf "$work/backup.tar.gz" .
  tar -tzf "$work/backup.tar.gz" > /dev/null
  sha256sum "$work/backup.tar.gz" | cut -d ' ' -f 1 > "$work/backup.sha256"
  python3 - "$work" <<'REPORT'
import json,os,sys
w=sys.argv[1]
with open(w+'/prepared.json','w') as f: json.dump({'backup':w+'/backup.tar.gz','bytes':os.path.getsize(w+'/backup.tar.gz'),'sha256':open(w+'/backup.sha256').read().strip()},f)
REPORT
  touch "$work/prepared"
}

stash_known() {
  local repo=$1 file=$2 label=$3
  if ! git -C "$repo" diff --quiet HEAD -- "$file"; then
    git -C "$repo" -c core.hooksPath=/dev/null stash push -m "crm-before-git-$id" -- "$file" > "$work/$label-stash.log"
    git -C "$repo" rev-parse refs/stash > "$work/$label-stash-id"
  fi
}

case "$mode" in
  prepare) prepare ;;
  apply)
    test -f "$work/prepared"
    test "$(cat "$work/prepare.exit")" = 0
    test ! -e "$work/apply-started"
    test ! -e "$override"
    test "${3:?PC backup SHA256}" = "$(cat "$work/backup.sha256")"
    source_state check
    test "$(docker inspect --format '{{.Id}}' crm-kimtele-backend)" = "$(cat "$work/old-container-id")"
    pm2 jlist | python3 -c 'import json,sys;w=sys.argv[1];p=next(p for p in json.load(sys.stdin) if p["name"]=="crm-fe");assert str(p["pid"])==open(w+"/old-fe-pid").read()' "$work"
    install_node
    touch "$work/apply-started"
    switched=1
    "$node" "$pm2_cli" stop crm-fe
    stash_known "$fe" package-lock.json frontend
    stash_known "$be" .env backend
    git -C "$fe" -c core.hooksPath=/dev/null pull --ff-only "$fe_url" "$(cat "$work/frontend-head")"
    test "$(git -C "$fe" rev-parse HEAD)" = "$(cat "$work/frontend-head")"
    git -C "$be" -c core.hooksPath=/dev/null pull --ff-only "$be_url" "$(cat "$work/backend-head")"
    test "$(git -C "$be" rev-parse HEAD)" = "$(cat "$work/backend-head")"
    cp -p "$work/config/backend.env" "$be/.env"
    cp "$work/compose.override.json" "$override"
    docker image tag "crm-git-backend:$id" "$(cat "$work/old-image-tag")"
    "${compose_new[@]}" up -d --no-deps --no-build --pull never --force-recreate backend
    health https://crm-api.kimcommunication.id/api/auth/me 401
    test "$(sql_scalar "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='events' AND column_name='ems_source';")" = 1
    test "$(sql_scalar "SELECT count(*) FROM databasechangelog WHERE id='add-ems-source-to-events';")" = 1
    mv "$fe/.next" "$work/rollback/.next"
    mv "$work/frontend/.next" "$fe/.next"
    mv "$fe/node_modules" "$work/rollback/node_modules"
    mv "$work/frontend/node_modules" "$fe/node_modules"
    "$node" "$pm2_cli" restart crm-fe --interpreter "$node" --update-env
    health http://127.0.0.1:3000/login 200
    health https://crm.kimcommunication.id/login 200
    "$node" "$pm2_cli" jlist > "$work/pm2-after.json"
    python3 - "$work" "$node" <<'VERIFY_RUNTIME'
import json,os,pathlib,re,subprocess,sys
w,n=sys.argv[1:]
n=os.path.realpath(n)
apps=[p for p in json.loads(pathlib.Path(w,'pm2-after.json').read_text()) if p['name']=='crm-fe']
assert len(apps)==1
p=apps[0]
e=p['pm2_env']
assert e['status']=='online' and p['pid']>0
assert os.path.realpath(e['exec_interpreter'])==n
assert e['node_version']=='24.22.1'
assert os.path.realpath('/proc/'+str(p['pid'])+'/exe')==n
listeners=subprocess.check_output(['ss','-lntpH','( sport = :3000 )'],text=True)
pids=re.findall(r'pid=(\d+)',listeners)
assert pids and all(os.path.realpath('/proc/'+pid+'/exe')==n for pid in pids)
VERIFY_RUNTIME
    "$node" "$pm2_cli" save
    touch "$work/complete"
    complete=1
    printf 'DEPLOY SELESAI: Git main FE/BE aktif; CRM berjalan dengan Node 24.22.1 dan Next.js 16.4.3.\nBackup: %s/backup.tar.gz\n' "$work"
    ;;
esac
