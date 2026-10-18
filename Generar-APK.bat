@echo off
title Generar APK Android - Panaderia
cd /d "%~dp0"
echo ====================================================
echo         GENERADOR DE APK PARA CELULAR ANDROID
echo ====================================================
echo.
echo Este proceso compila el APK instalable en la nube de Expo (EAS).
echo Si es la primera vez, te solicitara iniciar sesion con tu cuenta gratuita de https://expo.dev
echo.
echo Al terminar, te dara un enlace de descarga y un codigo QR para tu celular.
echo.
pause
call npx eas-cli build -p android --profile preview
echo.
echo ====================================================
echo Proceso finalizado. Abre el link resultante en tu celular para instalar el APK.
echo ====================================================
pause
