param(
  [string]$Message = ""
)

if ($Message -eq "") {
  $Message = "deploy: $(Get-Date -Format yyyy-MM-dd_HH:mm:ss)"
}

if (!(Test-Path ".git")) {
  Write-Error "Diretório atual não parece ser um repositório git. Abortando."
  exit 1
}

$status = git status --porcelain

if ([string]::IsNullOrWhiteSpace($status)) {
  Write-Output "Nada para commitar. Executando 'git push'..."
  git push
  exit $LASTEXITCODE
} else {
  Write-Output "Mudanças detectadas. Fazendo add/commit/push..."
  git add -A
  git commit -m "$Message"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha no commit. Verifique se há conflitos ou mensagens do git."
    exit $LASTEXITCODE
  }
  git push
  exit $LASTEXITCODE
}
