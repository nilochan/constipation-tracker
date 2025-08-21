@echo off
echo ==========================================
echo 🧪 Deploy to Staging (Safe Testing)
echo ==========================================

cd /d "C:\Users\chanc\constipation-tracker-deploy"

echo Switching to staging branch...
git checkout staging

echo Adding all changes...
git add .

set /p msg="Enter commit message (or press Enter for default): "
if "%msg%"=="" set msg="Update staging for testing"

echo Committing changes...
git commit -m "%msg%"

echo Deploying to staging environment...
git push origin staging

echo.
echo ✅ DEPLOYED TO STAGING!
echo ======================
echo.
echo 🧪 Test your changes on the staging URL
echo 📝 When everything works perfectly:
echo    → Run deploy-production.bat
echo.
echo 🎯 This keeps your wife's site safe!
echo.
pause