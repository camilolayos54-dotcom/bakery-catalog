@echo off
title Catalogo Panaderia - Servidor Local
cd /d "%~dp0"
echo ====================================================
echo           CATALOGO DE PANADERIA
echo ====================================================
echo.

if not exist node_modules (
    echo [1/3] Instalando dependencias necesarias...
    call npm install
) else (
    echo [1/3] Dependencias verificadas.
)

echo [2/3] Abriendo el catalogo en tu navegador...
start "" http://localhost:8081

echo [3/3] Iniciando el servidor Expo...
echo.
echo Presiona Ctrl+C en esta ventana para detener el servidor cuando termines.
echo.
call npx expo start --web --port 8081

if %errorlevel% neq 0 (
    echo.
    echo ----------------------------------------------------
    echo Nota: Si el puerto 8081 ya estaba ocupado, abre directamente:
    echo http://localhost:8081
    echo ----------------------------------------------------
    pause
)
