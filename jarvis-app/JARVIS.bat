@echo off
rem abre o app JARVIS numa janela própria (sem barra do navegador)
set "URL=https://eiyago.github.io/leadsite-v2/jarvis.html"
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%URL% & exit /b)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=%URL% & exit /b)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=%URL% & exit /b)
start "" %URL%
