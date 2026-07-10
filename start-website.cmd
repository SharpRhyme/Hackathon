@echo off
setlocal
cd /d "%~dp0"

echo Starting LearnDifferent...
echo Backend:  http://127.0.0.1:8000
echo Website:  http://localhost:5173
echo.

if not exist "frontend\node_modules" (
  echo Frontend packages are missing. Installing them now...
  pushd frontend
  call npm install
  if errorlevel 1 exit /b 1
  popd
)

start "LearnDifferent API" cmd /k "cd /d ""%~dp0"" && python -m uvicorn main:app --host 127.0.0.1 --port 8000"
start "LearnDifferent Website" cmd /k "cd /d ""%~dp0frontend"" && npm run dev -- --host 127.0.0.1"

timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"

echo Opened http://localhost:5173
echo Keep the two server windows open while using the site.
