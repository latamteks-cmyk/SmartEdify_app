# SmartEdify Full Stack Startup Script
param(
    [switch]$Build = $false,
    [switch]$Monitoring = $false,
    [switch]$LLM = $false,
    [switch]$Stop = $false,
    [switch]$Logs = $false,
    [string]$Service = ""
)

$ErrorActionPreference = "Stop"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

Write-Host "🚀 SmartEdify Full Stack Manager" -ForegroundColor Blue
Write-Host "=================================" -ForegroundColor Blue
Write-Host ""

# Check Docker
try {
    docker --version | Out-Null
    docker-compose --version | Out-Null
    Write-Success "Docker and Docker Compose are available"
}
catch {
    Write-Error "Docker or Docker Compose not found. Please install Docker Desktop."
    exit 1
}

# Stop services if requested
if ($Stop) {
    Write-Status "Stopping SmartEdify services..."
    
    try {
        docker-compose -f docker-compose.full-stack.yml down --remove-orphans
        Write-Success "All services stopped successfully"
    }
    catch {
        Write-Error "Failed to stop services: $($_.Exception.Message)"
    }
    
    return
}

# Show logs if requested
if ($Logs) {
    if ($Service) {
        Write-Status "Showing logs for service: $Service"
        docker-compose -f docker-compose.full-stack.yml logs -f $Service
    }
    else {
        Write-Status "Showing logs for all services..."
        docker-compose -f docker-compose.full-stack.yml logs -f
    }
    return
}

# Build images if requested
if ($Build) {
    Write-Status "Building Docker images..."
    
    try {
        docker-compose -f docker-compose.full-stack.yml build --no-cache
        Write-Success "All images built successfully"
    }
    catch {
        Write-Error "Failed to build images: $($_.Exception.Message)"
        exit 1
    }
}

# Prepare profiles
$profiles = @()
if ($Monitoring) {
    $profiles += "monitoring"
    Write-Status "Including monitoring services (Prometheus, Grafana)"
}
if ($LLM) {
    $profiles += "llm"
    Write-Status "Including LLM services (Llama.cpp)"
}

# Start services
Write-Status "Starting SmartEdify full stack..."

try {
    $composeArgs = @("-f", "docker-compose.full-stack.yml", "up", "-d")
    
    if ($profiles.Count -gt 0) {
        $composeArgs += "--profile"
        $composeArgs += ($profiles -join ",")
    }
    
    & docker-compose @composeArgs
    
    Write-Success "Services started successfully!"
    Write-Host ""
    
    # Wait for services to be ready
    Write-Status "Waiting for services to be ready..."
    Start-Sleep -Seconds 30
    
    # Check service health
    Write-Status "Checking service health..."
    
    $services = @(
        @{ Name = "PostgreSQL"; Port = 5432; Type = "database" },
        @{ Name = "Redis"; Port = 6379; Type = "cache" },
        @{ Name = "Identity Service"; Port = 3001; Type = "api" },
        @{ Name = "Tenancy Service"; Port = 3003; Type = "api" },
        @{ Name = "Finance Service"; Port = 3007; Type = "api" },
        @{ Name = "Compliance Service"; Port = 3012; Type = "api" },
        @{ Name = "Embeddings Service"; Port = 8091; Type = "api" }
    )
    
    $healthyCount = 0
    
    foreach ($service in $services) {
        if ($service.Type -eq "api") {
            try {
                $response = Invoke-RestMethod -Uri "http://localhost:$($service.Port)/health" -TimeoutSec 5 -ErrorAction Stop
                if ($response.status -eq "ok") {
                    Write-Success "$($service.Name) is healthy"
                    $healthyCount++
                }
                else {
                    Write-Warning "$($service.Name) responded but not healthy"
                }
            }
            catch {
                Write-Warning "$($service.Name) is not responding"
            }
        }
        else {
            # For database services, just check if port is open
            try {
                $tcpClient = New-Object System.Net.Sockets.TcpClient
                $tcpClient.Connect("localhost", $service.Port)
                $tcpClient.Close()
                Write-Success "$($service.Name) is running"
                $healthyCount++
            }
            catch {
                Write-Warning "$($service.Name) is not accessible"
            }
        }
    }
    
    Write-Host ""
    Write-Status "Health check results: $healthyCount/$($services.Count) services healthy"
    
    # Show service URLs
    Write-Host ""
    Write-Success "🎉 SmartEdify Full Stack is running!"
    Write-Host ""
    Write-Host "📊 Service URLs:" -ForegroundColor Yellow
    Write-Host "  • Identity Service:    http://localhost:3001/health"
    Write-Host "  • Tenancy Service:     http://localhost:3003/health"
    Write-Host "  • Finance Service:     http://localhost:3007/health"
    Write-Host "  • Compliance Service:  http://localhost:3012/health"
    Write-Host "  • Embeddings Service:  http://localhost:8091/health"
    
    if ($Monitoring) {
        Write-Host ""
        Write-Host "📈 Monitoring URLs:" -ForegroundColor Yellow
        Write-Host "  • Prometheus:          http://localhost:9090"
        Write-Host "  • Grafana:             http://localhost:3000 (admin/admin)"
    }
    
    Write-Host ""
    Write-Host "🔧 Management Commands:" -ForegroundColor Yellow
    Write-Host "  • View logs:           .\scripts\start-full-stack.ps1 -Logs"
    Write-Host "  • View service logs:   .\scripts\start-full-stack.ps1 -Logs -Service finance-service"
    Write-Host "  • Stop all services:   .\scripts\start-full-stack.ps1 -Stop"
    Write-Host "  • Rebuild images:      .\scripts\start-full-stack.ps1 -Build"
    
    Write-Host ""
    Write-Host "🧪 Next Steps:" -ForegroundColor Green
    Write-Host "  1. Run E2E tests:      npm run test:e2e"
    Write-Host "  2. Test Finance API:   http://localhost:3007/api/docs"
    Write-Host "  3. Test full flow:     .\scripts\test-complete-flow.ps1"
    
}
catch {
    Write-Error "Failed to start services: $($_.Exception.Message)"
    Write-Host ""
    Write-Status "Checking Docker Compose logs..."
    docker-compose -f docker-compose.full-stack.yml logs --tail=50
    exit 1
}