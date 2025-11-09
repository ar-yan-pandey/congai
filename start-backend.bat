@echo off
echo ========================================
echo  CongestionAI Backend Startup
echo ========================================
echo.

cd backend

echo Checking for virtual environment...
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Checking for trained model...
if not exist "models\model.pkl" (
    echo No model found. Running complete setup...
    python run.py
) else (
    echo Model found. Starting API server...
    echo.
    echo API available at: http://localhost:8000
    echo API docs at: http://localhost:8000/docs
    echo.
    echo Press Ctrl+C to stop
    echo.
    uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
)

pause
