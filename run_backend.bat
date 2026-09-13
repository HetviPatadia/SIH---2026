@echo off
title SIH26102 - MPLADS AI Audit Intelligence Backend
echo ====================================================================
echo Starting SIH26102 MPLADS AI Audit Intelligence Backend
echo ====================================================================

cd /d "%~dp0"

set "PYTHON_EXE=C:\Users\Administrator\AppData\Local\Programs\Python\Python311\python.exe"

echo 1. Opening Dashboard in your browser...
start "" http://localhost:8000

echo 2. Launching FastAPI server on port 8000...
echo Keep this window open while testing!
echo ====================================================================

if exist "%PYTHON_EXE%" (
    "%PYTHON_EXE%" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
)

pause
