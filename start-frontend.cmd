@echo off
setlocal
cd /d "%~dp0frontend"

if not exist "node_modules" (
  echo Frontend packages are missing. Installing them now...
  call npm install
  if errorlevel 1 exit /b 1
)

echo Starting website on http://localhost:5173
npm run dev -- --host 127.0.0.1
