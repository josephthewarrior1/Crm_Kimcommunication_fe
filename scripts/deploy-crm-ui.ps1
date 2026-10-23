param([switch]$PrepareOnly)
$ErrorActionPreference = 'Stop'

# Deploy dashboard/charts and the Next.js security update to the current live base.
# EMS v2, EO Scout, TAGTOG, database migrations, and local credentials are excluded.
$repo = Split-Path -Parent $PSScriptRoot
$server = 'root@146.190.101.90'
$key = Join-Path $env:USERPROFILE '.ssh\id_ed25519'
$id = (Get-Date -Format 'yyyyMMddTHHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 6)
$release = Join-Path $repo "outputs\crm-ui-release-$id"
$payload = Join-Path $release 'payload'
$remote = "/root/crm-ui-release-$id"
$sshOptions = @('-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15','-i',$key)

function Invoke-Checked {
  param([string]$Program, [string[]]$Arguments)
  & $Program @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit $LASTEXITCODE)." }
}

$files = @(
  'app/dashboard/page.tsx',
  'app/dashboard/components/DashboardOverview.tsx',
  'app/dashboard/components/PositionSummaryCard.tsx',
  'app/dashboard/database/page.tsx',
  'app/dashboard/database/components/DatabaseCharts.tsx',
  'app/dashboard/database/components/ExcelImportModal.tsx',
  'app/login/page.tsx',
  'lib/types.ts',
  'public/Database_Template.xlsx',
  'package.json',
  'package-lock.json',
  'next.config.js',
  'eslint.config.mjs',
  'tsconfig.json'
)
New-Item -ItemType Directory -Path $payload | Out-Null
foreach ($file in $files) {
  $source = Join-Path $repo $file
  $target = Join-Path $payload "frontend/$file"
  if ((Get-Item -LiteralPath $source).LinkType) { throw "Symlink source refused: $file" }
  New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
  Copy-Item -LiteralPath $source -Destination $target
}
New-Item -ItemType Directory -Path (Join-Path $payload 'patches') | Out-Null
foreach ($patch in @(@('dashboard-position-summary', 'dashboard'), @('database-charts', 'database'))) {
  $patchText = [IO.File]::ReadAllText((Join-Path $repo "integrations/$($patch[0])/backend.patch")).Replace("`r`n", "`n")
  [IO.File]::WriteAllText((Join-Path $payload "patches/$($patch[1]).patch"), $patchText, [Text.UTF8Encoding]::new($false))
}
$serverScript = Join-Path $release 'deploy.sh'
$serverText = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'deploy-crm-ui-server.sh')).Replace("`r`n", "`n")
[IO.File]::WriteAllText($serverScript, $serverText, [Text.UTF8Encoding]::new($false))

# These are the verified destination bases; committing local changes must not change them.
$manifest = @{
  frontendHead = 'b46b30fb49c8bbb644e281e43ed5291b522253da'
  backendHead = 'd0b8772af3076c7aa4e5854412a583fadeabc455'
  frontendFiles = $files
}
[IO.File]::WriteAllText((Join-Path $payload 'manifest.json'), ($manifest | ConvertTo-Json -Depth 4), [Text.UTF8Encoding]::new($false))
$archive = Join-Path $release 'source.tar.gz'
Invoke-Checked 'tar.exe' @('-czf',$archive,'-C',$payload,'frontend','patches','manifest.json')
$sourceHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Output "Prepared UI package: $archive"
Write-Output "SHA256: $sourceHash"
if ($PrepareOnly) { return }

# No service changes until the new builds pass and the fresh backup is on this PC.
Write-Output 'Uploading the UI package, then building in staging. This can take several minutes.'
Invoke-Checked 'ssh.exe' ($sshOptions + @($server,"test ! -e '$remote' && install -d -m 700 '$remote'"))
Invoke-Checked 'scp.exe' ($sshOptions + @($archive,"${server}:$remote/source.tar.gz"))
Invoke-Checked 'scp.exe' ($sshOptions + @($serverScript,"${server}:$remote/deploy.sh"))
$preparedOutput = & ssh.exe @sshOptions $server "bash '$remote/deploy.sh' prepare '$id' '$sourceHash'"
if ($LASTEXITCODE -ne 0) { throw "Server preparation failed. Services have not been switched. See $remote/prepare.log" }
$backup = ($preparedOutput -join "`n") | ConvertFrom-Json

# Full private backup includes customer data and application credentials.
$pcBackup = Join-Path $env:USERPROFILE "Downloads\CRM-Backup-UI-$id"
New-Item -ItemType Directory -Path $pcBackup | Out-Null
$backupFile = Join-Path $pcBackup 'crm-before-ui.tar.gz'
Invoke-Checked 'scp.exe' ($sshOptions + @("${server}:$remote/backup.tar.gz",$backupFile))
$pcHash = (Get-FileHash -LiteralPath $backupFile -Algorithm SHA256).Hash.ToLowerInvariant()
if ($pcHash -ne $backup.sha256) { throw 'PC backup checksum differs. Deployment stopped before switching services.' }
[IO.File]::WriteAllText((Join-Path $pcBackup 'SHA256.txt'), "$pcHash  crm-before-ui.tar.gz`r`n")
Write-Output "Fresh backup verified on this PC: $backupFile"

Invoke-Checked 'ssh.exe' ($sshOptions + @($server,"bash '$remote/deploy.sh' apply '$id' '$pcHash'"))
Write-Output 'CRM dashboard/chart release completed: https://crm.kimcommunication.id'
Write-Output "Backup: $backupFile"
