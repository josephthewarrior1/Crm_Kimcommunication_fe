"""Offline regression: python scripts/check-crm-git-deploy.py (Git + Bash required)."""
import os
from pathlib import Path
import shutil
import subprocess
import uuid

REPO = Path(__file__).resolve().parent.parent
SOURCE = (REPO / 'scripts/deploy-crm-git.sh').read_text()
BASH = next((p for p in (r'C:\Program Files\Git\bin\bash.exe', shutil.which('bash')) if p and Path(p).is_file()), None)
assert BASH and shutil.which('git'), 'Git and Bash are required'
ROOT = REPO / 'outputs' / ('crm-git-deploy-check-' + uuid.uuid4().hex[:8])
ROOT.mkdir()
(ROOT / 'tested-deployer.sh').write_text(SOURCE, encoding='utf-8', newline='\n')
ENV = dict(os.environ, GIT_TERMINAL_PROMPT='0', GIT_CONFIG_NOSYSTEM='1', GIT_ALLOW_PROTOCOL='file', LC_ALL='C')


def git(directory, *arguments, check=True):
    result = subprocess.run(['git', '-C', str(directory), *arguments], env=ENV, text=True, capture_output=True)
    if check and result.returncode:
        raise AssertionError(result.stderr)
    return result.stdout.strip()


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8', newline='\n')


def extract(start, end):
    return SOURCE[SOURCE.index(start):SOURCE.index(end, SOURCE.index(start))]


stash = extract('stash_known() {', '\ncase "$mode" in')
rollback = extract('rollback_step() {', '\ntrap cleanup EXIT')
pull_start = '    stash_known "$fe" package-lock.json frontend'
pull_end = '    cp -p "$work/config/backend.env" "$be/.env"'
pull = SOURCE[SOURCE.index(pull_start):SOURCE.index(pull_end) + len(pull_end)]
pull_fe = next(line for line in pull.splitlines() if 'git -C "$fe"' in line and ' pull --ff-only ' in line)

targets = {}
for area in ('frontend', 'backend'):
    remote, seed = ROOT / (area + '-remote.git'), ROOT / (area + '-seed')
    remote.mkdir()
    git(remote, 'init', '--bare', '--initial-branch=main')
    seed.mkdir()
    git(seed, 'init', '--initial-branch=main')
    git(seed, 'config', 'user.name', 'CRM offline check')
    git(seed, 'config', 'user.email', 'offline@example.invalid')
    git(seed, 'config', 'core.autocrlf', 'false')
    write(seed / '.gitignore', '.next/\nnode_modules/\nuploads/\n.env.ems-v2\n')
    changed = 'app/dashboard/page.tsx' if area == 'frontend' else 'src/EventController.java'
    config = 'package-lock.json' if area == 'frontend' else '.env'
    write(seed / changed, 'old application\n')
    write(seed / config, 'tracked baseline config\n')
    git(seed, 'add', '.')
    git(seed, 'commit', '-m', 'Old CRM')
    old = git(seed, 'rev-parse', 'HEAD')
    write(seed / changed, 'new CRM dashboard and EMS v2\n')
    added = 'app/dashboard/events/EmsMappingField.tsx' if area == 'frontend' else 'src/EmsV2Client.java'
    write(seed / added, 'EMS v2 integration\n')
    if area == 'frontend':
        write(seed / config, 'new locked dependencies\n')
    git(seed, 'add', '.')
    git(seed, 'commit', '-m', 'New CRM main')
    target = git(seed, 'rev-parse', 'HEAD')
    git(seed, 'remote', 'add', 'origin', str(remote))
    git(seed, 'push', 'origin', 'main')
    targets[area] = (remote, old, target, added, changed, config)


def fixture(name):
    directory = ROOT / name
    directory.mkdir()
    work = directory / 'release'
    (work / 'config').mkdir(parents=True)
    (work / 'rollback').mkdir()
    for area, (remote, old, target, added, changed, config) in targets.items():
        live = directory / area
        subprocess.run(['git', 'clone', str(remote), str(live)], env=ENV, check=True, capture_output=True)
        git(live, 'config', 'user.name', 'CRM offline check')
        git(live, 'config', 'user.email', 'offline@example.invalid')
        git(live, 'config', 'core.autocrlf', 'false')
        git(live, 'reset', '--keep', old)
        write(live / config, 'private live config ' + area + '\n')
        write(live / 'uploads/customer.txt', 'customer data ' + area + '\n')
        write(live / '.next/artifact', 'old .next\n')
        write(live / 'node_modules/artifact', 'old node_modules\n')
        write(work / ('old-fe-head' if area == 'frontend' else 'old-be-head'), old)
        write(work / (area + '-head'), target)
        saved = 'frontend-package-lock.json' if area == 'frontend' else 'backend.env'
        shutil.copy2(live / config, work / 'config' / saved)
    write(work / 'old-fe-node', 'mock_old_node')
    write(work / 'old-image-id', 'old-image')
    write(work / 'old-image-tag', 'old-tag')
    return directory, work


def shell(directory, work, body, name):
    prelude = r'''
set -Eeuo pipefail
work="$TEST_WORK"
fe="$TEST_DIRECTORY/frontend"
be="$TEST_DIRECTORY/backend"
id=offline-check
fe_url="$TEST_REMOTE_FE"
be_url="$TEST_REMOTE_BE"
override="$be/docker-compose.override.yml"
event() { printf '%s\n' "$*" >> "$work/events"; }
'''
    script = work / (name + '.sh')
    write(script, prelude + body)
    env = dict(ENV, TEST_DIRECTORY=directory.as_posix(), TEST_WORK=work.as_posix(),
               TEST_REMOTE_FE=targets['frontend'][0].as_posix(), TEST_REMOTE_BE=targets['backend'][0].as_posix())
    result = subprocess.run([BASH, str(script)], env=env, capture_output=True, text=True)
    write(work / (name + '.stdout'), result.stdout)
    write(work / (name + '.stderr'), result.stderr)
    return result


def apply(directory, work):
    result = shell(directory, work, stash + '\n' + pull + '\n', 'pull-main')
    assert result.returncode == 0, result.stderr
    for area, (_, old, target, added, changed, config) in targets.items():
        live = directory / area
        assert git(live, 'rev-parse', 'HEAD') == target
        assert (live / added).is_file() and 'new CRM' in (live / changed).read_text()
        stash_id = (work / (area + '-stash-id')).read_text().strip()
        assert git(live, 'stash', 'show', '--name-only', stash_id) == config
        assert (live / 'uploads/customer.txt').read_text() == 'customer data ' + area + '\n'
        assert (live / '.next/artifact').read_text() == 'old .next\n'
        assert (live / 'node_modules/artifact').read_text() == 'old node_modules\n'
    assert (directory / 'backend/.env').read_text() == 'private live config backend\n'


mock = r'''
mode=apply
node=mock_node
pm2_cli=pm2
compose_old=(docker compose)
canary_pid=
switched=1
complete=0
printf '%s' "$PATH" > "$work/old-fe-path"
mock_node() { event "node $*"; }
mock_old_node() { event "old-node $*"; }
docker() {
  event "docker $*"
  if [ "$CASE" = stop-fails ] && [ "$1" = stop ]; then return 1; fi
  if [ "$CASE" = retag-fails ] && [ "$1 $2" = 'image tag' ]; then return 1; fi
}
cp() {
  event "copy $*"
  if [ "$CASE" = restore-fails ]; then return 1; fi
  command cp "$@"
}
nonlegacy_mappings() {
  event mappings
  case "$CASE" in v2-mappings) printf '1\n';; query-fails) return 1;; *) printf '0\n';; esac
}
health() { event health; }
set +e
(exit 17)
cleanup
'''

for case in ('legacy-only', 'v2-mappings', 'query-fails', 'stop-fails', 'restore-fails', 'retag-fails'):
    directory, work = fixture(case)
    apply(directory, work)
    for name in ('.next', 'node_modules'):
        shutil.move(str(directory / 'frontend' / name), str(work / 'rollback' / name))
        write(directory / 'frontend' / name / 'artifact', 'new ' + name + '\n')
    result = shell(directory, work, rollback + '\nCASE=' + case + '\n' + mock, 'rollback')
    assert result.returncode != 0
    events = (work / 'events').read_text().splitlines()
    assert events[0] == 'node pm2 stop crm-fe'
    assert events[1] == 'docker stop crm-kimtele-backend'
    if case == 'legacy-only':
        assert events.index('mappings') < next(i for i, event in enumerate(events) if event.startswith('copy '))
        for area, (_, old, target, added, changed, config) in targets.items():
            live = directory / area
            assert git(live, 'rev-parse', 'HEAD') == old
            assert not (live / added).exists()
            assert (live / config).read_text() == 'private live config ' + area + '\n'
            assert (live / 'uploads/customer.txt').read_text() == 'customer data ' + area + '\n'
        for name in ('.next', 'node_modules'):
            assert (directory / 'frontend' / name / 'artifact').read_text() == 'old ' + name + '\n'
        assert 'old-node pm2 restart crm-fe --interpreter mock_old_node --update-env' in events
        assert events.count('health') == 2
        assert 'Aplikasi sebelumnya dipulihkan.' in result.stderr
    elif case in ('v2-mappings', 'query-fails', 'stop-fails'):
        for area, (_, old, target, added, changed, config) in targets.items():
            assert git(directory / area, 'rev-parse', 'HEAD') == target
            assert (directory / area / added).exists()
        assert not any(event.startswith(('copy ', 'old-node ', 'docker image tag', 'docker compose')) for event in events)
        assert 'health' not in events
    else:
        assert not any(event.startswith(('old-node ', 'docker compose')) for event in events)
        assert 'health' not in events
        assert 'Rollback gagal' in result.stderr
    print('PASS: real Git pull + rollback:', case)

directory, work = fixture('diverged-main')
live = directory / 'frontend'
write(live / 'local-only.txt', 'local commit\n')
git(live, 'add', 'local-only.txt')
git(live, 'commit', '-m', 'Diverged local main')
before = git(live, 'rev-parse', 'HEAD')
result = shell(directory, work, stash + '\nstash_known "$fe" package-lock.json frontend\n' + pull_fe + '\n', 'reject-diverged')
assert result.returncode != 0 and git(live, 'rev-parse', 'HEAD') == before
assert 'fast-forward' in result.stderr
assert (live / 'uploads/customer.txt').is_file()
print('PASS: diverged main refuses fast-forward pull')
print('Offline Git deployment checks passed. Artifacts retained:', ROOT)
