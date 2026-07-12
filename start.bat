@echo off
REM Double-click this file. Leave the window open while you edit art.
cd /d "%~dp0"
echo Paper Squadron — http://127.0.0.1:8080/
echo Leave this window open. Swap PNGs in /assets, then refresh the browser.
where node >nul 2>nul
if %ERRORLEVEL%==0 (
  node scripts\dev-server.js
) else (
  python -m http.server 8080 --bind 127.0.0.1
)
pause
