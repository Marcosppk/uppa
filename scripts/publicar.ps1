# Publica no servidor da UPPA (C:\UPPA) a versão que está no package.json.
# Compila, guarda a versão em C:\UPPA\versoes\<versão> (para poder voltar depois) e ativa.
# Uso, na pasta do projeto:  powershell -ExecutionPolicy Bypass -File scripts\publicar.ps1
$ErrorActionPreference = 'Stop'
$projeto = Split-Path $PSScriptRoot -Parent
$versao = (Get-Content -LiteralPath "$projeto\package.json" -Raw | ConvertFrom-Json).version

Push-Location $projeto
try {
  npm run build
  if ($LASTEXITCODE) { throw 'A compilação falhou; nada foi publicado.' }
} finally { Pop-Location }

$destino = "C:\UPPA\versoes\$versao"
foreach ($pasta in 'server', 'shared', 'dist') {
  robocopy "$projeto\$pasta" "$destino\$pasta" /MIR /NJH /NJS /NP /NFL /NDL | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "Falha ao copiar $pasta." }
}
foreach ($arq in 'package.json', 'package-lock.json', 'LEIA-ME.md', 'CHANGELOG.md') {
  Copy-Item -LiteralPath "$projeto\$arq" -Destination $destino -Force
}
# Scripts de manutenção do servidor sempre na versão mais nova.
foreach ($arq in 'ativar-versao.ps1', 'restaurar-copia.ps1') {
  Copy-Item -LiteralPath "$PSScriptRoot\$arq" -Destination 'C:\UPPA\servico' -Force
}

& "$PSScriptRoot\ativar-versao.ps1" $versao
