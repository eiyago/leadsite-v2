# Cérebro do JARVIS: o Claude Code rodando escondido (só leitura) para o JARVIS conversar sobre qualquer assunto.
# Não abre janela nem interface própria; o seu JARVIS (site/app) fala com ele em ws://localhost:8787.
$PASTA = 'Y:\jarvis-ironman'
if (-not (Test-Path "$PASTA\bridge\server.mjs")) { exit }
try { Invoke-WebRequest http://localhost:8787/health -UseBasicParsing -TimeoutSec 2 | Out-Null; exit } catch { }
# chaves opcionais (ex.: ELEVENLABS_API_KEY=... para a voz do JARVIS do filme), uma por linha, em Y:\jarvis-ironman\.env.jarvis
$arq = "$PASTA\.env.jarvis"
if (Test-Path $arq) {
  Get-Content $arq | Where-Object { $_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$' } | ForEach-Object {
    if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$') { Set-Item -Path "Env:$($Matches[1])" -Value $Matches[2].Trim('"') }
  }
}
$env:JARVIS_ALLOWED_ORIGINS = 'https://eiyago.github.io'
$env:JARVIS_EFFORT = 'medium'
$env:JARVIS_DISABLE = 'interface'
Start-Process -FilePath 'node' -ArgumentList 'bridge/server.mjs' -WorkingDirectory $PASTA -WindowStyle Hidden
