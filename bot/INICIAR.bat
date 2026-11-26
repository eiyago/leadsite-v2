@echo off
title LeadSite Robo
cd /d "%~dp0"
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles%\Git\cmd;%PATH%"
chcp 65001 >nul
if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install
)
if not exist .env (
  copy .env.example .env >nul
  echo.
  echo Preencha o arquivo .env ^(abri no Bloco de Notas^) e rode de novo.
  notepad .env
  pause
  exit /b
)
:loop
node src/index.js
echo.
echo O robo parou. Reiniciando em 15 segundos... (feche a janela para parar)
timeout /t 15 >nul
goto loop
