# Coloca no ar uma versão guardada em C:\UPPA\versoes (usado ao publicar e para VOLTAR a uma versão anterior).
# Uso:  powershell -ExecutionPolicy Bypass -File C:\UPPA\servico\ativar-versao.ps1 1.4.0
# Os dados (C:\UPPA\dados) não mudam; o banco só ganha colunas novas, então uma versão anterior continua lendo.
param([Parameter(Mandatory = $true)][string]$Versao)
$ErrorActionPreference = 'Stop'
$origem = "C:\UPPA\versoes\$Versao"
$app = 'C:\UPPA\app'
if (-not (Test-Path -LiteralPath "$origem\package.json")) {
  $tem = (Get-ChildItem C:\UPPA\versoes -Directory -ErrorAction SilentlyContinue | ForEach-Object Name) -join ', '
  throw "Versão $Versao não encontrada. Guardadas: $tem"
}

$hashNovo = (Get-FileHash -LiteralPath "$origem\package-lock.json").Hash
$hashAtual = if (Test-Path -LiteralPath "$app\package-lock.json") { (Get-FileHash -LiteralPath "$app\package-lock.json").Hash } else { '' }

foreach ($pasta in 'server', 'shared', 'dist') {
  robocopy "$origem\$pasta" "$app\$pasta" /MIR /NJH /NJS /NP /NFL /NDL | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Falha ao copiar $pasta." }
}
foreach ($arq in 'package.json', 'package-lock.json', 'LEIA-ME.md', 'CHANGELOG.md') {
  if (Test-Path -LiteralPath "$origem\$arq") { Copy-Item -LiteralPath "$origem\$arq" -Destination $app -Force }
}
# Bibliotecas mudaram entre as versões: reinstala só as de produção.
if ($hashNovo -ne $hashAtual) {
  Push-Location $app
  try {
    npm ci --omit=dev
    if ($LASTEXITCODE) { throw 'A instalação das bibliotecas falhou.' }
  } finally { Pop-Location }
}
Set-Content -LiteralPath 'C:\UPPA\versoes\atual.txt' -Value $Versao -Encoding utf8

# Reiniciar o serviço precisa de administrador (aparece a confirmação do Windows).
Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'C:\UPPA\servico\reiniciar.ps1'
"Versão $Versao no ar."
