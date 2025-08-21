Write-Host "Chat History Upload Script" -ForegroundColor Green

$username = Read-Host "Enter admin username"
$password = Read-Host "Enter admin password"

Write-Host "Getting authentication token..."

$loginBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "https://web-production-c744b.up.railway.app/api/login" -Method POST -Body $loginBody -ContentType "application/json"
    
    $token = $loginResponse.token
    Write-Host "Authentication successful!" -ForegroundColor Green

    Write-Host "Uploading LINE chat history..."
    
    $headers = @{
        'Authorization' = "Bearer $token"
        'Content-Type' = 'application/json'
    }
    
    $lineData = Get-Content "C:\Users\chanc\line-upload-fixed.json" -Raw
    $uploadResponse = Invoke-RestMethod -Uri "https://web-production-c744b.up.railway.app/api/ai/upload-chat-history" -Method POST -Body $lineData -Headers $headers
    
    Write-Host "Upload successful!" -ForegroundColor Green
    Write-Host "Processed: $($uploadResponse.processed) messages"
    Write-Host "Message: $($uploadResponse.message)"
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "Press Enter to continue"