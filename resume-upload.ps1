Write-Host "Resume LINE Chat Upload (Starting from where we left off)" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green

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
Write-Host "Total messages in file: $($allMessages.Count)" -ForegroundColor Cyan

# Resume from batch 101 (where it failed)
$batchSize = 50
$startBatch = 100  # Start from batch 101 (0-indexed, so 100)
$totalBatches = [Math]::Ceiling($allMessages.Count / $batchSize)
$totalProcessed = 4936  # Messages already processed

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

Write-Host "Resuming from batch $($startBatch + 1)/$totalBatches" -ForegroundColor Cyan
Write-Host "Already processed: $totalProcessed messages" -ForegroundColor Cyan
Write-Host "Using 2-second delays to avoid rate limiting" -ForegroundColor Yellow
Write-Host ""

for ($i = $startBatch; $i -lt $totalBatches; $i++) {
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
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
        }
        
        Write-Host "  ❌ Batch $($i + 1) failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "    Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 429) {
            Write-Host "    Rate limited - waiting 10 seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds 10
            # Retry this batch
            $i = $i - 1
            continue
        } elseif ($statusCode -eq 500) {
            Write-Host "    Server error - continuing with next batch..." -ForegroundColor Yellow
            continue
        } else {
            break
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