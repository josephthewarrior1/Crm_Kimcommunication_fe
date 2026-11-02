#!/usr/bin/env bash
# Small application-only update. Dependency, schema and server-config changes need a separate release.
set -Eeuo pipefail
umask 077
mode=${1:-start}
fe=/var/www/crm-fe
be=/var/www/crm-be
node=/opt/node-v24.22.1-linux-x64/bin/node
npm_cli=/opt/node-v24.22.1-linux-x64/lib/node_modules/npm/bin/npm-cli.js
fe_url=https://github.com/josephthewarrior1/Crm_Kimcommunication_fe.git
be_url=https://github.com/josephthewarrior1/Crm_Kimcommunication_be.git
export GIT_TERMINAL_PROMPT=0
test "$(id -u)" = 0 || { printf 'Jalankan sebagai root.\n' >&2; exit 1; }

if [ "$mode" = start ]; then
  test "$#" = 3
  [[ "$2" =~ ^[a-f0-9]{40}$ && "$3" =~ ^[a-f0-9]{40}$ ]]
  for tool in nohup setsid python3; do command -v "$tool" >/dev/null; done
  id=$(date -u +%Y%m%dT%H%M%S)-$(python3 -c 'import secrets;print(secrets.token_hex(3))')
  work=/root/crm-main-update-$id
  mkdir -m 700 "$work"
  cp -- "$(realpath "$0")" "$work/update.sh"
  printf 'QUEUED\n' > "$work/status"
  nohup setsid bash "$work/update.sh" run "$work" "$2" "$3" < /dev/null > "$work/update.log" 2>&1 &
  printf 'Update berjalan di background.\nFolder: %s\nLog: tail -n 80 -F /root/crm-main-update-latest/update.log\nStatus: cat /root/crm-main-update-latest/status\n' "$work"
  exit 0
fi
test "$mode" = run && test "$#" = 4
work=$2
[[ "$work" =~ ^/root/crm-main-update-([0-9]{8}T[0-9]{6}-[a-f0-9]{6})$ ]]
id=${BASH_REMATCH[1]}
test "$(realpath "$work")" = "$work"
fe_target=$3
be_target=$4
[[ "$fe_target" =~ ^[a-f0-9]{40}$ && "$be_target" =~ ^[a-f0-9]{40}$ ]]
exec 9>/var/lock/crm-main-deploy.lock
flock -n 9 || { printf 'FAILED_LOCKED\n' > "$work/status"; printf 'Deploy CRM lain masih berjalan.\n' >&2; exit 1; }
printf 'PREPARING\n' > "$work/status"
mkdir -m 700 "$work/backup" "$work/rollback" "$work/frontend" "$work/backend"
pm2_cli=
compose=()
canary_pid=
applying=0
complete=0

health() {
  local url=$1 expected=$2 code=0
  for attempt in {1..60}; do
    code=$(curl --silent --max-time 3 --output /dev/null --write-out '%{http_code}' "$url" || true)
    if [ "$code" = "$expected" ]; then return 0; fi
    sleep 2
  done
  printf 'Health check gagal: %s (harap %s, menerima %s).\n' "$url" "$expected" "$code" >&2
  return 1
}

cleanup() {
  result=$?
  trap - EXIT
  if [ -n "$canary_pid" ]; then kill "$canary_pid" 2>/dev/null || true; fi
  if [ "$complete" = 1 ]; then exit "$result"; fi
  set +e
  if [ "$applying" = 1 ]; then
    printf 'Update gagal; memulihkan aplikasi sebelumnya.\n' >&2
    rollback_ok=1
    "$node" "$pm2_cli" stop crm-fe >/dev/null || rollback_ok=0
    for directory in .next node_modules; do
      if [ -d "$work/rollback/$directory" ]; then
        if [ -e "$fe/$directory" ]; then mv -- "$fe/$directory" "$work/failed-$directory" || rollback_ok=0; fi
        mv -- "$work/rollback/$directory" "$fe/$directory" || rollback_ok=0
      fi
    done
    docker image tag "$old_image" "$old_tag" || rollback_ok=0
    "${compose[@]}" up -d --no-deps --no-build --pull never --force-recreate backend || rollback_ok=0
    test "$(docker inspect --format '{{.Image}}' crm-kimtele-backend)" = "$old_image" || rollback_ok=0
    "$node" "$pm2_cli" restart crm-fe --interpreter "$node" --update-env || rollback_ok=0
    health http://127.0.0.1:3000/login 200 || rollback_ok=0
    health https://crm.kimcommunication.id/login 200 || rollback_ok=0
    health https://crm-api.kimcommunication.id/api/auth/me 401 || rollback_ok=0
    "$node" "$pm2_cli" save || rollback_ok=0
    if [ "$rollback_ok" = 1 ]; then
      printf 'FAILED_ROLLED_BACK\n' > "$work/status"
      printf 'Aplikasi lama kembali aktif. Git dapat tetap pada commit baru; database tidak direstore.\n' >&2
    else
      printf 'FAILED_NEEDS_ATTENTION\n' > "$work/status"
      printf 'Rollback perlu pemeriksaan operator. Backup: %s/backup.tar.gz\n' "$work" >&2
    fi
  else
    printf 'FAILED_BEFORE_RESTART\n' > "$work/status"
    printf 'Update berhenti sebelum restart layanan. Periksa %s/update.log.\n' "$work" >&2
  fi
  printf '%s\n' "$result" > "$work/exit-code"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

test ! -e /root/crm-main-update-latest || test -L /root/crm-main-update-latest
ln -sfnT -- "$work" /root/crm-main-update-latest
pm2_cli=$(readlink -f "$(command -v pm2)")
test -f "$pm2_cli" && test -f "$node" && test -f "$npm_cli"
test "$("$node" --version)" = v24.22.1
export PATH="$(dirname "$node"):$PATH"
compose=(docker compose -p crm-kimtele --project-directory "$be" -f "$be/docker-compose.yml")
if [ -f "$be/docker-compose.override.yml" ]; then compose+=(-f "$be/docker-compose.override.yml"); fi

source_state() {
  python3 - "$1" "$work" "$fe" "$be" <<'STATE'
import hashlib,json,pathlib,subprocess,sys
mode,w,fe,be=sys.argv[1:]
state={}
for root,allowed,extra,runtime in [(fe,{'package-lock.json'},['.env.production'],['app','components','lib','public']),(be,{'.env'},['.env.ems-v2','docker-compose.override.yml'],['src'])]:
    git=lambda *args:subprocess.check_output(['git','-C',root,*args],text=True).strip()
    assert git('symbolic-ref','--short','HEAD')=='main','Live branch harus main'
    assert set(git('diff','--name-only','HEAD').splitlines())<=allowed,'Ada perubahan source lokal yang belum ditinjau'
    assert not git('ls-files','--others','--exclude-standard','--',*runtime),'Ada source aplikasi untracked'
    files={}
    for name in set(git('ls-files').splitlines()+extra):
        p=pathlib.Path(root,name)
        assert not p.is_symlink(),'Source/config symlink ditolak'
        if p.is_file():files[name]=hashlib.sha256(p.read_bytes()).hexdigest()
    state[root]={'head':git('rev-parse','HEAD'),'files':files}
saved=pathlib.Path(w,'source-state.json')
if mode=='save':saved.write_text(json.dumps(state,sort_keys=True))
else:assert state==json.loads(saved.read_text()),'Source/config berubah selama build'
STATE
}

test "$(realpath "$fe")" = "$fe" && test "$(realpath "$be")" = "$be"
test -f "$fe/.env.production" && test -f "$be/.env" && test -f "$be/.env.ems-v2"
for directory in .next node_modules; do test -d "$fe/$directory" && test ! -L "$fe/$directory"; done
python3 - "$work" <<'SPACE'
import shutil,sys
assert shutil.disk_usage(sys.argv[1]).free>4*1024**3,'Ruang kosong server perlu lebih dari 4 GiB'
SPACE
source_state save
"$node" "$pm2_cli" jlist > "$work/backup/pm2-before.json"
python3 - "$work" "$node" <<'PM2'
import json,os,pathlib,sys
w,node=sys.argv[1:]
apps=[p for p in json.load(open(w+'/backup/pm2-before.json')) if p['name']=='crm-fe']
assert len(apps)==1
p=apps[0];e=p['pm2_env']
assert e['status']=='online' and p['pid']>0 and e['pm_cwd']=='/var/www/crm-fe'
assert e['args']==['start','--','-p','3000'],'Perintah PM2 berbeda; perlu ditinjau'
assert os.path.realpath('/proc/'+str(p['pid'])+'/exe')==os.path.realpath(node),'Runtime aktif berbeda dari Node release ini'
pathlib.Path(w,'old-fe-pid').write_text(str(p['pid']))
PM2
old_image=$(docker inspect --format '{{.Image}}' crm-kimtele-backend)
old_tag=$(docker inspect --format '{{.Config.Image}}' crm-kimtele-backend)
case "$old_tag" in ''|sha256:*|*@*) printf 'Tag image aktif tidak dapat dipakai untuk rollback.\n' >&2; exit 1;; esac
"${compose[@]}" config --format json > "$work/backup/compose-before.json"
python3 - "$work" "$old_tag" <<'IMAGE'
import json,sys
w,tag=sys.argv[1:]
configured=json.load(open(w+'/backup/compose-before.json'))['services']['backend'].get('image')
assert not configured or configured==tag,'Image Compose berbeda dari container aktif'
json.dump({'services':{'backend':{'image':tag}}},open(w+'/image.override.json','w'))
IMAGE
compose+=(-f "$work/image.override.json")
docker inspect crm-kimtele-backend crm-kimtele-postgres > "$work/backup/containers.json"
printf '%s\n' "$old_image" > "$work/backup/old-image-id"
printf '%s\n' "$old_tag" > "$work/backup/old-image-tag"

for area in frontend backend; do
  if [ "$area" = frontend ]; then repo=$fe; url=$fe_url; target=$fe_target; else repo=$be; url=$be_url; target=$be_target; fi
  git -C "$repo" fetch --no-tags "$url" main
  git -C "$repo" merge-base --is-ancestor "$target" FETCH_HEAD
  git -C "$repo" merge-base --is-ancestor HEAD "$target"
  if git -C "$repo" ls-tree -r --name-only "$target" -- app components lib src | grep -Ei '(^|/)tagtog|eo-scout|EoProspect|EoSocial'; then
    printf 'Target memuat TAGTOG atau fitur yang ditunda.\n' >&2; exit 1
  fi
  if [ "$area" = frontend ]; then
    git -C "$repo" diff --quiet HEAD "$target" -- package.json package-lock.json next.config.js || { printf 'Dependency/config FE berubah; perlu release terpisah.\n' >&2; exit 1; }
  else
    git -C "$repo" diff --quiet HEAD "$target" -- pom.xml Dockerfile .dockerignore .env docker-compose.yml src/main/resources || { printf 'Schema/dependency/config BE berubah; perlu release terpisah.\n' >&2; exit 1; }
  fi
  git -C "$repo" rev-parse HEAD > "$work/backup/$area-head"
  git -C "$repo" archive HEAD > "$work/backup/$area-source.tar"
  git -C "$repo" diff HEAD > "$work/backup/$area-local-changes.patch"
  git -C "$repo" archive "$target" | tar -xf - -C "$work/$area"
done
cp -p "$fe/.env.production" "$work/frontend/.env.production"
cp -p "$fe/.env.production" "$work/backup/frontend.env.production"
cp -p "$fe/package-lock.json" "$work/backup/frontend-package-lock.json"
cp -p "$be/.env" "$work/backup/backend.env"
cp -p "$be/.env.ems-v2" "$work/backup/backend.env.ems-v2"
cp -p "$be/docker-compose.yml" "$work/backup/docker-compose.yml"
if [ -f "$be/docker-compose.override.yml" ]; then cp -p "$be/docker-compose.override.yml" "$work/backup/docker-compose.override.yml"; fi
printf 'Build FE dan BE; layanan lama tetap berjalan.\n'
(
  cd "$work/frontend"
  export NEXT_PUBLIC_API_BASE_URL=https://crm-api.kimcommunication.id
  "$node" "$npm_cli" ci --include=dev --no-audit --no-fund
  test "$("$node" -p "require('next/package.json').version")" = 16.4.3
  NODE_ENV=production "$node" "$npm_cli" run build
)
docker build -t "crm-main-update:$id" "$work/backend"
new_image=$(docker image inspect --format '{{.Id}}' "crm-main-update:$id")
test -z "$(ss -lntH '( sport = :13000 )')"
(cd "$work/frontend" && exec "$node" node_modules/next/dist/bin/next start -p 13000 --hostname 127.0.0.1) < /dev/null > "$work/canary.log" 2>&1 &
canary_pid=$!
health http://127.0.0.1:13000/login 200
kill "$canary_pid"
wait "$canary_pid" || true
canary_pid=
printf 'Membuat backup database, unggahan, dan konfigurasi di server.\n'
docker exec crm-kimtele-postgres sh -eu -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$work/backup/database.dump"
docker exec -i crm-kimtele-postgres pg_restore --file=/dev/null < "$work/backup/database.dump"
docker exec crm-kimtele-backend tar -C /app -czf - uploads > "$work/backup/uploads.tar.gz"
tar -tzf "$work/backup/uploads.tar.gz" > /dev/null
tar -C "$work/backup" -czf "$work/backup.tar.gz" .
sha256sum "$work/backup.tar.gz" > "$work/backup.sha256"
source_state check
test "$(docker inspect --format '{{.Image}}' crm-kimtele-backend)" = "$old_image"
"$node" "$pm2_cli" jlist | python3 -c 'import json,sys;p=[p for p in json.load(sys.stdin) if p["name"]=="crm-fe"];assert len(p)==1 and str(p[0]["pid"])==open(sys.argv[1]+"/old-fe-pid").read()' "$work"

# These fast-forwards cannot overwrite the permitted local lock/env edits: their target blobs were checked above.
git -C "$be" -c core.hooksPath=/dev/null merge --ff-only "$be_target"
git -C "$fe" -c core.hooksPath=/dev/null merge --ff-only "$fe_target"
test "$(git -C "$be" rev-parse HEAD)" = "$be_target"
test "$(git -C "$fe" rev-parse HEAD)" = "$fe_target"
cmp -s "$fe/.env.production" "$work/backup/frontend.env.production"
cmp -s "$fe/package-lock.json" "$work/backup/frontend-package-lock.json"
cmp -s "$be/.env" "$work/backup/backend.env"
cmp -s "$be/.env.ems-v2" "$work/backup/backend.env.ems-v2"
cmp -s "$be/docker-compose.yml" "$work/backup/docker-compose.yml"
if [ -f "$work/backup/docker-compose.override.yml" ]; then cmp -s "$be/docker-compose.override.yml" "$work/backup/docker-compose.override.yml"; fi
printf 'APPLYING\n' > "$work/status"
applying=1
docker image tag "$new_image" "$old_tag"
"${compose[@]}" up -d --no-deps --no-build --pull never --force-recreate backend
test "$(docker inspect --format '{{.Image}}' crm-kimtele-backend)" = "$new_image"
health https://crm-api.kimcommunication.id/api/auth/me 401
"$node" "$pm2_cli" stop crm-fe >/dev/null
for directory in .next node_modules; do
  mv -- "$fe/$directory" "$work/rollback/$directory"
  mv -- "$work/frontend/$directory" "$fe/$directory"
done
"$node" "$pm2_cli" restart crm-fe --interpreter "$node" --update-env
health http://127.0.0.1:3000/login 200
health https://crm.kimcommunication.id/login 200
"$node" "$pm2_cli" save
printf 'COMPLETE\n' > "$work/status"
printf '0\n' > "$work/exit-code"
complete=1
printf 'UPDATE SELESAI. FE %s; BE %s.\nBackup privat: %s/backup.tar.gz\n' "$fe_target" "$be_target" "$work"
