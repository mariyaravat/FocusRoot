@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
    echo Python 3 is required. Install Python, then run this file again.
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    echo Creating the FocusRoot Python environment...
    python -m venv .venv
    if errorlevel 1 goto :failed
)

set "PYTHON=.venv\Scripts\python.exe"
echo Installing or checking FocusRoot dependencies...
"%PYTHON%" -m pip install -r requirements.txt
if errorlevel 1 goto :failed

echo Preparing the SQLite database...
"%PYTHON%" manage.py migrate
if errorlevel 1 goto :failed

start "FocusRoot Django server" cmd /k ""%CD%\.venv\Scripts\python.exe" "%CD%\manage.py" runserver 127.0.0.1:8000"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:8000/"
exit /b 0

:failed
echo FocusRoot could not start. Check the message above, then try again.
pause
exit /b 1
