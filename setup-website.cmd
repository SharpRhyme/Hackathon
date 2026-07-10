@echo off
setlocal
cd /d "%~dp0"

echo Installing Python packages...
python -m pip install -r requirements.txt
if errorlevel 1 exit /b 1

echo.
echo Installing frontend packages...
pushd frontend
call npm install
if errorlevel 1 exit /b 1
popd

echo.
echo Setup complete. Run start-website.cmd to launch the site.
