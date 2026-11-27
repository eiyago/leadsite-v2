@echo off
chcp 65001 >nul
title Instalar JARVIS
echo.
echo   Instalando o app J.A.R.V.I.S. ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar.ps1"
echo   Pronto! Diga "ok Jarvis" ou abra o atalho JARVIS na area de trabalho.
echo   (Se aparecer um aviso sobre reconhecimento de fala, siga as instrucoes.)
echo.
pause
