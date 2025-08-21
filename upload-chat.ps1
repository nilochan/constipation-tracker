Write-Host "🚀 Chat History Upload Script" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Get credentials
$username = Read-Host "Enter admin username"
$password = Read-Host "Enter admin password" -AsSecureString
$passwordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host ""
Write-Host "🔐 Getting authentication token..." -ForegroundColor Yellow

try {
    # Login to get token
    $loginBody = @{
        username = $username
        password = $passwordText
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "https://constipation-tracker-production.up.railway.app/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "✅ Authentication successful!" -ForegroundColor Green
    Write-Host ""

    # Upload LINE chat
    Write-Host "📤 Uploading LINE chat history (29,560 messages)..." -ForegroundColor Yellow
    
    $headers = @{
        'Authorization' = "Bearer $token"
        'Content-Type' = 'application/json'
    }
    
    $lineData = Get-Content "C:\Users\chanc\line-upload-fixed.json" -Raw
    $uploadResponse = Invoke-RestMethod -Uri "https://constipation-tracker-production.up.railway.app/api/ai/upload-chat-history" -Method POST -Body $lineData -Headers $headers
    
    Write-Host "✅ LINE upload successful!" -ForegroundColor Green
    Write-Host "📊 Results:" -ForegroundColor Cyan
    Write-Host "   - Processed: $($uploadResponse.processed) messages" -ForegroundColor White
    Write-Host "   - Skipped: $($uploadResponse.skipped) messages" -ForegroundColor White
    Write-Host "   - Message: $($uploadResponse.message)" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Your LINE chat history is now uploaded and ready for DeepSeek analysis!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseText = $reader.ReadToEnd()
        Write-Host "Response: $responseText" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Press any key to continue..."
Read-Host