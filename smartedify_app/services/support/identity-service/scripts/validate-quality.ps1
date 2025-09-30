# Script de validación de calidad - Identity Service
# Uso: .\scripts\validate-quality.ps1

$ErrorActionPreference = "Continue"

Write-Host "Validando calidad del codigo..." -ForegroundColor Cyan

$Passed = 0
$Failed = 0

function Check-Result {
    param($ExitCode, $Description)
    if ($ExitCode -eq 0) {
        Write-Host "✅ $Description" -ForegroundColor Green
        $script:Passed++
    } else {
        Write-Host "❌ $Description" -ForegroundColor Red
        $script:Failed++
    }
}

# Validaciones principales
Write-Host "`n1. Formateo..." -ForegroundColor Yellow
$result = & npm run format -- --check 2>$null
Check-Result $LASTEXITCODE "Formateo con Prettier"

Write-Host "`n2. Linting..." -ForegroundColor Yellow
$result = & npm run lint:strict 2>$null
Check-Result $LASTEXITCODE "Linting estricto"

Write-Host "`n3. Pruebas..." -ForegroundColor Yellow
$result = & npm test 2>$null
Check-Result $LASTEXITCODE "Pruebas unitarias"

Write-Host "`n4. Seguridad..." -ForegroundColor Yellow
$result = & npm audit --audit-level=moderate 2>$null
Check-Result $LASTEXITCODE "Auditoria de seguridad"

Write-Host "`n5. Build..." -ForegroundColor Yellow
$result = & npm run build 2>$null
Check-Result $LASTEXITCODE "Build"

# Resumen
Write-Host "`nResultado: $Passed pasados, $Failed fallidos" -ForegroundColor Yellow

if ($Failed -eq 0) {
    Write-Host "Codigo listo para commit" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Corrige los errores antes de continuar" -ForegroundColor Red
    exit 1
}