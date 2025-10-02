# SmartEdify Complete Flow Testing Script (PowerShell)
# This script validates the entire ecosystem functionality

param(
    [switch]$RunE2E = $false,
    [switch]$StartServices = $false,
    [switch]$StopServices = $false
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Test-ServiceHealth {
    param(
        [string]$ServiceName,
        [int]$Port
    )
    
    $url = "http://localhost:$Port/health"
    Write-Status "Checking $ServiceName on port $Port..."
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($response.status -eq "ok") {
            Write-Success "$ServiceName is running"
            return $true
        }
    }
    catch {
        Write-Error "$ServiceName is not responding on port $Port"
        return $false
    }
    
    return $false
}

function Start-Services {
    Write-Status "Starting SmartEdify services..."
    
    # Check if Docker Compose is available
    try {
        docker-compose --version | Out-Null
        Write-Status "Starting services with Docker Compose..."
        
        docker-compose -f docker-compose.governance.yml up -d
        
        Write-Status "Waiting for services to be ready..."
        Start-Sleep -Seconds 30
        
        Write-Success "Services started successfully"
    }
    catch {
        Write-Warning "Docker Compose not found. Please start services manually:"
        Write-Host "  - Identity Service (port 3001)"
        Write-Host "  - User Profiles Service (port 3002)"
        Write-Host "  - Tenancy Service (port 3003)"
        Write-Host "  - Notifications Service (port 3005)"
        Write-Host "  - Documents Service (port 3006)"
        Write-Host "  - Finance Service (port 3007)"
        Write-Host "  - Governance Service (port 3011)"
        Write-Host "  - Compliance Service (port 3012)"
        Write-Host "  - Reservation Service (port 3013)"
        Write-Host "  - Streaming Service (port 3014)"
        Write-Host ""
        Read-Host "Press Enter when all services are running..."
    }
}

function Stop-Services {
    Write-Status "Stopping SmartEdify services..."
    
    try {
        docker-compose -f docker-compose.governance.yml down
        Write-Success "Services stopped successfully"
    }
    catch {
        Write-Warning "Failed to stop services with Docker Compose"
    }
}

function Test-HealthChecks {
    Write-Status "Performing health checks..."
    
    $services = @(
        @{ Name = "Identity"; Port = 3001 },
        @{ Name = "User-Profiles"; Port = 3002 },
        @{ Name = "Tenancy"; Port = 3003 },
        @{ Name = "Notifications"; Port = 3005 },
        @{ Name = "Documents"; Port = 3006 },
        @{ Name = "Finance"; Port = 3007 },
        @{ Name = "Governance"; Port = 3011 },
        @{ Name = "Compliance"; Port = 3012 },
        @{ Name = "Reservation"; Port = 3013 },
        @{ Name = "Streaming"; Port = 3014 }
    )
    
    $healthyCount = 0
    $totalCount = $services.Count
    
    foreach ($service in $services) {
        if (Test-ServiceHealth -ServiceName "$($service.Name) Service" -Port $service.Port) {
            $healthyCount++
        }
    }
    
    Write-Status "Health check results: $healthyCount/$totalCount services healthy"
    
    if ($healthyCount -eq $totalCount) {
        Write-Success "All services are healthy!"
        return $true
    }
    elseif ($healthyCount -ge 7) {
        Write-Warning "Most services are healthy. Proceeding with tests..."
        return $true
    }
    else {
        Write-Error "Too many services are down. Please check your setup."
        return $false
    }
}

function Test-BasicAPIs {
    Write-Status "Testing basic API endpoints..."
    
    # Test identity service
    Write-Status "Testing Identity Service..."
    if (Test-ServiceHealth -ServiceName "Identity" -Port 3001) {
        Write-Success "Identity Service API is responding"
    }
    
    # Test compliance service
    Write-Status "Testing Compliance Service..."
    if (Test-ServiceHealth -ServiceName "Compliance" -Port 3012) {
        Write-Success "Compliance Service API is responding"
    }
    
    # Test reservation service
    Write-Status "Testing Reservation Service..."
    if (Test-ServiceHealth -ServiceName "Reservation" -Port 3013) {
        Write-Success "Reservation Service API is responding"
    }
    
    # Test finance service
    Write-Status "Testing Finance Service..."
    if (Test-ServiceHealth -ServiceName "Finance" -Port 3007) {
        Write-Success "Finance Service API is responding"
    }
}

function Test-LLMCapabilities {
    Write-Status "Testing LLM capabilities..."
    
    # Check if Llama.cpp is running
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8089/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Success "Llama.cpp server is running"
    }
    catch {
        Write-Warning "Llama.cpp server is not running (LLM features will be mocked)"
    }
    
    # Check if embeddings service is running
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8091/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Success "Embeddings service is running"
    }
    catch {
        Write-Warning "Embeddings service is not running (will use mock embeddings)"
    }
}

function Test-WebAdmin {
    Write-Status "Testing Web Admin functionality..."
    
    # Check if web admin is running
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3100" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Success "Web Admin is accessible"
        
        # Test login page
        if ($response.Content -match "SmartEdify Admin") {
            Write-Success "Web Admin login page is working"
        }
        else {
            Write-Warning "Web Admin login page may have issues"
        }
    }
    catch {
        Write-Warning "Web Admin is not running. Start it with: cd apps/web-admin && npm run dev"
    }
}

function Invoke-E2ETests {
    Write-Status "Running E2E tests..."
    
    # Check if Node.js and npm are available
    try {
        node --version | Out-Null
        npm --version | Out-Null
    }
    catch {
        Write-Error "Node.js or npm is not installed. Please install Node.js 18+ to run tests."
        return $false
    }
    
    # Install test dependencies if needed
    if (-not (Test-Path "node_modules")) {
        Write-Status "Installing test dependencies..."
        npm install --only=dev
    }
    
    # Run the E2E tests
    Write-Status "Executing complete reservation flow tests..."
    
    try {
        npm run test:e2e -- tests/e2e/complete-reservation-flow.e2e.spec.ts
        Write-Success "E2E tests passed!"
        return $true
    }
    catch {
        Write-Error "E2E tests failed. Check the output above for details."
        return $false
    }
}

function New-TestReport {
    Write-Status "Generating test report..."
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $reportFile = "test-report-$timestamp.md"
    
    $reportContent = @"
# SmartEdify Test Report

**Date**: $(Get-Date)
**Environment**: Development
**Test Suite**: Complete Flow Validation

## Service Status

$(if (Test-ServiceHealth -ServiceName "Reservation" -Port 3013) { "✅ Reservation Service: Healthy" } else { "❌ Reservation Service: Down" })
$(if (Test-ServiceHealth -ServiceName "Compliance" -Port 3012) { "✅ Compliance Service: Healthy" } else { "❌ Compliance Service: Down" })
$(if (Test-ServiceHealth -ServiceName "Finance" -Port 3007) { "✅ Finance Service: Healthy" } else { "❌ Finance Service: Down" })
$(if (Test-ServiceHealth -ServiceName "Identity" -Port 3001) { "✅ Identity Service: Healthy" } else { "❌ Identity Service: Down" })

## Test Results

- **API Health Checks**: $(if (Test-ServiceHealth -ServiceName "Reservation" -Port 3013) { "PASSED" } else { "FAILED" })
- **LLM Integration**: $(try { Invoke-RestMethod -Uri "http://localhost:8089/health" -TimeoutSec 2 | Out-Null; "AVAILABLE" } catch { "MOCKED" })
- **Web Admin**: $(try { Invoke-WebRequest -Uri "http://localhost:3100" -TimeoutSec 2 | Out-Null; "RUNNING" } catch { "NOT_RUNNING" })

## Recommendations

1. Ensure all core services (Identity, Tenancy, Compliance, Reservation, Finance) are running
2. Start LLM services for full functionality testing
3. Launch Web Admin for UI testing
4. Run complete E2E test suite

---
*Generated by SmartEdify Test Suite*
"@
    
    $reportContent | Out-File -FilePath $reportFile -Encoding UTF8
    Write-Success "Test report generated: $reportFile"
}

# Main execution
function Main {
    Write-Host ""
    Write-Status "Starting SmartEdify ecosystem validation..."
    Write-Host ""
    
    # Handle command line parameters
    if ($StopServices) {
        Stop-Services
        return
    }
    
    if ($StartServices) {
        Start-Services
    }
    
    # Step 1: Health checks
    if (-not (Test-HealthChecks)) {
        Write-Error "Health checks failed. Starting services..."
        Start-Services
        
        # Retry health check
        if (-not (Test-HealthChecks)) {
            Write-Error "Services are still not healthy. Please check your setup manually."
            return
        }
    }
    
    Write-Host ""
    
    # Step 2: Basic API tests
    Test-BasicAPIs
    Write-Host ""
    
    # Step 3: LLM capabilities
    Test-LLMCapabilities
    Write-Host ""
    
    # Step 4: Web Admin
    Test-WebAdmin
    Write-Host ""
    
    # Step 5: E2E tests (optional)
    if ($RunE2E) {
        Invoke-E2ETests
    }
    else {
        $response = Read-Host "Run complete E2E tests? This may take several minutes. (y/N)"
        if ($response -match "^[Yy]") {
            Invoke-E2ETests
        }
        else {
            Write-Status "Skipping E2E tests. You can run them later with: npm run test:e2e"
        }
    }
    
    Write-Host ""
    
    # Step 6: Generate report
    New-TestReport
    
    Write-Host ""
    Write-Success "SmartEdify ecosystem validation completed!"
    Write-Host ""
    Write-Status "Next steps:"
    Write-Host "  1. Start Web Admin: cd apps/web-admin && npm run dev"
    Write-Host "  2. Access admin panel: http://localhost:3100"
    Write-Host "  3. Run full test suite: npm run test:e2e"
    Write-Host "  4. Check service metrics: http://localhost:9090 (Prometheus)"
    Write-Host "  5. View traces: http://localhost:16686 (Jaeger)"
    Write-Host ""
}

# Execute main function
Main