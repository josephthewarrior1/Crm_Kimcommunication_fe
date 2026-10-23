"""Offline rollback safety check: python scripts/check-crm-main-deploy.py."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

source = Path(__file__).with_name('deploy-crm-main-server.sh').read_text()
bash = next((p for p in (r'C:\Program Files\Git\bin\bash.exe', shutil.which('bash')) if p and Path(p).is_file()), None)
assert bash, 'Bash is required for this offline check'

def function(name, following):
    return source[source.index(name + '() {'):source.index(following + '() {')]

functions = function('nonlegacy_mappings', 'restore_sources') + function('rollback_step', 'cleanup') + function('cleanup', 'ems_config')
mock = r'''
set +e
work="$TEST_ROOT"
fe="$work/frontend"
be="$work/backend"
override="$work/no-override"
node=mock_node
pm2_cli=pm2
compose_old=(docker compose)
canary_pid=
switched=1
complete=0
mkdir -p "$fe" "$be" "$work/rollback"
printf old-image > "$work/old-image-id"
printf old-tag > "$work/old-image-tag"
event() { printf '%s\n' "$*" >> "$work/events"; }
mock_node() { event "node $*"; }
docker() {
  event "docker $*"
  if [ "$1" = stop ] && [ "$CASE" = stop-fails ]; then return 1; fi
  if [ "$1 $2" = 'image tag' ] && [ "$CASE" = tag-fails ]; then return 1; fi
}
sql_scalar() {
  event sql
  if [[ "$1" == *information_schema* ]]; then
    if [ "$CASE" = absent-column ]; then printf '0\n'; else printf '1\n'; fi
  elif [ "$CASE" = query-fails ]; then return 1
  elif [ "$CASE" = v2-mappings ]; then printf '1\n'
  else printf '0\n'; fi
}
restore_sources() { event restore; if [ "$CASE" = restore-fails ]; then return 1; fi; }
health() { event health; }
(exit 7)
cleanup
'''
with tempfile.TemporaryDirectory(prefix='crm-deploy-check-') as temporary:
    root = Path(temporary)
    script = root / 'check.sh'
    script.write_text(functions + mock, newline='\n')
    for case in ('legacy-only', 'absent-column', 'v2-mappings', 'query-fails', 'stop-fails', 'restore-fails', 'tag-fails'):
        directory = root / case
        directory.mkdir()
        env = dict(os.environ, CASE=case, TEST_ROOT=directory.as_posix())
        result = subprocess.run([bash, str(script)], env=env, capture_output=True, text=True)
        events = (directory / 'events').read_text().splitlines()
        stopped = events.index('docker stop crm-kimtele-backend')
        assert result.returncode != 0, (case, 'Original deployment failure must remain a failure')
        if case in ('legacy-only', 'absent-column'):
            assert stopped < events.index('sql') < events.index('restore')
            assert events.index('restore') < events.index('docker image tag old-image old-tag')
            assert 'docker compose up -d --no-deps --no-build --pull never backend' in events
            assert 'node pm2 restart crm-fe' in events
            assert 'Previous CRM application restored.' in result.stderr
        elif case in ('v2-mappings', 'query-fails', 'stop-fails'):
            assert 'restore' not in events
            assert not any('image tag' in event or 'restart crm-fe' in event for event in events)
        else:
            assert 'restore' in events
            assert not any('docker compose' in event or 'restart crm-fe' in event for event in events)
            assert 'Rollback step failed' in result.stderr
        print('PASS:', case)
print('Offline rollback safety checks passed; no server or database contacted.')
