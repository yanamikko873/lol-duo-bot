@echo off
rem Install packages and run tests. Output is also saved to tools\last-install.log
cd /d "%~dp0.."
echo === npm install ===
call npm install > tools\last-install.log 2>&1
type tools\last-install.log
echo === npm test ===
call npm test >> tools\last-install.log 2>&1
type tools\last-install.log | findstr /C:"Tests" /C:"FAIL" /C:"passed" /C:"failed"
echo.
echo DONE. This window can be closed.
pause
