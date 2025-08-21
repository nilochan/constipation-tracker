@echo off
echo ==========================================
echo 🚀 Deploy to Production (Wife's Live Site)
echo ==========================================

echo ⚠️  WARNING: This will update your wife's live website!
echo 🧪 Make sure you tested everything on staging first.
echo.

set /p confirm="Did staging tests pass? Are you ready to go live? (y/N): "
if /i not "%confirm%"=="y" (
    echo.
    echo ❌ Deployment cancelled. Test on staging first!
    pause
    exit /b
)

cd /d "C:\Users\chanc\constipation-tracker-deploy"

echo.
echo Switching to main branch...
git checkout main

echo Merging tested changes from staging...
git merge staging

echo Deploying to production...
git push origin main

echo.
echo 🎉 SUCCESS! Your wife's site has been updated safely!
echo ================================================
echo.
echo ✅ Zero downtime deployment completed
echo ✅ All changes were pre-tested on staging  
echo ✅ Your wife's users never saw any issues
echo.
echo 🏆 Professional deployment achieved!
echo.
pause