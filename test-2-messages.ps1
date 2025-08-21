Write-Host "Testing with 2 real messages from LINE data..." -ForegroundColor Yellow

# Login
$loginData = @{
    username = "Nilo"
    password = "Zxcvbnm1!"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "https://web-production-c744b.up.railway.app/api/login" -Method POST -Body $loginData -ContentType "application/json"
$token = $loginResponse.token

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

# Load real LINE data and take just first 2 messages
$lineData = Get-Content "C:\Users\chanc\line-upload-fixed.json" | ConvertFrom-Json
$firstTwoMessages = $lineData.chatHistory[0..1]

Write-Host "First two messages:" -ForegroundColor Cyan
$firstTwoMessages | ConvertTo-Json -Depth 3

$testData = @{
    source = "line"
    chatHistory = $firstTwoMessages
} | ConvertTo-Json -Depth 3

Write-Host "Testing with 2 real messages..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "https://web-production-c744b.up.railway.app/api/ai/upload-chat-history" -Method POST -Body $testData -Headers $headers
    Write-Host "Success with 2 messages!" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Failed with 2 messages:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseText = $reader.ReadToEnd()
        Write-Host "Response: $responseText" -ForegroundColor Red
    }
}

Read-Host "Press Enter to continue"