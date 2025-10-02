# Simple SmartEdify Stack Starter
Write-Host "🚀 Starting SmartEdify Full Stack..." -ForegroundColor Green

# Check Docker
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is available" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Build and start services
Write-Host "🔨 Building and starting services..." -ForegroundColor Yellow

try {
    docker-compose -f docker-compose.full-stack.yml up -d --build
    Write-Host "✅ Services started successfully!" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "📊 Service URLs:" -ForegroundColor Cyan
    Write-Host "  • Identity Service:    http://localhost:3001/health"
    Write-Host "  • Tenancy Service:     http://localhost:3003/health"  
    Write-Host "  • Finance Service:     http://localhost:3007/health"
    Write-Host "  • Compliance Service:  http://localhost:3012/health"
    Write-Host "  • Reservation Service: http://localhost:3013/health"
    Write-Host "  • Embeddings Service:  http://localhost:8091/health"
    
    Write-Host ""
    Write-Host "🔧 Management:" -ForegroundColor Yellow
    Write-Host "  • View logs: docker-compose -f docker-compose.full-stack.yml logs -f"
    Write-Host "  • Stop all:  docker-compose -f docker-compose.full-stack.yml down"
}
catch {
    Write-Host "❌ Failed to start services: $($_.Exception.Message)" -ForegroundColor Red
    docker-compose -f docker-compose.full-stack.yml logs --tail=20
}