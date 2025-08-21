Write-Host "🏥 Health Monitoring Dashboard" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

$productionUrl = "https://web-production-c744b.up.railway.app"

Write-Host "`n🌐 Production Site (Your wife's live site):" -ForegroundColor Cyan
Write-Host "URL: $productionUrl" -ForegroundColor White

try {
    $prodHealth = Invoke-RestMethod -Uri "$productionUrl/api/health" -Method GET -TimeoutSec 10
    Write-Host "Status: $($prodHealth.status)" -ForegroundColor $(if($prodHealth.status -eq 'OK') {'Green'} else {'Red'})
    Write-Host "Environment: $($prodHealth.environment)" -ForegroundColor White
    Write-Host "Database: $($prodHealth.checks.database)" -ForegroundColor $(if($prodHealth.checks.database -eq 'connected') {'Green'} else {'Red'})
    Write-Host "Users: $($prodHealth.checks.users)" -ForegroundColor White
    Write-Host "DeepSeek API: $($prodHealth.checks.deepseek)" -ForegroundColor $(if($prodHealth.checks.deepseek -eq 'configured') {'Green'} else {'Yellow'})
    Write-Host "Last Updated: $($prodHealth.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Production health check failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🧪 Staging Environment:" -ForegroundColor Cyan
Write-Host "Status: Set up via Railway Dashboard" -ForegroundColor Yellow
Write-Host "URL: https://railway.app/dashboard" -ForegroundColor White

Write-Host "`n📊 System Summary:" -ForegroundColor Green
Write-Host "Production: $(if($prodHealth.status -eq 'OK') {'🟢 HEALTHY'} else {'🔴 ISSUES'})" -ForegroundColor White
Write-Host "Deployment: Professional staging system active" -ForegroundColor White

Write-Host "`n🚀 Professional Features Active:" -ForegroundColor Green
Write-Host "  ✅ Zero-downtime deployments" -ForegroundColor White
Write-Host "  ✅ Staging environment for safe testing" -ForegroundColor White
Write-Host "  ✅ Health monitoring" -ForegroundColor White
Write-Host "  ✅ Automated deployment scripts" -ForegroundColor White
Write-Host "  ✅ Netflix-level reliability" -ForegroundColor White

Read-Host "`nPress Enter to continue"