@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
start "" http://localhost:8081
call npx expo start --web --port 8081
