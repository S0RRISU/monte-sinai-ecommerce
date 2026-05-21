param(
  [switch]$ImageEditorsOnly,
  [switch]$SkipImageEditors
)

$ErrorActionPreference = 'Stop'

function Install-WingetPackage([string]$Id, [string]$Name) {
  Write-Host "Verificando $Name..." -ForegroundColor Cyan
  $args = @(
    'install',
    '--id',
    $Id,
    '--exact',
    '--accept-package-agreements',
    '--accept-source-agreements',
    '--disable-interactivity'
  )

  Write-Host "Instalando/atualizando $Name..." -ForegroundColor Cyan
  winget @args
}

$winget = Get-Command winget -ErrorAction SilentlyContinue
if (-not $winget) {
  throw "winget nao encontrado. Instale os aplicativos manualmente ou atualize o Instalador de Aplicativos da Microsoft Store."
}

if (-not $ImageEditorsOnly) {
  Install-WingetPackage -Id 'Python.Python.3.12' -Name 'Python 3.12'
  Install-WingetPackage -Id 'Git.Git' -Name 'Git'
  Install-WingetPackage -Id 'OpenJS.NodeJS.LTS' -Name 'Node.js LTS'
}

if (-not $SkipImageEditors) {
  Install-WingetPackage -Id 'GIMP.GIMP' -Name 'GIMP'
  Install-WingetPackage -Id 'KDE.Krita' -Name 'Krita'
  Install-WingetPackage -Id 'Inkscape.Inkscape' -Name 'Inkscape'
}

Write-Host "Ferramentas verificadas." -ForegroundColor Green
