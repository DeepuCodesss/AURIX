@echo off
setlocal
cls

echo ============================================
echo   PhantomShield X -- Device Agent Installer
echo ============================================
echo.

REM ── Check Python ──────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed.
    echo Please install Python from https://python.org and re-run.
    pause
    exit /b 1
)

echo [OK] Python found.
echo.

REM ── Install dependencies ──────────────────────
echo [~] Installing required packages...
pip install psutil httpx --quiet --upgrade
echo [OK] Packages installed.
echo.

REM ── Download agent.py if not present ─────────
if not exist "agent.py" (
    echo [~] Downloading agent.py from server...
    REM Replace this URL with your actual backend URL after deployment
    curl -L "https://raw.githubusercontent.com/DeepuCodesss/PhantomShield-x/main/agent.py" -o agent.py
    if %errorlevel% neq 0 (
        echo [ERROR] Could not download agent.py
        echo Please manually place agent.py in this folder.
        pause
        exit /b 1
    )
    echo [OK] agent.py downloaded.
)

echo.
echo ============================================
echo   Starting PhantomShield X Agent...
echo   Press Ctrl+C anytime to stop.
echo ============================================
echo.

REM ── Run the agent ─────────────────────────────
REM Set your deployed URLs (no trailing slash):
set "PHANTOMSHIELD_SERVER=https://YOUR-BACKEND-URL.example"
set "PHANTOMSHIELD_DASHBOARD_URL=https://YOUR-FRONTEND-URL.example"
python agent.py

pause
