#!/usr/bin/env bash
# Paired CRM release: verified backups, private migration, then FE/BE cutover.
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
  for tool in nohup setsid python3 flock; do command -v "$tool" >/dev/null; done
  id=$(date -u +%Y%m%dT%H%M%S)-$(python3 -c 'import secrets;print(secrets.token_hex(3))')
  work=/root/crm-migration-deploy-$id
  mkdir -m 700 "$work"
  cp -- "$(realpath "$0")" "$work/deploy.sh"
  git -C "$fe" show "$2:scripts/crm_migration_guard.py" > "$work/migration_guard.py"
  printf 'QUEUED\n' > "$work/status"
  nohup setsid bash "$work/deploy.sh" run "$work" "$2" "$3" < /dev/null > "$work/deploy.log" 2>&1 &
  printf 'Deploy FE/BE berjalan di background.\nFolder: %s\nLog: tail -n 80 -F %s/deploy.log\nStatus: cat %s/status\nBackup final: %s/backup-final.tar.gz\n' "$work" "$work" "$work" "$work"
  exit 0
fi
test "$mode" = run && test "$#" = 4
work=$2
[[ "$work" =~ ^/root/crm-migration-deploy-([0-9]{8}T[0-9]{6}-[a-f0-9]{6})$ ]]
id=${BASH_REMATCH[1]}
test "$(realpath "$work")" = "$work"
fe_target=$3; be_target=$4
[[ "$fe_target" =~ ^[a-f0-9]{40}$ && "$be_target" =~ ^[a-f0-9]{40}$ ]]
pm2_cli=; compose=(); canary_pid=; migration_container=crm-schema-$id
old_image=; old_tag=; frozen=0; sources_switched=0; frontend_swapped=0; migration_started=0; complete=0

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

sql_scalar() {
  docker exec -i crm-kimtele-postgres sh -eu -c 'unset PGHOST PGHOSTADDR PGPORT PGSERVICE PGSERVICEFILE PGOPTIONS PGDATABASE; exec psql -X -q -w -h /var/run/postgresql -p 5432 -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' <<< "$1"
}

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

restore_sources() {
  git -C "$be" -c core.hooksPath=/dev/null reset --keep "$(cat "$work/backup/backend-head")" || return 1
  git -C "$fe" -c core.hooksPath=/dev/null reset --keep "$(cat "$work/backup/frontend-head")" || return 1
}

restart_original() {
  test "$migration_started" = 0 && test ! -e "$work/migration-started" || return 1
  if [ "$sources_switched" = 1 ]; then restore_sources || return 1; fi
  test "$(docker inspect --format '{{.Image}}' crm-kimtele-backend)" = "$old_image" || return 1
  docker start crm-kimtele-backend >/dev/null || return 1
  "$node" "$pm2_cli" restart crm-fe --interpreter "$node" --update-env >/dev/null || return 1
  health http://127.0.0.1:8085/api/auth/me 401 || return 1
  health http://127.0.0.1:3000/login 200 || return 1
}

cleanup() {
  result=$?
  trap - EXIT
  set +e
  if [ -n "$canary_pid" ]; then kill "$canary_pid" 2>/dev/null; fi
  if [ "$complete" = 1 ]; then exit "$result"; fi
  if [ "$migration_started" = 1 ] || [ -e "$work/migration-started" ]; then
    "$node" "$pm2_cli" stop crm-fe >/dev/null 2>&1
    docker stop crm-kimtele-backend >/dev/null 2>&1
    docker logs --tail 200 "$migration_container" > "$work/migration-container.log" 2>&1
    docker stop "$migration_container" >/dev/null 2>&1
    printf 'FAILED_NEEDS_ATTENTION\n' > "$work/status"
    printf 'Deploy berhenti setelah batas migrasi. Aplikasi dihentikan; database/volume dan backup dipertahankan. Jangan hidupkan backend lama. Periksa %s/deploy.log dan backup-final.tar.gz; lanjutkan dengan perbaikan versi baru atau pemulihan database yang ditinjau.\n' "$work" >&2
  elif [ "$frozen" = 1 ]; then
    if restart_original; then
      printf 'FAILED_RESTORED_BEFORE_MIGRATION\n' > "$work/status"
      printf 'Migrasi belum dimulai; aplikasi sebelumnya kembali aktif.\n' >&2
    else
      printf 'FAILED_NEEDS_ATTENTION\n' > "$work/status"
      printf 'Pemulihan sebelum migrasi perlu pemeriksaan. Backup dan log: %s\n' "$work" >&2
    fi
  else
    printf 'FAILED_BEFORE_RESTART\n' > "$work/status"
    printf 'Berhenti sebelum layanan lama diubah. Log: %s/deploy.log\n' "$work" >&2
  fi
  printf '%s\n' "$result" > "$work/exit-code"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
exec 9>/var/lock/crm-main-deploy.lock
flock -n 9 || { printf 'FAILED_LOCKED\n' > "$work/status"; complete=1; printf 'Deploy CRM lain masih berjalan.\n' >&2; exit 1; }
test ! -e /root/crm-migration-deploy-latest || test -L /root/crm-migration-deploy-latest
ln -sfnT -- "$work" /root/crm-migration-deploy-latest
printf 'PREFLIGHT\n' > "$work/status"
mkdir -m 700 "$work/backup" "$work/initial" "$work/final" "$work/rollback" "$work/frontend" "$work/backend"
for tool in git docker curl python3 tar sha256sum ss pm2; do command -v "$tool" >/dev/null; done
pm2_cli=$(readlink -f "$(command -v pm2)")
test -f "$pm2_cli" && test -f "$node" && test -f "$npm_cli"
test "$("$node" --version)" = v24.22.1
export PATH="$(dirname "$node"):$PATH"
test "$(realpath "$fe")" = "$fe" && test "$(realpath "$be")" = "$be"
test -f "$fe/.env.production" && test -f "$be/.env" && test -f "$be/.env.ems-v2"
test "$(realpath "$be/uploads")" = "$be/uploads"
for directory in .next node_modules; do test -d "$fe/$directory" && test ! -L "$fe/$directory"; done
python3 - "$work" <<'SPACE'
import shutil,sys
assert shutil.disk_usage(sys.argv[1]).free>6*1024**3,'Ruang kosong perlu lebih dari 6 GiB'
SPACE
source_state save
compose=(docker compose -p crm-kimtele --project-directory "$be" -f "$be/docker-compose.yml")
if [ -f "$be/docker-compose.override.yml" ]; then compose+=(-f "$be/docker-compose.override.yml"); fi
"${compose[@]}" config --format json > "$work/backup/compose-before.json"
docker inspect crm-kimtele-backend crm-kimtele-postgres > "$work/backup/containers.json"
"$node" "$pm2_cli" jlist > "$work/backup/pm2-before.json"
old_image=$(docker inspect --format '{{.Image}}' crm-kimtele-backend)
old_tag=$(docker inspect --format '{{.Config.Image}}' crm-kimtele-backend)
case "$old_tag" in ''|sha256:*|*@*) printf 'Tag backend aktif tidak sesuai jalur release ini.\n' >&2; exit 1;; esac
python3 - "$work" "$node" "$be" <<'RUNTIME'
import json,os,pathlib,sys,urllib.parse
w,node,be=sys.argv[1:];p=pathlib.Path(w)
containers=json.loads((p/'backup/containers.json').read_text());backend,postgres=containers
assert backend['State']['Running'] and postgres['State']['Running'],'Container lama harus aktif'
assert backend['HostConfig']['NetworkMode']!='host','Host network tidak didukung'
resolved=json.loads((p/'backup/compose-before.json').read_text());cfg=resolved['services']['backend']
env=cfg.get('environment',{});running=dict(item.split('=',1) for item in backend['Config']['Env'])
assert all(running.get(k)==str(v) for k,v in env.items() if v is not None),'Compose tidak sesuai environment container aktif'
assert cfg.get('command') is None and cfg.get('entrypoint') is None,'Command/entrypoint override perlu ditinjau'
assert backend['Config']['Entrypoint']==['java','-jar','app.jar'] and backend['Config'].get('Cmd') in (None,[]),'Entrypoint container aktif berbeda'
assert not cfg.get('network_mode') and not cfg.get('configs') and not cfg.get('secrets'),'Override network/config perlu ditinjau'
assert cfg.get('container_name')=='crm-kimtele-backend','Nama container backend berbeda'
normalized={k.upper().replace('.','_').replace('-','_'):v for k,v in env.items()}
assert len(normalized)==len(env),'Environment memiliki alias bertabrakan'
assert all(k==k.upper() and '.' not in k and '-' not in k for k in env if k.lower().startswith(('spring','jdbc','postgres','storage'))),'Alias konfigurasi perlu ditinjau'
for k in normalized:
    assert not (k.startswith('SPRING_DATASOURCE_') or k.startswith('SPRING_LIQUIBASE_') and k not in {'SPRING_LIQUIBASE_ENABLED','SPRING_LIQUIBASE_CHANGE_LOG'}),'Override datasource/migrasi perlu ditinjau'
    assert not (k.startswith(('SPRING_CONFIG_','SPRING_SQL_INIT_','SPRING_JPA_PROPERTIES_')) or k.startswith('SPRING_PROFILES_') and k!='SPRING_PROFILES_ACTIVE'),'Override konfigurasi/profile perlu ditinjau'
for k in ('SPRING_PROFILES_INCLUDE','SPRING_CONFIG_IMPORT','SPRING_JPA_PROPERTIES_HIBERNATE_DEFAULT_SCHEMA','SPRING_JPA_GENERATE_DDL'):
    assert not env.get(k),'Override schema/profile perlu ditinjau'
assert env.get('SERVER_PORT')=='8081' and env.get('SPRING_PROFILES_ACTIVE') in ('postgres','prod'),'Port/profile backend berbeda'
assert str(env.get('SPRING_LIQUIBASE_ENABLED','true')).lower()=='true','Liquibase harus aktif'
assert env.get('SPRING_LIQUIBASE_CHANGE_LOG','classpath:db/changelog/db.changelog-master.yaml')=='classpath:db/changelog/db.changelog-master.yaml','Changelog berbeda'
assert env.get('SPRING_JPA_HIBERNATE_DDL_AUTO','none')=='none','DDL harus ditangani Liquibase'
for k in ('SPRING_APPLICATION_JSON','SPRING_CONFIG_LOCATION','SPRING_CONFIG_ADDITIONAL_LOCATION'):
    assert not env.get(k),'Override konfigurasi perlu ditinjau'
assert not any('tagtog' in k.lower() and v for k,v in env.items()),'TAGTOG tidak termasuk release ini'
for k in ('JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS','JAVA_OPTS'):
    options=str(env.get(k,''))
    assert '@' not in options and not any(x in options.lower() for x in ('spring.','spring_','jdbc','postgres','storage','hibernate.ddl')),'Override Java schema perlu ditinjau'
pg=dict(item.split('=',1) for item in postgres['Config']['Env'])
url=urllib.parse.urlsplit(str(env.get('JDBC_URL','')).removeprefix('jdbc:'))
assert url.scheme=='postgresql' and url.hostname=='postgres' and url.port==5432 and url.path=='/'+pg['POSTGRES_DB'] and not any((url.query,url.fragment,url.username,url.password)),'Database target berbeda'
assert env.get('POSTGRES_DB')==pg['POSTGRES_DB'] and env.get('POSTGRES_USER')==pg['POSTGRES_USER'],'Koneksi database berbeda'
mounts=[m for m in backend['Mounts'] if m['Destination']=='/app/uploads']
assert len(backend['Mounts'])==len(mounts)==1 and mounts[0]['Type']=='bind' and mounts[0]['Source']==be+'/uploads' and mounts[0]['RW'],'Mount unggahan berbeda'
volumes=cfg.get('volumes',[])
assert len(volumes)==1 and volumes[0].get('type')=='bind' and volumes[0].get('source')==be+'/uploads' and volumes[0].get('target')=='/app/uploads' and not volumes[0].get('read_only'),'Mount Compose tidak sesuai backup'
assert env.get('STORAGE_TYPE','local')=='local' and env.get('STORAGE_LOCAL_DIR','uploads') in ('uploads','/app/uploads'),'Storage lain memerlukan backup tersendiri'
assert len(cfg.get('ports',[]))==1 and str(cfg['ports'][0].get('published'))=='8085' and int(cfg['ports'][0]['target'])==8081,'Port publik backend berbeda'
networks=cfg.get('networks') or {'default':None}
assert {resolved['networks'][n]['name'] for n in networks}==set(backend['NetworkSettings']['Networks']),'Network Compose berbeda dari container aktif'
apps=[a for a in json.loads((p/'backup/pm2-before.json').read_text()) if a['name']=='crm-fe']
assert len(apps)==1;app=apps[0];e=app['pm2_env']
assert e['status']=='online' and app['pid']>0 and e['pm_cwd']=='/var/www/crm-fe','PM2 CRM tidak sesuai'
assert e['args']==['start','--','-p','3000'],'Perintah PM2 berbeda'
assert os.path.realpath('/proc/'+str(app['pid'])+'/exe')==os.path.realpath(node),'Runtime Node aktif berbeda'
(p/'old-fe-pid').write_text(str(app['pid']))
RUNTIME
health http://127.0.0.1:3000/login 200
health http://127.0.0.1:8085/api/auth/me 401
for area in frontend backend; do
  if [ "$area" = frontend ]; then repo=$fe; url=$fe_url; target=$fe_target; else repo=$be; url=$be_url; target=$be_target; fi
  git -C "$repo" fetch --no-tags "$url" main
  git -C "$repo" merge-base --is-ancestor "$target" FETCH_HEAD
  git -C "$repo" merge-base --is-ancestor HEAD "$target"
  if git -C "$repo" ls-tree -r --name-only "$target" -- app components lib src/main | grep -Ei '(^|/)tagtog|eo-scout|EoProspect|EoSocial'; then
    printf 'Target memuat fitur yang ditunda.\n' >&2; exit 1
  fi
  if git -C "$repo" grep -I -i -l 'tagtog' "$target" -- app components lib src/main; then
    printf 'Target memuat integrasi TAGTOG.\n' >&2; exit 1
  fi
  if [ "$area" = frontend ]; then
    git -C "$repo" diff --quiet HEAD "$target" -- package.json package-lock.json next.config.js
  else
    git -C "$repo" diff --quiet HEAD "$target" -- pom.xml Dockerfile .dockerignore .env docker-compose.yml
    python3 - "$repo" "$target" <<'RESOURCE'
import subprocess,sys
repo,target=sys.argv[1:]
paths=subprocess.check_output(['git','-C',repo,'diff','--name-only','HEAD',target,'--','src/main/resources'],text=True).splitlines()
allowed={'src/main/resources/db/changelog/db.changelog-master.yaml',*(f'src/main/resources/db/changelog/changes/changelog-crm-{n}.yml' for n in ('database-destinations','pms-event-binding','strict-database-destinations','participant-organization-fields','ems-approval-source'))}
assert set(paths)<=allowed,'Schema/config lain memerlukan release terpisah'
RESOURCE
  fi
  git -C "$repo" rev-parse HEAD > "$work/backup/$area-head"
  git -C "$repo" archive HEAD > "$work/backup/$area-source.tar"
  git -C "$repo" diff HEAD > "$work/backup/$area-local-changes.patch"
  git -C "$repo" archive "$target" | tar -xf - -C "$work/$area"
done
python3 "$work/migration_guard.py" require-compatible "$work"
cp -p "$fe/.env.production" "$work/frontend/.env.production"
cp -p "$fe/.env.production" "$work/backup/frontend.env.production"
cp -p "$be/.env" "$work/backup/backend.env"
cp -p "$be/.env.ems-v2" "$work/backup/backend.env.ems-v2"
cp -p "$be/docker-compose.yml" "$work/backup/docker-compose.yml"
if [ -f "$be/docker-compose.override.yml" ]; then cp -p "$be/docker-compose.override.yml" "$work/backup/docker-compose.override.yml"; fi

backup_data() {
  local label=$1 destination=$work/$1
  docker exec crm-kimtele-postgres sh -eu -c 'unset PGHOST PGHOSTADDR PGPORT PGSERVICE PGSERVICEFILE PGOPTIONS PGDATABASE; exec pg_dump -w -h /var/run/postgresql -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$destination/database.dump"
  test -s "$destination/database.dump"
  docker exec -i crm-kimtele-postgres pg_restore --file=/dev/null < "$destination/database.dump"
  tar -C "$be" -czf "$destination/uploads.tar.gz" uploads
  tar -tzf "$destination/uploads.tar.gz" > /dev/null
  tar -C "$work" -czf "$work/backup-$label.tar.gz" backup "$label"
  tar -tzf "$work/backup-$label.tar.gz" > /dev/null
  sha256sum "$work/backup-$label.tar.gz" > "$work/backup-$label.sha256"
  sha256sum --check --status "$work/backup-$label.sha256"
}

printf 'BACKUP_BEFORE_BUILD\n' > "$work/status"
printf 'Membuat backup awal database, unggahan dan konfigurasi.\n'
backup_data initial
printf 'BUILDING\n' > "$work/status"
printf 'Build FE/BE; layanan lama tetap aktif.\n'
(
  cd "$work/frontend"
  export NEXT_PUBLIC_API_BASE_URL=https://crm-api.kimcommunication.id
  "$node" "$npm_cli" ci --include=dev --no-audit --no-fund
  test "$("$node" -p "require('next/package.json').version")" = 16.4.3
  NODE_ENV=production "$node" "$npm_cli" run build
)
docker build -t "crm-migration-backend:$id" "$work/backend"
new_image=$(docker image inspect --format '{{.Id}}' "crm-migration-backend:$id")
docker image inspect "$new_image" > "$work/new-image.json"
python3 - "$work" <<'NEW_IMAGE'
import json,pathlib,sys
c=json.loads(pathlib.Path(sys.argv[1],'new-image.json').read_text())[0]['Config']
assert c['Entrypoint']==['java','-jar','app.jar'] and c.get('Cmd') in (None,[]) and c['WorkingDir']=='/app','Image runtime berbeda'
assert not any(k.upper().startswith(('SPRING_','JDBC_','POSTGRES_','STORAGE_','TAGTOG_')) for k in (v.split('=',1)[0] for v in c.get('Env',[]))),'Image tidak boleh menimpa konfigurasi aplikasi'
env=dict(v.split('=',1) for v in c.get('Env',[]))
assert not any(env.get(k) for k in ('JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','_JAVA_OPTIONS','JAVA_OPTS')),'Image tidak boleh menimpa opsi Java'
NEW_IMAGE
docker image tag "$old_image" "crm-before-migration:$id"
test -z "$(ss -lntH '( sport = :13000 )')"
(cd "$work/frontend" && exec "$node" node_modules/next/dist/bin/next start -p 13000 --hostname 127.0.0.1) < /dev/null > "$work/frontend-canary.log" 2>&1 &
canary_pid=$!
health http://127.0.0.1:13000/login 200
kill "$canary_pid"; wait "$canary_pid" || true; canary_pid=
source_state check
test "$(docker inspect --format '{{.Image}}' crm-kimtele-backend)" = "$old_image"
"$node" "$pm2_cli" jlist | python3 -c 'import json,sys;p=[a for a in json.load(sys.stdin) if a["name"]=="crm-fe"];assert len(p)==1 and str(p[0]["pid"])==open(sys.argv[1]+"/old-fe-pid").read()' "$work"
printf 'STOPPING_WRITERS\n' > "$work/status"
frozen=1
"$node" "$pm2_cli" stop crm-fe >/dev/null
docker stop --time 30 crm-kimtele-backend >/dev/null
test "$(docker inspect --format '{{.State.Running}}' crm-kimtele-backend)" = false
test "$(sql_scalar "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend';")" = 0
printf 'BACKUP_BEFORE_MIGRATION\n' > "$work/status"
backup_data final
python3 "$work/migration_guard.py" capture "$work"
source_state check
sources_switched=1
git -C "$be" -c core.hooksPath=/dev/null merge --ff-only "$be_target"
git -C "$fe" -c core.hooksPath=/dev/null merge --ff-only "$fe_target"
test "$(git -C "$be" rev-parse HEAD)" = "$be_target"
test "$(git -C "$fe" rev-parse HEAD)" = "$fe_target"
cmp -s "$fe/.env.production" "$work/backup/frontend.env.production"
cmp -s "$be/.env" "$work/backup/backend.env"
cmp -s "$be/.env.ems-v2" "$work/backup/backend.env.ems-v2"
cmp -s "$be/docker-compose.yml" "$work/backup/docker-compose.yml"
if [ -f "$work/backup/docker-compose.override.yml" ]; then cmp -s "$be/docker-compose.override.yml" "$work/backup/docker-compose.override.yml"; fi
python3 - "$work" "$id" <<'IMAGE'
import json,pathlib,sys
w,release=sys.argv[1:]
pathlib.Path(w,'migration-image.json').write_text(json.dumps({'services':{'backend':{'image':'crm-migration-backend:'+release}}}))
IMAGE
compose+=(-f "$work/migration-image.json")
"${compose[@]}" config --quiet
# No new Java process may start before this durable, irreversible-boundary marker.
python3 - "$work" "$be_target" <<'MARKER'
import os,pathlib,sys
w,target=sys.argv[1:]
with open(pathlib.Path(w,'migration-started'),'x') as f:f.write(target+'\n');f.flush();os.fsync(f.fileno())
fd=os.open(w,os.O_RDONLY|os.O_DIRECTORY)
try:os.fsync(fd)
finally:os.close(fd)
MARKER
migration_started=1
printf 'MIGRATING_PRIVATELY\n' > "$work/status"
# Compose run deliberately does NOT use --service-ports or --publish.
"${compose[@]}" run --no-deps --pull never -T -d --name "$migration_container" backend > "$work/migration-container-id"
docker inspect "$migration_container" > "$work/migration-container.json"
migration_ip=$(python3 - "$work" "$new_image" "$be" <<'PRIVATE'
import ipaddress,json,pathlib,sys
c=json.loads(pathlib.Path(sys.argv[1],'migration-container.json').read_text())[0]
assert c['Image']==sys.argv[2],'Image migrasi berbeda'
assert not c['HostConfig'].get('PortBindings'),'Container migrasi tidak boleh punya port publik'
assert c['HostConfig']['NetworkMode']!='host','Host network ditolak'
assert len(c['Mounts'])==1 and c['Mounts'][0]['Type']=='bind' and c['Mounts'][0]['Source']==sys.argv[3]+'/uploads' and c['Mounts'][0]['Destination']=='/app/uploads','Mount migrasi berbeda'
ips=[n.get('IPAddress') for n in c['NetworkSettings']['Networks'].values() if n.get('IPAddress')]
assert ips and ipaddress.ip_address(ips[0]).is_private,'Network migrasi tidak sesuai'
print(ips[0])
PRIVATE
)
health "http://$migration_ip:8081/api/auth/me" 401
python3 "$work/migration_guard.py" verify "$work"
python3 "$work/migration_guard.py" schema "$work"
docker logs --tail 200 "$migration_container" > "$work/migration-container.log" 2>&1
docker stop --time 30 "$migration_container" >/dev/null
printf 'SWITCHING_APPLICATIONS\n' > "$work/status"
docker image tag "$new_image" "$old_tag"
"${compose[@]}" up -d --no-deps --no-build --pull never --force-recreate backend
test "$(docker inspect --format '{{.Image}}' crm-kimtele-backend)" = "$new_image"
health http://127.0.0.1:8085/api/auth/me 401
for directory in .next node_modules; do
  mv -- "$fe/$directory" "$work/rollback/$directory"
  mv -- "$work/frontend/$directory" "$fe/$directory"
done
frontend_swapped=1
"$node" "$pm2_cli" restart crm-fe --interpreter "$node" --update-env
printf 'VERIFYING\n' > "$work/status"
health http://127.0.0.1:3000/login 200
health https://crm.kimcommunication.id/login 200
health https://crm-api.kimcommunication.id/api/auth/me 401
python3 "$work/migration_guard.py" schema "$work"
"$node" "$pm2_cli" save
complete=1
printf 'COMPLETE\n' > "$work/status"
printf '0\n' > "$work/exit-code"
printf 'DEPLOY SELESAI. FE %s; BE %s.\nBackup final: %s/backup-final.tar.gz\nChecksum: %s/backup-final.sha256\nTidak ada sync EMS otomatis saat deploy. Approval manual akan mengikuti EMS pada sync berikutnya.\n' "$fe_target" "$be_target" "$work" "$work"
