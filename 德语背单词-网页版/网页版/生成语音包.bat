@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo   Generate German audio pack (TTS)
echo   Tip: turn ON your VPN / proxy first
echo ==========================================
echo.
node "%~dp0gen-audio.js"
echo.
pause