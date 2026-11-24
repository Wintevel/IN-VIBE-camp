@echo off
rem Jipgepyo offline demo launcher. Double-click this file. Keep the black window open while demoing; close it to stop.
setlocal
cd /d "%~dp0"
title Jipgepyo offline demo
if not exist "%~dp0site\IN-VIBE-camp\index.html" (
  echo [ERROR] site folder not found. Extract the zip first, then run START.bat inside the extracted folder.
  pause
  exit /b 2
)
if exist "%~dp0server\jipgepyo-server.exe" (
  "%~dp0server\jipgepyo-server.exe" "%~dp0site"
  if not errorlevel 1 exit /b 0
  echo.
  echo [INFO] jipgepyo-server.exe could not run. Trying PowerShell server instead...
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server\server.ps1"
if errorlevel 1 pause
