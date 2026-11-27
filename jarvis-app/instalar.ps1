# Instala o app JARVIS: atalhos (área de trabalho + menu Iniciar) e "ok Jarvis" ao iniciar o Windows
$ErrorActionPreference = 'Stop'
$ORIGEM = Split-Path -Parent $MyInvocation.MyCommand.Path
$DEST = Join-Path $env:LOCALAPPDATA 'JARVIS'
$URL = 'https://eiyago.github.io/leadsite-v2/jarvis.html'
New-Item -ItemType Directory -Force $DEST | Out-Null
foreach ($f in 'ok-jarvis.ps1', 'JARVIS.bat', 'jarvis.ico', 'DESINSTALAR.bat', 'LEIA-ME.txt') { Copy-Item (Join-Path $ORIGEM $f) $DEST -Force }

$ws = New-Object -ComObject WScript.Shell
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
foreach ($pasta in [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs')) {
  $s = $ws.CreateShortcut((Join-Path $pasta 'JARVIS.lnk'))
  if ($edge) { $s.TargetPath = $edge; $s.Arguments = "--app=$URL" } else { $s.TargetPath = Join-Path $DEST 'JARVIS.bat' }
  $s.IconLocation = Join-Path $DEST 'jarvis.ico'; $s.Description = 'J.A.R.V.I.S.'; $s.Save()
}
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
