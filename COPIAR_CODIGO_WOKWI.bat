@echo off
chcp 65001 >nul
title Atualizar Wokwi com Zero Delay — Vinheria Agnello

echo ================================================================
echo   VINHERIA AGNELLO — ATUALIZADOR AUTOMÁTICO DO WOKWI (ZERO DELAY)
echo ================================================================
echo.
echo [1/3] Copiando o sketch.ino otimizado para o seu teclado (Ctrl+V)...
type "%~dp0sketch.ino" | clip
echo [OK] Código copiado para a Área de Transferência com sucesso!
echo.
echo [2/3] Abrindo o Wokwi oficial no seu navegador...
start "" "https://wokwi.com/projects/478106752109243393"
echo.
echo ================================================================
echo   AGORA NA JANELA DO WOKWI QUE ACABOU DE ABRIR:
echo ================================================================
echo   1. Clique com o mouse dentro do texto do código (aba sketch.ino)
echo   2. Pressione no teclado: Ctrl + A  (selecionar tudo)
echo   3. Pressione no teclado: Ctrl + V  (colar o código novo)
echo   4. Clique no botão "Save" (ou Ctrl + S) e depois no "Play" (verde)
echo ================================================================
echo.
echo Pronto! O Wokwi e o Dashboard estarão sincronizados com ZERO DELAY!
echo.
pause
