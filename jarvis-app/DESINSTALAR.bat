@echo off
chcp 65001 >nul
title Desinstalar JARVIS
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" | Where-Object { $_.CommandLine -like '*ok-jarvis.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
del /q "%USERPROFILE%\Desktop\JARVIS.lnk" 2>nul
powershell -NoProfile -Command "Remove-Item ([Environment]::GetFolderPath('Desktop') + '\JARVIS.lnk'), ([Environment]::GetFolderPath('Programs') + '\JARVIS.lnk'), ([Environment]::GetFolderPath('Startup') + '\ok-jarvis.lnk'), ([Environment]::GetFolderPath('Desktop') + '\JARVIS Homem de Ferro.lnk'), ([Environment]::GetFolderPath('Programs') + '\JARVIS Homem de Ferro.lnk'), ([Environment]::GetFolderPath('Startup') + '\jarvis-cerebro.lnk') -ErrorAction SilentlyContinue"
echo JARVIS removido (atalhos e escuta do "ok Jarvis").
echo A pasta %LOCALAPPDATA%\JARVIS pode ser apagada manualmente.
pause
