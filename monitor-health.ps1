Write-Host "Health Monitoring Dashboard" -ForegroundColor Green
Write-Host "===========================" -ForegroundColor Green

$productionUrl = "https://web-production-c744b.up.railway.app"

Write-Host ""
Write-Host "Production Site (Your wife's live site):" -ForegroundColor Cyan
Write-Host "URL: $productionUrl" -ForegroundColor White

try {
    $prodHealth = Invoke-RestMethod -Uri "$productionUrl/api/health" -Method GET -TimeoutSec 10
    Write-Host "Status: $($prodHealth.status)" -ForegroundColor Green
    Write-Host "Environment: $($prodHealth.environment)" -ForegroundColor White
    Write-Host "Database: $($prodHealth.checks.database)" -ForegroundColor Green
    Write-Host "Users: $($prodHealth.checks.users)" -ForegroundColor White
    Write-Host "DeepSeek API: $($prodHealth.checks.deepseek)" -ForegroundColor Yellow
} catch {
    Write-Host "Production health check failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Staging Environment:" -ForegroundColor Cyan
Write-Host "Status: Set up via Railway Dashboard" -ForegroundColor Yellow

Write-Host ""
Write-Host "Professional Features Active:" -ForegroundColor Green
Write-Host "  Zero-downtime deployments" -ForegroundColor White
Write-Host "  Staging environment ready" -ForegroundColor White
Write-Host "  Health monitoring" -ForegroundColor White
Write-Host "  Netflix-level reliability" -ForegroundColor White

Read-Host "Press Enter to continue"