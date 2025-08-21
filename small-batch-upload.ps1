Write-Host "Small Batch Upload of LINE Chat History" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Login first
$loginData = @{
    username = "Nilo"
    password = "Zxcvbnm1!"
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

# Upload in very small batches
$batchSize = 50  # Much smaller batches
$totalBatches = [Math]::Ceiling($allMessages.Count / $batchSize)
$totalProcessed = 0

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

Write-Host "Using batch size: $batchSize messages per batch" -ForegroundColor Cyan
Write-Host "Total batches: $totalBatches" -ForegroundColor Cyan
Write-Host ""

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
        Write-Host "  ✅ Batch $($i + 1) successful: $($result.processed) processed, $($result.skipped) skipped" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Batch $($i + 1) failed: $($_.Exception.Message)" -ForegroundColor Red
        
        # Show more details for debugging
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "    Status Code: $statusCode" -ForegroundColor Red
            
            if ($statusCode -eq 500) {
                Write-Host "    This suggests a server processing issue with this specific batch." -ForegroundColor Red
                Write-Host "    Continuing with next batch..." -ForegroundColor Yellow
                continue
            } else {
                break
            }
        }
    }
    
    # Longer delay between batches to avoid rate limiting
    Start-Sleep -Seconds 2
    
    # Progress update every 10 batches
    if (($i + 1) % 10 -eq 0) {
        Write-Host "Progress: $($i + 1)/$totalBatches batches completed, $totalProcessed messages processed" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "🎉 Upload Complete!" -ForegroundColor Green
Write-Host "Total messages processed: $totalProcessed" -ForegroundColor Cyan
Write-Host "Your LINE chat history is now ready for DeepSeek analysis!" -ForegroundColor Green

Read-Host "Press Enter to continue"