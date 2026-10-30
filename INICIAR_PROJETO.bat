@echo off
chcp 65001 >nul
title Vinheria Agnello CP5 - Monitoramento Global IoT (Site + Wokwi + API)
echo ============================================================================
echo   CHECK POINT 5 - VINHERIA AGNELLO (INICIALIZACAO AUTOMATICA)
echo   Site Local:   http://127.0.0.1:8050/dashboard.html
echo   Site Nuvem:   https://ninixzzs.github.io/vinheria-agnello-cp5-nicolly-vilela/dashboard.html
echo   Wokwi ESP32:  https://wokwi.com/projects/478106752109243393
echo ============================================================================
echo.

cd /d "%~dp0"

:: 1. Abre os links oficiais no navegador imediatamente
echo [1/2] Abrindo Dashboard e Simulador Wokwi no navegador...
start "" "https://ninixzzs.github.io/vinheria-agnello-cp5-nicolly-vilela/dashboard.html"
start "" "https://wokwi.com/projects/478106752109243393"
start "" "%~dp0dashboard.html"

:: 2. Identifica o runtime do servidor local (Node.js ou Python)
set "NODE_EXE="
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_EXE=C:\Program Files\nodejs\node.exe"
) else (
    where node >nul 2>&1
    if not errorlevel 1 set "NODE_EXE=node"
)

if not "%NODE_EXE%"=="" (
    echo [2/2] Iniciando Servidor Local de Alta Performance via Node.js (Porta 8050)...
    echo Servidor ativo! Deixe esta janela aberta durante a apresentacao.
    "%NODE_EXE%" server.js
    pause
    exit /b 0
)

:: Se Node nao estiver disponivel, tenta Python
where python.exe >nul 2>&1
if not errorlevel 1 (
    echo [2/2] Iniciando Servidor Local via Python Dash (Porta 8050)...
    cd /d "%~dp0dashboard"
    python app.py
    pause
    exit /b 0
)

echo [OK] O dashboard foi aberto diretamente no navegador via HTML5 e GitHub Pages.
pause
