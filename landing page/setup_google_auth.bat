@echo off
echo Setting up Google Authentication for SellSync
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo 📦 Running setup script...
python setup_google_auth.py

echo.
echo 🔍 Running configuration check...
python check_google_config.py

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Edit the .env file with your actual Google Client ID
echo 2. Start your Flask server: python contact_server.py
echo 3. Test the Google login on your login page
echo.
pause@echo off
echo Setting up Google Authentication for SellSync
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo 📦 Running setup script...
python setup_google_auth.py

echo.
echo 🔍 Running configuration check...
python check_google_config.py

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Edit the .env file with your actual Google Client ID
echo 2. Start your Flask server: python contact_server.py
echo 3. Test the Google login on your login page
echo.
pause