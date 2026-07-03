@echo off
chcp 65001 >nul
echo ==============================================
echo Iniciando o PRO Finances (Versão Definitiva)...
echo ==============================================
echo.
cd /d "C:\Users\Davi Ramos\Documents\PRO FINANCES"
start http://localhost:4005
npm run dev
pause
