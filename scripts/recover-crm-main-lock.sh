#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
mode=${1:-}
if [ "$#" -gt 1 ] || { [ -n "$mode" ] && [ "$mode" != --prepare-background ]; }; then
  printf 'Usage: bash recover-crm-main-lock.sh [--prepare-background]\n' >&2
  exit 2
fi
if [ "$mode" = --prepare-background ]; then
  for program in nohup setsid; do
    command -v "$program" >/dev/null || { printf 'Program wajib tidak tersedia: %s\n' "$program" >&2; exit 1; }
  done
fi
test "$(id -u)" = 0 || { printf 'Jalankan sebagai root.\n' >&2; exit 1; }
exec 8>/var/lock/crm-main-deploy.lock
flock -n 8 || { printf 'Proses deploy CRM lain masih berjalan.\n' >&2; exit 1; }

# Reuse the verified staged release; do not change its failed preparation files.
work=$(python3 - <<'RECOVER'
import copy, datetime, hashlib, io, json, pathlib, secrets, tarfile

new_commit = '33e7d95f1b75d0e044e2b8dd03780258dcc4a90e'
expected_package = 'f1c7971d2c8c1c0fbd4da99941a726604b01379c52b376e395693a1b1c4c83fe'
expected_lock = 'f74bf5ecb0ba055a84ecaa1e33d415f66cb7841cc51369d2c72e028b6ed5bfda'
assert len(new_commit) == 40 and len(expected_package) == len(expected_lock) == 64, 'Recovery checksums have not been configured'
old = pathlib.Path('/root/crm-main-release-20261023T135006-bfdb66')
assert not (old / 'apply-started').exists() and not (old / 'complete').exists(), 'Old release already started deployment; stop and inspect it first'
hashes = {
    'source.tar.gz': 'f541b5177cf0e998fec57a35fbb3080174114ec0d82545aa484f5303d7f3918f',
    'deploy.sh': 'a4efebb6a3a805bb33875d86e9054b4f849fdf1e083eb3d6da64e28ce6acf52f',
    'web-console.sh': '5f2fb9b81b9d6e13f76793117f1c0b53387ab7c94b4cf7ed680a8c9e51662ac3',
    'ems-v2.env.example': '4803387356370c03d2e5fea3b1cbbfa47088e57911a0705150482c985541999b',
}
for name, expected in hashes.items():
    assert hashlib.sha256((old / name).read_bytes()).hexdigest() == expected, 'Original staged file differs: ' + name

records, files = [], {}
with tarfile.open(old / 'source.tar.gz', 'r:gz') as archive:
    seen = set()
    for member in archive.getmembers():
        name = member.name.rstrip('/')
        parts = pathlib.PurePosixPath(name).parts
        assert parts and name == '/'.join(parts) and '..' not in parts and not name.startswith('/'), 'Unsafe archive path'
        assert parts[0] in ('frontend', 'backend', 'manifest.json') and name not in seen, 'Unexpected archive member'
        assert member.isfile() or member.isdir(), 'Archive links and special files are refused'
        seen.add(name)
        data = archive.extractfile(member).read() if member.isfile() else None
        records.append((member, name, data))
        if data is not None:
            files[name] = data

manifest = json.loads(files['manifest.json'])
assert manifest['frontendSource'] == '39c8bf84c04506801d3672ba1d95823e3337cfd9'
for area in ('frontend', 'backend'):
    actual = sorted(name[len(area) + 1:] for name in files if name.startswith(area + '/'))
    assert actual == sorted(manifest[area + 'Files']), 'Original source manifest differs'
package = json.loads(files['frontend/package.json'])
assert package['overrides']['recharts'] == {'react-is': '19.3.1'}
package['overrides']['recharts']['prop-types'] = {'react-is': '16.13.1'}
lock = json.loads(files['frontend/package-lock.json'])
nested = 'node_modules/prop-types/node_modules/react-is'
assert nested not in lock['packages']
react_is = {
    'version': '16.13.1',
    'resolved': 'https://registry.npmjs.org/react-is/-/react-is-16.13.1.tgz',
    'integrity': 'sha512-24e6ynE2H+OKt4kqsOvNd8kBpV65zoxbA4BVsEOB3ARVWQki/DHzaUoC5KuON/BiccDaCCTZBuOcfZs70kR8bQ==',
    'license': 'MIT',
}
packages = {}
for name, value in lock['packages'].items():
    packages[name] = value
    if name == 'node_modules/prop-types':
        packages[nested] = react_is
assert nested in packages
lock['packages'] = packages
encode = lambda value: (json.dumps(value, indent=2, ensure_ascii=False) + '\n').encode()
for name, value, expected in (
    ('frontend/package.json', package, expected_package),
    ('frontend/package-lock.json', lock, expected_lock),
):
    files[name] = encode(value)
    assert hashlib.sha256(files[name]).hexdigest() == expected, 'Tested package checksum differs: ' + name
manifest['frontendSource'] = new_commit
files['manifest.json'] = encode(manifest)

release = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S') + '-' + secrets.token_hex(3)
work = old.parent / ('crm-main-release-' + release)
work.mkdir(mode=0o700)
with tarfile.open(work / 'source.tar.gz', 'w:gz') as archive:
    for member, name, data in records:
        member = copy.copy(member)
        if data is not None:
            data = files[name]
            member.size = len(data)
        archive.addfile(member, io.BytesIO(data) if data is not None else None)
source_hash = hashlib.sha256((work / 'source.tar.gz').read_bytes()).hexdigest()
helper = (old / 'deploy.sh').read_text()
assert helper.count("assert m['frontendSource'] == '39c8bf84c04506801d3672ba1d95823e3337cfd9'") == 1
helper = helper.replace("assert m['frontendSource'] == '39c8bf84c04506801d3672ba1d95823e3337cfd9'", "assert m['frontendSource'] == '" + new_commit + "'")
anchor = "assert.equal(require('react-dom/package.json').version,'19.3.1');"
assert helper.count(anchor) == 1
helper = helper.replace(anchor, anchor + "\nconst {createRequire} = require('node:module');\nconst chartRequire = createRequire(require.resolve('recharts/package.json'));\nassert(chartRequire('react-is').isElement(require('react').createElement('div')),'Recharts cannot recognize installed React elements');")
(work / 'deploy.sh').write_text(helper)
console = (old / 'web-console.sh').read_text()
assert console.count('id=20261023T135006-bfdb66') == 1
assert console.count('source_hash=' + hashes['source.tar.gz']) == 1
console = console.replace('id=20261023T135006-bfdb66', 'id=' + release)
console = console.replace('source_hash=' + hashes['source.tar.gz'], 'source_hash=' + source_hash)
start = console.index('bash "$work/deploy.sh" configure ')
end = console.index('python3 - "$work" "$id" <<\'PC_INSTRUCTIONS\'')
prepare = console[start:end]
console = console[:start] + '''if [ "${1:-}" = --continue ]; then
  if [ ! -f "$work/prepare.exit" ] || [ "$(cat "$work/prepare.exit")" != 0 ] || [ ! -f "$work/prepared" ] || [ -e "$work/apply-started" ] || [ -e "$work/complete" ]; then
    printf 'Persiapan belum selesai atau deploy sudah dimulai. Cek log dan prepare.exit.\\n' >&2
    exit 1
  fi
else
''' + prepare + '''printf '0\\n' > "$work/prepare.exit.tmp"
mv -- "$work/prepare.exit.tmp" "$work/prepare.exit"
fi
''' + console[end:]
console = console.replace('umask 077\n', '''umask 077
if [ "$#" -gt 1 ] || { [ -n "${1:-}" ] && [ "${1:-}" != --continue ]; }; then
  printf 'Usage: bash web-console.sh [--continue]\\n' >&2
  exit 2
fi
''', 1)
(work / 'web-console.sh').write_text(console)
(work / 'ems-v2.env.example').write_bytes((old / 'ems-v2.env.example').read_bytes())
(work / 'scripts.sha256').write_text(''.join(hashlib.sha256((work / name).read_bytes()).hexdigest() + '  ' + name + '\n' for name in hashes))
print(work)
RECOVER
)
flock -u 8
exec 8>&-
printf 'Paket perbaikan: %s\nPaket lama tetap disimpan. Backup ke PC tetap wajib sebelum layanan diganti.\n' "$work"
if [ "$mode" = --prepare-background ]; then
  cat > "$work/prepare-background.sh" <<'PREPARE_RUNNER'
#!/usr/bin/env bash
set -Eeuo pipefail
work=$1
id=$2
source_hash=$3
trap 'result=$?; printf "%s\n" "$result" > "$work/prepare.exit.tmp"; mv -- "$work/prepare.exit.tmp" "$work/prepare.exit"; if [ "$result" != 0 ]; then printf "Persiapan gagal (exit %s). Cek prepare.log dan prepare-runner.log.\n" "$result" >&2; fi' EXIT
bash "$work/deploy.sh" prepare "$id" "$source_hash" > "$work/prepared.json"
PREPARE_RUNNER
  source_hash=$(sha256sum "$work/source.tar.gz")
  source_hash=${source_hash%% *}
  nohup setsid bash "$work/prepare-background.sh" "$work" "${work##*/crm-main-release-}" "$source_hash" < /dev/null > "$work/prepare-runner.log" 2>&1 &
  printf '%s\n' "$!" > "$work/prepare.pid"
  printf 'Build dan backup berjalan di background; belum mengganti layanan.\nLihat log:\ntail -n 80 -F "%s/prepare.log" "%s/prepare-runner.log"\nCek hasil (0 berarti berhasil):\ncat "%s/prepare.exit"\nSetelah berhasil, lanjutkan salin/verifikasi backup ke PC dan deploy:\nbash "%s/web-console.sh" --continue\n' "$work" "$work" "$work" "$work"
  exit 0
fi
exec bash "$work/web-console.sh"
