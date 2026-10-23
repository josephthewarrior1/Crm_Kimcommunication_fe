param([switch]$PrepareOnly, [switch]$ConfigureEms)
$ErrorActionPreference = 'Stop'

# Published CRM main: dashboard/charts, Next.js security update, and EMS v2.
# EO Scout, TAGTOG, local credentials, and uncommitted files are excluded.
$repo = Split-Path -Parent $PSScriptRoot
$backendRepo = Join-Path (Split-Path -Parent $repo) 'Crm_Kimcommunication_be'
$frontendSource = '39c8bf84c04506801d3672ba1d95823e3337cfd9'
$backendSource = 'd93f41d49a5651522ec381177f2bc5fa81baf3e6'
$server = 'root@146.190.101.90'
$key = Join-Path $env:USERPROFILE '.ssh\id_ed25519'
$id = (Get-Date -Format 'yyyyMMddTHHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0, 6)
$release = Join-Path $repo "outputs\crm-main-release-$id"
$payload = Join-Path $release 'payload'
$remote = "/root/crm-main-release-$id"
$sshOptions = @('-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15','-i',$key)

function Invoke-Checked {
  param([string]$Program, [string[]]$Arguments)
  & $Program @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit $LASTEXITCODE)." }
}

function Export-Runtime {
  param([string]$Repository, [string]$Commit, [string]$Area, [string[]]$Candidates)
  $entries = @(& git -C $Repository ls-tree --name-only $Commit -- @Candidates)
  if ($LASTEXITCODE -ne 0 -or $entries.Count -eq 0) { throw "Cannot read published $Area runtime files." }
  $archivePath = Join-Path $release "$Area.tar"
  Invoke-Checked 'git' (@('-C',$Repository,'archive','--format=tar',"--prefix=$Area/","--output=$archivePath",$Commit,'--') + $entries)
  Invoke-Checked 'tar.exe' @('-xf',$archivePath,'-C',$payload)
  $areaRoot = Join-Path $payload $Area
  foreach ($file in Get-ChildItem -LiteralPath $areaRoot -Recurse -File) {
    if ($file.LinkType) { throw "Symlink runtime source refused: $($file.FullName)" }
    $relative = $file.FullName.Substring($areaRoot.Length + 1).Replace('\', '/')
    if ($relative -match '(?i)(^|/)(\.env(?:\.[^/]*)?|\.git|node_modules|outputs|uploads|preview|eo-scout)(/|$)|tagtog|(^|[/_-])eo(?:[-_]|bot|prospect|social)|HermesResearch') {
      throw "Excluded runtime path found: $Area/$relative"
    }
    $relative
  }
}

New-Item -ItemType Directory -Path $payload | Out-Null
$frontendFiles = @(Export-Runtime $repo $frontendSource 'frontend' @(
  'app','components','lib','public','styles','package.json','package-lock.json',
  'next.config.js','eslint.config.mjs','tsconfig.json','tailwind.config.js','postcss.config.js'
) | Sort-Object)
$backendFiles = @(Export-Runtime $backendRepo $backendSource 'backend' @(
  'src','pom.xml','Dockerfile','.dockerignore','.mvn','mvnw','mvnw.cmd'
) | Sort-Object)
$manifest = @{
  frontendSource = $frontendSource
  backendSource = $backendSource
  frontendBase = 'b46b30fb49c8bbb644e281e43ed5291b522253da'
  backendBase = 'd0b8772af3076c7aa4e5854412a583fadeabc455'
  frontendFiles = $frontendFiles
  backendFiles = $backendFiles
}
[IO.File]::WriteAllText((Join-Path $payload 'manifest.json'), ($manifest | ConvertTo-Json -Depth 4), [Text.UTF8Encoding]::new($false))

$serverScript = Join-Path $release 'deploy.sh'
$serverText = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'deploy-crm-main-server.sh')).Replace("`r`n", "`n")
[IO.File]::WriteAllText($serverScript, $serverText, [Text.UTF8Encoding]::new($false))
$emsExample = Join-Path $release 'ems-v2.env.example'
$exampleLines = & git -C $repo show "${frontendSource}:integrations/ems-v2/backend.env.example"
if ($LASTEXITCODE -ne 0) { throw 'Cannot read published EMS v2 environment template.' }
$exampleText = ($exampleLines -join "`n") + "`n# env_file uses format: raw. Enter literal values without surrounding quotes.`n"
[IO.File]::WriteAllText($emsExample, $exampleText, [Text.UTF8Encoding]::new($false))

$archive = Join-Path $release 'source.tar.gz'
Invoke-Checked 'tar.exe' @('-czf',$archive,'-C',$payload,'frontend','backend','manifest.json')
$sourceHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
Write-Output "Prepared CRM main package: $archive"
Write-Output "SHA256: $sourceHash"
if ($PrepareOnly) { return }

Write-Output 'Uploading the published CRM package. Services change only after builds and the PC backup pass.'
Invoke-Checked 'ssh.exe' ($sshOptions + @($server,"test ! -e '$remote' && install -d -m 700 '$remote'"))
Invoke-Checked 'scp.exe' ($sshOptions + @($archive,"${server}:$remote/source.tar.gz"))
Invoke-Checked 'scp.exe' ($sshOptions + @($serverScript,"${server}:$remote/deploy.sh"))
Invoke-Checked 'scp.exe' ($sshOptions + @($emsExample,"${server}:$remote/ems-v2.env.example"))
if ($ConfigureEms) {
  Invoke-Checked 'ssh.exe' ($sshOptions + @('-t',$server,"bash '$remote/deploy.sh' configure '$id' '$sourceHash'"))
}
$preparedOutput = & ssh.exe @sshOptions $server "bash '$remote/deploy.sh' prepare '$id' '$sourceHash'"
if ($LASTEXITCODE -ne 0) { throw "Server preparation failed before services were switched. See $remote/prepare.log" }
$backup = ($preparedOutput -join "`n") | ConvertFrom-Json

# Full private backup includes customer data and application credentials.
$pcBackup = Join-Path $env:USERPROFILE "Downloads\CRM-Backup-Main-$id"
New-Item -ItemType Directory -Path $pcBackup | Out-Null
$backupFile = Join-Path $pcBackup 'crm-before-main.tar.gz'
Invoke-Checked 'scp.exe' ($sshOptions + @("${server}:$remote/backup.tar.gz",$backupFile))
$pcHash = (Get-FileHash -LiteralPath $backupFile -Algorithm SHA256).Hash.ToLowerInvariant()
if ($pcHash -ne $backup.sha256) { throw 'PC backup checksum differs. Deployment stopped before switching services.' }
[IO.File]::WriteAllText((Join-Path $pcBackup 'SHA256.txt'), "$pcHash  crm-before-main.tar.gz`r`n")
Write-Output "Fresh backup verified on this PC: $backupFile"
Invoke-Checked 'ssh.exe' ($sshOptions + @($server,"bash '$remote/deploy.sh' apply '$id' '$pcHash'"))
Write-Output 'CRM main release completed: https://crm.kimcommunication.id'
Write-Output "Backup: $backupFile"
