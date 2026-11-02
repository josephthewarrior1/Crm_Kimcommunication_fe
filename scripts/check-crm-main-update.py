"""Offline regression: python scripts/check-crm-main-update.py (no server or Docker calls)."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import uuid

REPO = Path(__file__).resolve().parent.parent
SOURCE = (REPO / 'scripts/update-crm-main.sh').read_text()
BASH = next((p for p in (r'C:\Program Files\Git\bin\bash.exe', shutil.which('bash')) if p and Path(p).is_file()), None)
assert BASH and shutil.which('git'), 'Git and Bash are required'
ROOT = REPO / 'outputs' / ('crm-main-update-check-' + uuid.uuid4().hex[:8])
ROOT.mkdir()
ENV = dict(os.environ, GIT_TERMINAL_PROMPT='0', GIT_CONFIG_NOSYSTEM='1', GIT_ALLOW_PROTOCOL='file', LC_ALL='C')


def write(file, content):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content, encoding='utf-8', newline='\n')


def git(directory, *args):
    result = subprocess.run(['git', '-C', str(directory), *args], env=ENV, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


def extract(start, end):
    return SOURCE[SOURCE.index(start):SOURCE.index(end, SOURCE.index(start))]


state = extract('source_state() {', '\ntest "$(realpath "$fe")')
targets = extract('for area in frontend backend; do', '\ncp -p "$fe/.env.production"')
merge = extract('git -C "$be" -c core.hooksPath=/dev/null merge', '\nprintf \'APPLYING')
cleanup = extract('cleanup() {', '\ntrap cleanup EXIT')


def fixture(name, unsafe=None):
    directory = ROOT / name
    work = directory / 'work'
    for part in ('backup', 'rollback', 'frontend', 'backend'):
        (work / part).mkdir(parents=True)
    info = {}
    for area in ('frontend', 'backend'):
        seed = directory / (area + '-seed')
        remote = directory / (area + '-remote.git')
        live = directory / area
        seed.mkdir()
        remote.mkdir()
        git(remote, 'init', '--bare', '--initial-branch=main')
        git(seed, 'init', '--initial-branch=main')
        git(seed, 'config', 'user.name', 'CRM offline check')
        git(seed, 'config', 'user.email', 'offline@example.invalid')
        git(seed, 'config', 'core.autocrlf', 'false')
        write(seed / '.gitignore', '.env.production\n.env.ems-v2\ndocker-compose.override.yml\n.next/\nnode_modules/\n')
        changed = 'app/contact.tsx' if area == 'frontend' else 'src/main/java/Contact.java'
        config = 'package-lock.json' if area == 'frontend' else '.env'
        write(seed / changed, 'old application\n')
        write(seed / config, 'tracked baseline config\n')
        if area == 'frontend':
            write(seed / 'package.json', '{}\n')
            write(seed / 'next.config.js', 'module.exports={}\n')
        else:
            write(seed / 'src/main/resources/db/changelog.yaml', 'existing schema\n')
            write(seed / 'docker-compose.yml', 'existing compose\n')
        git(seed, 'add', '.')
        git(seed, 'commit', '-m', 'Old CRM')
        old = git(seed, 'rev-parse', 'HEAD')
        write(seed / changed, 'new application\n')
        if unsafe == 'schema' and area == 'backend':
            write(seed / 'src/main/resources/db/changelog.yaml', 'new schema\n')
        if unsafe == 'dependency' and area == 'frontend':
            write(seed / 'package-lock.json', 'new dependencies\n')
        if unsafe == 'tagtog' and area == 'frontend':
            write(seed / 'app/api/tagtog/start/route.ts', 'SSO branch must not deploy\n')
        git(seed, 'add', '.')
        git(seed, 'commit', '-m', 'New CRM')
        target = git(seed, 'rev-parse', 'HEAD')
        git(seed, 'remote', 'add', 'origin', str(remote))
        git(seed, 'push', 'origin', 'main')
        subprocess.run(['git', 'clone', str(remote), str(live)], env=ENV, check=True, capture_output=True)
        git(live, 'config', 'core.autocrlf', 'false')
        git(live, 'reset', '--keep', old)
        write(live / config, 'private live config ' + area + '\n')
        write(live / ('.env.production' if area == 'frontend' else '.env.ems-v2'), 'private runtime values\n')
        saved = {'package-lock.json': 'frontend-package-lock.json', '.env.production': 'frontend.env.production'} if area == 'frontend' else {
            '.env': 'backend.env', '.env.ems-v2': 'backend.env.ems-v2', 'docker-compose.yml': 'docker-compose.yml'}
        for file, backup in saved.items():
            shutil.copy2(live / file, work / 'backup' / backup)
        info[area] = (remote, target)
    return directory, work, info


def shell(directory, work, info, body, name):
    script = work / (name + '.sh')
    write(script, '''set -Eeuo pipefail
fe="$TEST_DIRECTORY/frontend"
be="$TEST_DIRECTORY/backend"
work="$TEST_WORK"
fe_url="$TEST_FE_URL"
be_url="$TEST_BE_URL"
fe_target="$TEST_FE_TARGET"
be_target="$TEST_BE_TARGET"
python3() { "$TEST_PYTHON" "$@"; }
''' + body)
    env = dict(ENV, TEST_PYTHON=Path(sys.executable).as_posix(), TEST_DIRECTORY=directory.as_posix(), TEST_WORK=work.as_posix(),
               TEST_FE_URL=info['frontend'][0].as_posix(), TEST_FE_TARGET=info['frontend'][1],
               TEST_BE_URL=info['backend'][0].as_posix(), TEST_BE_TARGET=info['backend'][1])
    result = subprocess.run([BASH, str(script)], env=env, capture_output=True, text=True)
    write(work / (name + '.stdout'), result.stdout)
    write(work / (name + '.stderr'), result.stderr)
    return result


tested = ROOT / 'tested-update.sh'
write(tested, SOURCE)
assert subprocess.run([BASH, '-n', str(tested)], capture_output=True).returncode == 0
directory, work, info = fixture('clean')
result = shell(directory, work, info, state + '\nsource_state save\n' + targets + '\nsource_state check\n' + merge, 'valid-update')
assert result.returncode == 0, result.stderr
for area in ('frontend', 'backend'):
    assert git(directory / area, 'rev-parse', 'HEAD') == info[area][1]
    config = 'package-lock.json' if area == 'frontend' else '.env'
    assert (directory / area / config).read_text() == 'private live config ' + area + '\n'
for unsafe in ('schema', 'dependency', 'tagtog'):
    directory, work, info = fixture(unsafe, unsafe)
    result = shell(directory, work, info, state + '\nsource_state save\n' + targets, 'reject-target')
    assert result.returncode != 0, unsafe
    assert git(directory / 'frontend', 'rev-parse', 'HEAD') != info['frontend'][1]
directory, work, info = fixture('source-drift')
result = shell(directory, work, info, state + '\nsource_state save\nprintf changed >> "$be/.env"\nsource_state check', 'drift')
assert result.returncode != 0 and 'Source/config berubah' in result.stderr
directory, work, info = fixture('dirty-source')
write(directory / 'frontend/app/contact.tsx', 'unreviewed application edit\n')
result = shell(directory, work, info, state + '\nsource_state save', 'dirty')
assert result.returncode != 0 and 'perubahan source lokal' in result.stderr

for case in ('rollback', 'rollback-compose-fails'):
    directory, work, info = fixture(case)
    for name in ('.next', 'node_modules'):
        write(directory / 'frontend' / name / 'artifact', 'new artifact\n')
        write(work / 'rollback' / name / 'artifact', 'old artifact\n')
    body = '''
node=mock_node
pm2_cli=pm2
canary_pid=
complete=0
applying=1
old_image=old-image
old_tag=old-tag
compose=(mock_compose)
event() { printf '%s\\n' "$*" >> "$work/events"; }
mock_node() { event "node $*"; }
docker() { event "docker $*"; if [ "$1" = inspect ]; then printf 'old-image\\n'; fi; }
mock_compose() { event "compose $*"; test "$CASE" != rollback-compose-fails; }
health() { event "health $*"; }
''' + cleanup + '\nCASE=' + case + '\nset +e\n(exit 17)\ncleanup\n'
    result = shell(directory, work, info, body, 'rollback-run')
    assert result.returncode == 17
    for name in ('.next', 'node_modules'):
        assert (directory / 'frontend' / name / 'artifact').read_text() == 'old artifact\n'
        assert (work / ('failed-' + name) / 'artifact').read_text() == 'new artifact\n'
    expected = 'FAILED_ROLLED_BACK' if case == 'rollback' else 'FAILED_NEEDS_ATTENTION'
    assert (work / 'status').read_text().strip() == expected
    events = (work / 'events').read_text()
    assert 'docker image tag old-image old-tag' in events
    assert 'pg_restore' not in events and 'database' not in events

print('Main update checks passed: syntax, pinned main fast-forwards, preserved config, schema/dependency/TAGTOG/dirty/drift rejection, and artifact/image rollback. No network or server calls.')
