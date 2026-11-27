# Instala o app JARVIS: atalhos (área de trabalho + menu Iniciar) e "ok Jarvis" ao iniciar o Windows
$ErrorActionPreference = 'Stop'
$ORIGEM = Split-Path -Parent $MyInvocation.MyCommand.Path
$DEST = Join-Path $env:LOCALAPPDATA 'JARVIS'
$URL = 'https://eiyago.github.io/leadsite-v2/jarvis.html'
New-Item -ItemType Directory -Force $DEST | Out-Null
foreach ($f in 'ok-jarvis.ps1', 'cerebro.ps1', 'JARVIS.bat', 'jarvis.ico', 'DESINSTALAR.bat', 'LEIA-ME.txt') { Copy-Item (Join-Path $ORIGEM $f) $DEST -Force }
Remove-Item (Join-Path $DEST 'JARVIS-IronMan.bat') -ErrorAction SilentlyContinue

$ws = New-Object -ComObject WScript.Shell
foreach ($pasta in [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs')) {
  # um app só: o atalho liga o cérebro escondido e abre o JARVIS direto no painel, já falando
  $s = $ws.CreateShortcut((Join-Path $pasta 'JARVIS.lnk'))
  $s.TargetPath = Join-Path $DEST 'JARVIS.bat'; $s.WorkingDirectory = $DEST; $s.WindowStyle = 7
  $s.IconLocation = Join-Path $DEST 'jarvis.ico'; $s.Description = 'J.A.R.V.I.S.'; $s.Save()
  Remove-Item (Join-Path $pasta 'JARVIS Homem de Ferro.lnk') -ErrorAction SilentlyContinue
}
# cérebro (Claude Code) liga junto com o Windows, escondido
$b = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) 'jarvis-cerebro.lnk'))
$b.TargetPath = 'powershell.exe'
$b.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$(Join-Path $DEST 'cerebro.ps1')`""
$b.IconLocation = Join-Path $DEST 'jarvis.ico'; $b.WindowStyle = 7; $b.Save()
$o = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) 'ok-jarvis.lnk'))
$o.TargetPath = 'powershell.exe'
$o.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$(Join-Path $DEST 'ok-jarvis.ps1')`""
$o.IconLocation = Join-Path $DEST 'jarvis.ico'; $o.WindowStyle = 7; $o.Save()

# deixa o app conversar com o Ollama (IA local opcional)
[Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', 'https://eiyago.github.io,http://localhost:*', 'User')

# liga a escuta agora (se já não estiver rodando)
$rodando = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*ok-jarvis.ps1*' }
if (-not $rodando) { Start-Process powershell.exe -WindowStyle Hidden -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$(Join-Path $DEST 'ok-jarvis.ps1')`"" }
Write-Host ''
Write-Host '  [ok] Atalho JARVIS criado na área de trabalho e no menu Iniciar.' -ForegroundColor Cyan
Write-Host '  [ok] "ok Jarvis" inicia junto com o Windows e já está ouvindo.' -ForegroundColor Cyan
Write-Host ''
