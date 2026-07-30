@echo off
echo Starting Backend on port 8000...
start cmd /k "python -m uvicorn app.main:app --port 8000 --reload"

echo Starting Frontend on port 3000...
start cmd /k "cd Frontend && npm run dev"

echo Both services are starting in separate windows!
