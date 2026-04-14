@echo off
REM Start the FastAPI backend on Windows
REM Run from the project root: start_backend.bat

cd /d "%~dp0"

echo === Sarkari Jobs Backend ===

python setup_db.py
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Could not set up database. Is PostgreSQL running?
    pause
    exit /b 1
)

echo.
echo Starting FastAPI on http://localhost:8000
echo Docs: http://localhost:8000/docs
echo.

cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
