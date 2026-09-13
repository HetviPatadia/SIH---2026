@echo off
title SIH26102 - Launch Public Backend & Tunnel
echo ====================================================================
echo Starting SIH26102 Backend and Public Cloudflare Tunnel
echo ====================================================================

cd /d "%~dp0"

set "PYTHON_EXE=C:\Users\Administrator\AppData\Local\Programs\Python\Python311\python.exe"
set "CLOUDFLARED_EXE=C:\Program Files (x86)\cloudflared\cloudflared.exe"

echo 1. Starting FastAPI Server in background...
start /b "" "%PYTHON_EXE%" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

timeout /t 2 >nul

echo 2. Launching Cloudflare Public Tunnel in background...
start /b "" "%CLOUDFLARED_EXE%" tunnel --url http://localhost:8000

echo 3. Retrieving your live public URL...
"%PYTHON_EXE%" get_tunnel_url.py

echo.
echo ====================================================================
echo Keep this window open so your team can access the server!
echo (To stop the server, simply close this window)
echo ====================================================================
pause
