param(
  [string]$SiteId = ""
)

$ErrorActionPreference = 'Stop'

if ($SiteId -eq "") {
  $SiteId = $env:NETLIFY_SITE_ID
}

if ([string]::IsNullOrWhiteSpace($SiteId)) {
  Write-Error "NETLIFY_SITE_ID nao definido. Configure a variavel de ambiente NETLIFY_SITE_ID ou passe como parametro."
  exit 1
}

function Invoke-NetlifyDeploy {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,

    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  Write-Output "Executando: $Command $($Arguments -join ' ')"
  & $Command @Arguments
  return $LASTEXITCODE
}

$netlifyCommand = Get-Command netlify.cmd -ErrorAction SilentlyContinue
if (-not $netlifyCommand) {
  $netlifyCommand = Get-Command netlify -ErrorAction SilentlyContinue
}

if ($netlifyCommand) {
  $exitCode = Invoke-NetlifyDeploy -Command $netlifyCommand.Source -Arguments @(
    'deploy',
    '--dir',
    '.',
    '--prod',
    '--site',
    $SiteId
  )
} else {
  $npxCommand = Get-Command npx.cmd -ErrorAction SilentlyContinue
  if (-not $npxCommand) {
    $npxCommand = Get-Command npx -ErrorAction SilentlyContinue
  }

  if (-not $npxCommand) {
    Write-Error "Netlify CLI e npx nao encontrados. Instale Node.js ou rode: npm install -g netlify-cli"
    exit 1
  }

  Write-Output "Netlify CLI nao encontrado globalmente. Usando npx (pode demorar na primeira execucao)..."
  $exitCode = Invoke-NetlifyDeploy -Command $npxCommand.Source -Arguments @(
    '--yes',
    'netlify-cli',
    'deploy',
    '--dir',
    '.',
    '--prod',
    '--site',
    $SiteId
  )
}

exit $exitCode
