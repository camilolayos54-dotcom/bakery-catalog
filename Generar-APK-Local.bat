@echo off
title Generar APK RELEASE (local) - Panaderia
cd /d "%~dp0android"
echo ====================================================
echo   APK RELEASE: lleva el codigo DENTRO, funciona sin PC
echo ====================================================
echo.
echo IMPORTANTE: no uses app-debug.apk para instalar en el celular.
echo El APK debug busca un servidor en tu PC y se queda cargando.
echo.
echo Esto tarda varios minutos la primera vez...
echo.
if "%ANDROID_HOME%"=="" set ANDROID_HOME=C:\Android
set NODE_ENV=production
call gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
if errorlevel 1 (
    echo.
    echo Fallo la compilacion. Revisa los mensajes de arriba.
    pause
    exit /b 1
)
copy /Y "app\build\outputs\apk\release\app-release.apk" "%~dp0Panaderia-release.apk" >nul
echo.
echo LISTO: %~dp0Panaderia-release.apk
echo Envialo por WhatsApp o USB e instalalo en el celular.
pause
