@echo off
setlocal
cd /d "%~dp0"

set "MODE=%~1"
if "%MODE%"=="" set "MODE=both"

if /I "%MODE%"=="help" (
  set "USAGE_EXIT=0"
  goto :usage
)
if /I "%MODE%"=="all" set "MODE=both"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then run this again.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)

if /I "%MODE%"=="both" goto :both
if /I "%MODE%"=="vu" goto :vu
if /I "%MODE%"=="spectrum" goto :spectrum
if /I "%MODE%"=="web" goto :web
if /I "%MODE%"=="browser" goto :browser
if /I "%MODE%"=="demo" goto :demo
set "USAGE_EXIT=1"
goto :usage

:both
call :start_vu_bridge
call :start_spectrum_bridge
goto :start_web

:vu
call :start_vu_bridge
goto :start_web

:spectrum
call :start_spectrum_bridge
goto :start_web

:web
goto :start_web

:browser
call :start_web_server
goto :start_browser_app

:demo
start "iCUE dummy levels (3748)" node levels-server.js
goto :start_web

:start_vu_bridge
start "iCUE VU bridge (3748)" /D "%CD%\widgets\VU Meter Onkyo - Manny" node audio-server.js
exit /b

:start_spectrum_bridge
start "iCUE Spectrum bridge (3749)" /D "%CD%\widgets\SpectrumAnalyzer-v1.0.1 1" node "spectrum-server 2.js"
exit /b

:start_web
goto :start_electron_app

:start_web_server
start "iCUE web (8080)" node web-server.js
timeout /t 1 >nul
exit /b

:start_electron_app
if exist "%CD%\node_modules\electron\dist\electron.exe" (
  if exist "%CD%\scripts\start-electron.js" (
    start "iCUE Electron app" /D "%CD%" node scripts\start-electron.js "%CD%"
    exit /b
  )
)

echo Electron was not found under node_modules.
echo To enable Electron mode, close apps watching this repo and run this from the project root:
echo   npm install
echo Falling back to Chrome app mode.
call :start_web_server
goto :start_browser_app

:start_browser_app
@REM start "" http://127.0.0.1:8080/
start "" "chrome.exe" --app="http://127.0.0.1:8080/"
exit /b

:usage
if "%USAGE_EXIT%"=="" set "USAGE_EXIT=1"
echo Usage: run-all.bat [both^|vu^|spectrum^|web^|browser^|demo]
echo.
echo   both      Start VU bridge on 3748, Spectrum bridge on 3749, and Electron UI.
echo   vu        Start only the VU bridge and Electron UI.
echo   spectrum  Start only the Spectrum bridge and Electron UI.
echo   web       Start only the Electron UI.
echo   browser   Start the web UI in Chrome app mode.
echo   demo      Start the Node dummy levels server on 3748 and Electron UI.
echo.
pause
exit /b %USAGE_EXIT%
