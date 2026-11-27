# Cérebro do JARVIS: o Claude Code rodando escondido (só leitura) para o JARVIS conversar sobre qualquer assunto.
# Não abre janela nem interface própria; o seu JARVIS (site/app) fala com ele em ws://localhost:8787.
$PASTA = 'Y:\jarvis-ironman'
if (-not (Test-Path "$PASTA\bridge\server.mjs")) { exit }
try { Invoke-WebRequest http://localhost:8787/health -UseBasicParsing -TimeoutSec 2 | Out-Null; exit } catch { }
$env:JARVIS_ALLOWED_ORIGINS = 'https://eiyago.github.io'
$env:JARVIS_EFFORT = 'medium'
$env:JARVIS_DISABLE = 'interface'
Start-Process -FilePath 'node' -ArgumentList 'bridge/server.mjs' -WorkingDirectory $PASTA -WindowStyle Hidden
