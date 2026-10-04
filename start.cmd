@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
set "ANFIELD_EXIT_CODE=%ERRORLEVEL%"
if not "%ANFIELD_EXIT_CODE%"=="0" (
    echo.
    echo The service did not start. See the message above.
    pause
)
exit /b %ANFIELD_EXIT_CODE%
