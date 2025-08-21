@echo off
echo 🚀 Chat History Upload Script
echo ================================

REM Get admin credentials
set /p username="Enter admin username: "
set /p password="Enter admin password: "

echo.
echo 🔐 Getting authentication token...

REM Get auth token (using PowerShell for JSON handling)
for /f "delims=" %%i in ('powershell -Command "try { $response = Invoke-RestMethod -Uri 'https://constipation-tracker-production.up.railway.app/api/auth/login' -Method POST -Body (@{username='%username%';password='%password%'} | ConvertTo-Json) -ContentType 'application/json'; $response.token } catch { 'ERROR: ' + $_.Exception.Message }"') do set token=%%i

if "%token:~0,6%"=="ERROR:" (
    echo ❌ Login failed: %token%
    pause
    exit /b 1
)

if "%token%"=="" (
    echo ❌ Failed to get authentication token
    pause
    exit /b 1
)

echo ✅ Authentication successful!
echo.

REM Upload LINE chat first (smaller file)
echo 📤 Uploading LINE chat history...
powershell -Command "try { $headers = @{'Authorization'='Bearer %token%'; 'Content-Type'='application/json'}; $response = Invoke-RestMethod -Uri 'https://constipation-tracker-production.up.railway.app/api/ai/upload-chat-history' -Method POST -InFile 'C:\Users\chanc\line-upload-fixed.json' -Headers $headers; Write-Host '✅ LINE upload successful:'; $response | ConvertTo-Json -Depth 3 } catch { Write-Host '❌ LINE upload failed:' $_.Exception.Message }"

echo.
echo 📋 Upload complete! Check your tracker admin panel.
pause