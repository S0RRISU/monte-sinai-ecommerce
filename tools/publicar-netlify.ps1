param(
  [switch]$Preview,
  [string]$Message = "Publicacao pelo VS Code"
)

$ErrorActionPreference = 'Stop'

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Join-Path (Get-Location).Path 'tools') }
$root = (Resolve-Path (Join-Path $scriptRoot '..')).Path
$publishDir = Join-Path ([System.IO.Path]::GetTempPath()) 'monte-sinai-netlify-publish'

function Copy-PublishItem([string]$relativePath) {
  $source = Join-Path $root $relativePath
  if (-not (Test-Path -LiteralPath $source)) {
    Write-Warning "Ignorando item ausente: $relativePath"
    return
  }

  $destination = Join-Path $publishDir $relativePath
  $parent = Split-Path -Parent $destination
  if ($parent) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
}

function Find-NetlifyCommand {
  $netlify = Get-Command netlify -ErrorAction SilentlyContinue
  if ($netlify) {
    return @{
      Command = $netlify.Source
      Args = @()
    }
  }

  $npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
  if (-not $npx) {
    $npx = Get-Command npx -ErrorAction SilentlyContinue
  }
  if ($npx) {
    return @{
      Command = $npx.Source
      Args = @('--yes', 'netlify-cli')
    }
  }

  throw "Netlify CLI nao encontrado. Instale Node.js ou rode: npm install -g netlify-cli"
}

Write-Host "Preparando arquivos do site..." -ForegroundColor Cyan
if (Test-Path -LiteralPath $publishDir) {
  Remove-Item -LiteralPath $publishDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $publishDir | Out-Null

$items = @(
  'index.html',
  'pages',
  'css',
  'js',
  'assets',
  'sw.js',
  'site.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'netlify.toml'
)

foreach ($item in $items) {
  Copy-PublishItem $item
}

$mode = if ($Preview) { 'preview' } else { 'producao' }
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$deployMessage = "$Message - $timestamp"

$netlifyCommand = Find-NetlifyCommand
$deployArgs = @(
  'deploy',
  '--no-build',
  '--dir',
  $publishDir,
  '--message',
  $deployMessage
)

if (-not $Preview) {
  $deployArgs += '--prod'
}

Write-Host "Publicando no Netlify ($mode)..." -ForegroundColor Cyan
Write-Host "Pasta enviada: $publishDir"

Push-Location $root
try {
  & $netlifyCommand.Command @($netlifyCommand.Args + $deployArgs)
  if ($LASTEXITCODE -ne 0) {
    throw "Netlify CLI terminou com codigo $LASTEXITCODE."
  }
}
finally {
  Pop-Location
}

Write-Host "Publicacao finalizada." -ForegroundColor Green
