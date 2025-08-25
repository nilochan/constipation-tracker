Write-Host "Batch Upload of LINE Chat History" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Login first
# Replace with your actual credentials
$loginData = @{
    username = "YOUR_USERNAME"
    password = "YOUR_PASSWORD"
} | ConvertTo-Json

Write-Host "Logging in..." -ForegroundColor Yellow
$loginResponse = Invoke-RestMethod -Uri "https://web-production-c744b.up.railway.app/api/login" -Method POST -Body $loginData -ContentType "application/json"
$token = $loginResponse.token
Write-Host "Login successful!" -ForegroundColor Green

# Load the LINE chat data
Write-Host "Loading LINE chat data..." -ForegroundColor Yellow
$lineData = Get-Content "C:\Users\chanc\line-upload-fixed.json" | ConvertFrom-Json
$allMessages = $lineData.chatHistory
Write-Host "Total messages to upload: $($allMessages.Count)" -ForegroundColor Cyan

# Upload in batches
$batchSize = 500  # Smaller batches to avoid timeouts
$totalBatches = [Math]::Ceiling($allMessages.Count / $batchSize)
$totalProcessed = 0

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

for ($i = 0; $i -lt $totalBatches; $i++) {
    $startIdx = $i * $batchSize
    $endIdx = [Math]::Min(($i + 1) * $batchSize - 1, $allMessages.Count - 1)
    $batch = $allMessages[$startIdx..$endIdx]
    
    $batchData = @{
        source = "line"
        chatHistory = $batch
    } | ConvertTo-Json -Depth 3
    
    Write-Host "Uploading batch $($i + 1)/$totalBatches ($($batch.Count) messages)..." -ForegroundColor Yellow
    
    try {
        $result = Invoke-RestMethod -Uri "https://web-production-c744b.up.railway.app/api/ai/upload-chat-history" -Method POST -Body $batchData -Headers $headers
        $totalProcessed += $result.processed
        Write-Host "  ✅ Batch $($i + 1) successful: $($result.processed) processed" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Batch $($i + 1) failed: $($_.Exception.Message)" -ForegroundColor Red
        break
    }
    
    # Small delay between batches
    Start-Sleep -Milliseconds 100
}

Write-Host ""
Write-Host "🎉 Upload Complete!" -ForegroundColor Green
Write-Host "Total messages processed: $totalProcessed" -ForegroundColor Cyan
Write-Host "Your LINE chat history is now ready for DeepSeek analysis!" -ForegroundColor Green

Read-Host "Press Enter to continue"