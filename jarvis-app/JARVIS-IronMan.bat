@echo off
rem JARVIS Homem de Ferro: liga o cerebro (Claude Code, so leitura) + a interface holografica e abre numa janela propria.
rem O JARVIS do LeadSite (eiyago.github.io) tambem passa a usar esse cerebro enquanto esta janela estiver aberta.
set "PASTA=Y:\jarvis-ironman"
if not exist "%PASTA%\package.json" (echo Nao achei %PASTA%. & pause & exit /b)
set "JARVIS_ALLOWED_ORIGINS=https://eiyago.github.io"
set "JARVIS_EFFORT=medium"
powershell -NoProfile -Command "try { iwr http://localhost:8787/health -UseBasicParsing -TimeoutSec 2 ^| Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (start "JARVIS - cerebro (nao feche)" /min cmd /c "cd /d %PASTA% && npm start")
powershell -NoProfile -Command "for($i=0;$i -lt 30;$i++){ try { iwr http://localhost:5173 -UseBasicParsing -TimeoutSec 2 ^| Out-Null; break } catch { Start-Sleep 1 } }"
set "URL=http://localhost:5173"
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%URL% & exit /b)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=%URL% & exit /b)
start "" %URL%
