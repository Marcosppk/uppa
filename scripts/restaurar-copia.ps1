# Volta o banco da UPPA para uma cópia de segurança (precisa de administrador no PC do servidor).
# Uso:  .\restaurar-copia.ps1 uppa-auto-2026-11-05_030000.db
# Antes de trocar, guarda o banco atual como "uppa-antes-<data>.db" na mesma pasta, para poder desfazer.
param([Parameter(Mandatory = $true)][string]$Copia)
$ErrorActionPreference = 'Stop'
$pasta = 'C:\UPPA\dados\copias'
$banco = 'C:\UPPA\dados\uppa.db'
$servico = 'C:\UPPA\servico\UPPA-Servidor.exe'

$origem = if (Test-Path -LiteralPath $Copia) { (Resolve-Path -LiteralPath $Copia).Path } else { Join-Path $pasta $Copia }
if (-not (Test-Path -LiteralPath $origem)) { throw "Cópia não encontrada: $origem" }

Start-Transcript -Path C:\UPPA\logs\restaurar.txt -Force | Out-Null
try {
  & $servico stop
  Start-Sleep -Seconds 3
  $carimbo = Get-Date -Format 'yyyy-MM-dd_HHmmss'
  $antes = Join-Path $pasta "uppa-antes-$carimbo.db"
  foreach ($fim in '', '-wal', '-shm') {
    if (Test-Path -LiteralPath "$banco$fim") { Copy-Item -LiteralPath "$banco$fim" -Destination "$antes$fim" }
  }
  Remove-Item -LiteralPath "$banco-wal", "$banco-shm" -ErrorAction SilentlyContinue
  Copy-Item -LiteralPath $origem -Destination $banco -Force
  "Restaurado de: $origem"
  "Banco anterior guardado em: $antes"
} finally {
  & $servico start
  Start-Sleep -Seconds 3
  Get-Service UPPA-Servidor | Format-Table Name, Status
  Stop-Transcript | Out-Null
}
