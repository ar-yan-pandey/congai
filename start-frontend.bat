@echo off
echo ========================================
echo  CongestionAI Frontend Startup
echo ========================================
echo.

cd frontend

echo Checking for node_modules...
if not exist "node_modules\" (
    echo Installing dependencies...
    npm install
)

echo.
echo Checking for environment file...
if not exist ".env.local" (
    echo Creating .env.local from example...
    copy .env.local.example .env.local
    echo.
    echo IMPORTANT: Edit .env.local and set NEXT_PUBLIC_API_URL
    echo Default is http://localhost:8000
    echo.
    pause
)

echo.
echo Starting Next.js development server...
echo.
echo Frontend available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop
echo.

npm run dev

pause
