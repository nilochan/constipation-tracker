Write-Host "Testing chat upload with single message..." -ForegroundColor Yellow

# Create test data
$smallTest = @{
    source = "line"
    chatHistory = @(
        @{
            sender = "nilo chan"
            message = "Test message"
            timestamp = "2024-08-21T12:00:00Z"
        }
    )
} | ConvertTo-Json -Depth 3

# Login
$loginData = @{
    username = "Nilo"
    password = "Zxcvbnm1!"
} | ConvertTo-Json

Write-Host "Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "https://web-production-c744b.up.railway.app/api/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "Login successful! Token: $($token.Substring(0,20))..." -ForegroundColor Green
    
    # Upload test
    Write-Host "Testing upload..." -ForegroundColor Yellow
    $headers = @{
        'Authorization' = "Bearer $token"
        'Content-Type' = 'application/json'
    }
    
    $result = Invoke-RestMethod -Uri "https://web-production-c744b.up.railway.app/api/ai/upload-chat-history" -Method POST -Body $smallTest -Headers $headers
    Write-Host "Upload test successful!" -ForegroundColor Green
    Write-Host "Result:" -ForegroundColor Cyan
    $result | ConvertTo-Json -Depth 3
    
} catch {
    Write-Host "Error occurred:" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseText = $reader.ReadToEnd()
            Write-Host "Response Body: $responseText" -ForegroundColor Red
        } catch {
            Write-Host "Could not read response body" -ForegroundColor Red
        }
    }
}

Read-Host "Press Enter to continue"