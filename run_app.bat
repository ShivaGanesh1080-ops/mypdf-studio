@echo off
echo ========================================================
echo       Starting MyPDF Studio (Personal PDF Suite)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Python FastAPI Backend on port 8000...
start "MyPDF Backend" cmd /k "cd backend && .\.venv\Scripts\activate && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Starting React Vite Frontend on port 5173...
start "MyPDF Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ========================================================
echo MyPDF Studio is launching!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo ========================================================
echo Opening browser...
start http://localhost:5173
