Write-Host "Database Debug - Check if chat_history table exists" -ForegroundColor Yellow

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

# Try to test with an empty chat history array to see what error we get
$emptyTest = @{
    source = "line"
    chatHistory = @()
} | ConvertTo-Json -Depth 3

Write-Host "Testing with empty chat history to debug..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "https://web-production-c744b.up.railway.app/api/ai/upload-chat-history" -Method POST -Body $emptyTest -Headers $headers
    Write-Host "Empty test result:" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error with empty test:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseText = $reader.ReadToEnd()
        Write-Host "Response: $responseText" -ForegroundColor Red
    }
}

Read-Host "Press Enter to continue"