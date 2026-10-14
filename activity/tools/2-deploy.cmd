@echo off
rem Install packages, run tests, log in to Cloudflare, build and publish. Logs: tools\last-install.log, tools\last-deploy.log
cd /d "%~dp0.."
echo === 1/4 npm install (download packages) ===
call npm install > tools\last-install.log 2>&1
if errorlevel 1 (type tools\last-install.log & echo INSTALL FAILED & pause & exit /b 1)
echo === 2/4 npm test ===
call npm test >> tools\last-install.log 2>&1
if errorlevel 1 (type tools\last-install.log & echo TEST FAILED & pause & exit /b 1)
echo tests OK
echo === 3/4 Cloudflare login: approve in the browser window that opens ===
call npx wrangler login
echo === 4/4 build and publish ===
call npm run deploy > tools\last-deploy.log 2>&1
type tools\last-deploy.log
echo.
echo DONE. This window can be closed.
pause
