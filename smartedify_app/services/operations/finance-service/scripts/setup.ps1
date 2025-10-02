# SmartEdify Finance Service Setup Script

param(
    [switch]$Development = $false,
    [switch]$Production = $false,
    [switch]$SkipDatabase = $false
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

Write-Host "🚀 SmartEdify Finance Service Setup" -ForegroundColor Blue
Write-Host "===================================" -ForegroundColor Blue
Write-Host ""

# Check prerequisites
Write-Status "Checking prerequisites..."

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Success "Node.js version: $nodeVersion"
}
catch {
    Write-Error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Success "npm version: $npmVersion"
}
catch {
    Write-Error "npm is not installed. Please install npm first."
    exit 1
}

# Check PostgreSQL (optional)
try {
    $pgVersion = psql --version
    Write-Success "PostgreSQL detected: $pgVersion"
}
catch {
    Write-Warning "PostgreSQL not detected. Make sure you have a PostgreSQL database available."
}

Write-Host ""

# Install dependencies
Write-Status "Installing dependencies..."
try {
    npm install
    Write-Success "Dependencies installed successfully"
}
catch {
    Write-Error "Failed to install dependencies"
    exit 1
}

Write-Host ""

# Setup environment
Write-Status "Setting up environment..."

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Success "Created .env file from .env.example"
        Write-Warning "Please edit .env file with your configuration before proceeding"
    }
    else {
        Write-Warning ".env.example not found. Creating basic .env file..."
        
        $envContent = @"
# Finance Service Configuration
PORT=3007
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/smartedify_finance?schema=public"
JWT_SECRET=your-jwt-secret-key-here

# Payment Providers (configure as needed)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
CULQI_SECRET_KEY=sk_test_your_culqi_secret_key
MERCADOPAGO_ACCESS_TOKEN=TEST-your-mercadopago-access-token
"@
        
        $envContent | Out-File -FilePath ".env" -Encoding UTF8
        Write-Success "Created basic .env file"
        Write-Warning "Please edit .env file with your actual configuration"
    }
}
else {
    Write-Success ".env file already exists"
}

Write-Host ""

# Database setup
if (-not $SkipDatabase) {
    Write-Status "Setting up database..."
    
    try {
        # Generate Prisma client
        Write-Status "Generating Prisma client..."
        npx prisma generate
        Write-Success "Prisma client generated"
        
        # Run migrations
        Write-Status "Running database migrations..."
        npx prisma migrate dev --name init
        Write-Success "Database migrations completed"
        
        # Seed database
        $seedResponse = Read-Host "Do you want to seed the database with sample data? (y/N)"
        if ($seedResponse -match "^[Yy]") {
            Write-Status "Seeding database..."
            npm run db:seed
            Write-Success "Database seeded successfully"
        }
    }
    catch {
        Write-Warning "Database setup failed. You may need to:"
        Write-Host "  1. Ensure PostgreSQL is running"
        Write-Host "  2. Update DATABASE_URL in .env file"
        Write-Host "  3. Create the database manually"
        Write-Host "  4. Run: npx prisma migrate dev"
    }
}
else {
    Write-Status "Skipping database setup as requested"
}

Write-Host ""

# Build application
Write-Status "Building application..."
try {
    npm run build
    Write-Success "Application built successfully"
}
catch {
    Write-Error "Build failed"
    exit 1
}

Write-Host ""

# Final setup based on environment
if ($Development) {
    Write-Status "Setting up for development..."
    Write-Success "Development setup completed!"
    Write-Host ""
    Write-Status "To start the development server:"
    Write-Host "  npm run start:dev"
    Write-Host ""
    Write-Status "API will be available at:"
    Write-Host "  - Health check: http://localhost:3007/health"
    Write-Host "  - API docs: http://localhost:3007/api/docs"
}
elseif ($Production) {
    Write-Status "Setting up for production..."
    Write-Success "Production setup completed!"
    Write-Host ""
    Write-Status "To start the production server:"
    Write-Host "  npm run start:prod"
    Write-Host ""
    Write-Warning "Make sure to:"
    Write-Host "  1. Set NODE_ENV=production in .env"
    Write-Host "  2. Configure production database"
    Write-Host "  3. Set up proper JWT secrets"
    Write-Host "  4. Configure payment provider credentials"
}
else {
    Write-Success "Setup completed!"
    Write-Host ""
    Write-Status "Available commands:"
    Write-Host "  npm run start:dev    - Start development server"
    Write-Host "  npm run start:prod   - Start production server"
    Write-Host "  npm run test         - Run tests"
    Write-Host "  npm run build        - Build application"
    Write-Host ""
    Write-Status "API endpoints:"
    Write-Host "  - Health: http://localhost:3007/health"
    Write-Host "  - Docs: http://localhost:3007/api/docs"
}

Write-Host ""
Write-Success "🎉 Finance Service setup completed successfully!"