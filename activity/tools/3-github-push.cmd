@echo off
rem Turn the project folder into a Git repository and push it to GitHub. Summary saved to activity\tools\last-github.log
cd /d "%~dp0..\.."
where git >nul 2>&1 || (echo Git for Windows is not installed. Install it from https://git-scm.com/download/win and run this again. & pause & exit /b 1)
if not exist .git (git init -b main) else (echo .git already exists - reusing it)
for /f "delims=" %%A in ('git config user.name') do set GNAME=%%A
if not defined GNAME (git config user.name "yanamikko873")
for /f "delims=" %%A in ('git config user.email') do set GMAIL=%%A
if not defined GMAIL (git config user.email "yanamikko873@users.noreply.github.com")
git add -A
echo === files to commit ===
git status --short
> "%TEMP%\lolduo-msg.txt" echo Initial commit: LoL duo guide as a Discord Activity
>> "%TEMP%\lolduo-msg.txt" echo.
>> "%TEMP%\lolduo-msg.txt" echo Activity (Vite + Embedded App SDK) hosted on Cloudflare Workers,
>> "%TEMP%\lolduo-msg.txt" echo matchup data in data/master.json, legacy slash-command bot in legacy-bot/.
>> "%TEMP%\lolduo-msg.txt" echo.
>> "%TEMP%\lolduo-msg.txt" echo Co-Authored-By: Claude Opus 5.5 ^<noreply@anthropic.com^>
>> "%TEMP%\lolduo-msg.txt" echo Claude-Session: https://claude.ai/code/session_01UzJyZn7GNzqsnEQyFq98Yu
git rev-parse --verify HEAD >nul 2>&1 || git commit -q -F "%TEMP%\lolduo-msg.txt"
git remote get-url origin >nul 2>&1 || git remote add origin https://github.com/yanamikko873/lol-duo-bot.git
echo === push to GitHub: if a sign-in window opens, sign in to GitHub and allow ===
git push -u origin main
> activity\tools\last-github.log 2>&1 (
  echo === status ===
  git status -sb
  echo === last commit ===
  git log --oneline -1
  echo === remote ===
  git remote -v
  git ls-remote origin
  echo === tracked file count ===
  git ls-files | find /c /v ""
)
type activity\tools\last-github.log
echo.
echo DONE. This window can be closed.
pause
