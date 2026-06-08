#Requires -Version 5.1
<#
.SYNOPSIS
  Slide Remote - automated installer for Windows.

.DESCRIPTION
  Clones the repo (if needed), installs dependencies, runs tests, and builds
  the phone web app. Optionally starts the server with -Start.

.PARAMETER Start
  Start the server after installing.

.PARAMETER Dir
  Install directory. Defaults to .\ppt-remote-controller.

.PARAMETER NoTest
  Skip running the test suite.

.EXAMPLE
  .\install.ps1
.EXAMPLE
  .\install.ps1 -Start
.EXAMPLE
  .\install.ps1 -Dir D:\apps\slide-remote
#>
[CmdletBinding()]
param(
  [switch]$Start,
  [string]$Dir = '',
  [switch]$NoTest,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

$RepoUrl       = 'https://github.com/msrishav-28/ppt-remote-controller.git'
$TargetDir     = 'ppt-remote-controller'
$MinNodeMajor  = 20

function Step($msg) { Write-Host ''; Write-Host "> $msg" -ForegroundColor Blue }
function Ok($msg)   { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }

if ($Help) {
  Get-Help $PSCommandPath -Detailed
  exit 0
}

Step 'Checking prerequisites'

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Fail 'git is not installed. Install from https://git-scm.com/download/win'
}
Ok ("git: " + (git --version))

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Fail 'Node.js is not installed. Install the LTS release from https://nodejs.org'
}
$nodeVersion = (& node --version).TrimStart('v')
$nodeMajor   = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt $MinNodeMajor) {
  Fail "Node.js v$nodeVersion found, but v$MinNodeMajor or newer is required. Upgrade from https://nodejs.org"
}
Ok "Node.js v$nodeVersion"

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Fail 'npm is not installed (it normally ships with Node.js).'
}
Ok ("npm v" + (& npm --version))

if (-not $Dir -or $Dir -eq '') {
  if ((Test-Path 'package.json') -and
      (Select-String -Path 'package.json' -Pattern '"name": "presentation-remote"' -Quiet -ErrorAction SilentlyContinue)) {
    $Dir = '.'
    Ok 'Found existing Slide Remote checkout in current directory'
  } else {
    $Dir = $TargetDir
  }
}

Step 'Fetching Slide Remote source'
if ($Dir -eq '.') {
  Ok 'Using current directory'
} elseif (Test-Path (Join-Path $Dir '.git')) {
  Ok "Repository already at $Dir - pulling latest"
  Push-Location $Dir
  try {
    & git pull --ff-only
    if ($LASTEXITCODE -ne 0) { Fail 'git pull failed.' }
  } finally { Pop-Location }
} else {
  & git clone $RepoUrl $Dir
  if ($LASTEXITCODE -ne 0) { Fail 'git clone failed.' }
  Ok "Cloned into $Dir"
}

Set-Location $Dir

Step 'Installing dependencies (compiles a native keyboard module - may take a few minutes)'
& npm install
if ($LASTEXITCODE -ne 0) {
  Fail "npm install failed. See docs/TROUBLESHOOTING.md -> 'npm install fails'."
}
Ok 'Dependencies installed'

if (-not $NoTest) {
  Step 'Running tests'
  & npm test
  if ($LASTEXITCODE -ne 0) { Fail 'Tests failed.' }
  Ok 'Tests passed'
}

Step 'Building the phone web app'
& npm run build
if ($LASTEXITCODE -ne 0) { Fail 'Build failed.' }
Ok 'Build complete'

Step 'Platform notes'
Warn 'Windows Firewall will prompt you on first run - allow Node.js on Private networks.'
Write-Host '    If you miss the prompt, add the rule manually in Windows Defender Firewall settings.'

Write-Host ''
Ok 'Slide Remote is ready.'
Write-Host ''
Write-Host 'Next steps:'
Write-Host "  cd $Dir; npm start" -ForegroundColor Blue
Write-Host '  Then scan the QR code or open the URL printed in the terminal on your phone.'
Write-Host ''
Write-Host 'Docs: README.md, docs/SETUP.md, docs/USAGE.md, docs/TROUBLESHOOTING.md'
Write-Host ''

if ($Start) {
  Step 'Starting the server'
  & npm start
}
