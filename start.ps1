# PowerShell launcher for MyPDF Studio
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "      Starting MyPDF Studio (Personal PDF Suite)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Start Backend
Write-Host "`n[1/2] Starting Python FastAPI Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\backend'; & '.\.venv\Scripts\Activate.ps1'; uvicorn main:app --reload --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 2

# 2. Start Frontend
Write-Host "[2/2] Starting React Vite Frontend on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir\frontend'; npm run dev"

Start-Sleep -Seconds 2

Write-Host "`nMyPDF Studio is live!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend:  http://127.0.0.1:8000" -ForegroundColor Green

Start-Process "http://localhost:5173"
