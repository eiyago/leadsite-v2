@echo off
rem abre o JARVIS numa janela própria, direto no painel, já falando a saudação (sem precisar clicar)
powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0cerebro.ps1"
set "URL=https://eiyago.github.io/leadsite-v2/jarvis.html"
set "FLAGS=--autoplay-policy=no-user-gesture-required --app=%URL%"
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" %FLAGS% & exit /b)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" %FLAGS% & exit /b)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" %FLAGS% & exit /b)
start "" %URL%
