# PowerShell script to recreate PostgreSQL database with UTF-8 encoding
# This fixes the error: "character with byte sequence 0xe2 0xae 0x91 in encoding UTF8 has no equivalent in encoding WIN1252"

Write-Host "⚠️  WARNING: This will DELETE all database data!" -ForegroundColor Yellow
$confirmation = Read-Host "Press Ctrl+C to cancel, or Enter to continue"

Write-Host "🛑 Stopping containers..." -ForegroundColor Cyan
docker-compose down

Write-Host "🗑️  Removing PostgreSQL volume..." -ForegroundColor Cyan
docker volume rm shopenup_stage_shopenup-postgres-data 2>$null
if ($LASTEXITCODE -ne 0) {
    docker volume rm shopenup-postgres-data 2>$null
}

Write-Host "🚀 Starting PostgreSQL with UTF-8 encoding..." -ForegroundColor Cyan
docker-compose up -d postgres

Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "✅ Database recreated with UTF-8 encoding!" -ForegroundColor Green
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Run migrations: npm run build && npx shopenup migrations run"
Write-Host "   2. Restart backend: npm run dev"

