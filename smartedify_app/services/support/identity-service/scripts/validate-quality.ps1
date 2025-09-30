# Script de validación de criterios de calidad para PowerShell
# Uso: .\scripts\validate-quality.ps1

$ErrorActionPreference = "Continue"

Write-Host "🚀 Iniciando validación de criterios de calidad..." -ForegroundColor Cyan

# Contadores
$Passed = 0
$Failed = 0

# Función para mostrar resultado
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

Write-Host "`n📋 Validando criterios de calidad..." -ForegroundColor Yellow

# 1. Formateo
Write-Host "`n1. Verificando formateo..." -ForegroundColor Yellow
$result = & npm run format -- --check 2>$null
Check-Result $LASTEXITCODE "Formateo con Prettier"

# 2. Linting estricto
Write-Host "`n2. Ejecutando linting estricto..." -ForegroundColor Yellow
$result = & npm run lint:strict 2>$null
Check-Result $LASTEXITCODE "Linting estricto - 0 errores permitidos"

# 3. Pruebas unitarias
Write-Host "`n3. Ejecutando pruebas unitarias..." -ForegroundColor Yellow
$result = & npm test 2>$null
Check-Result $LASTEXITCODE "Pruebas unitarias - 100 porciento deben pasar"

# 4. Cobertura de pruebas
Write-Host "`n4. Validando cobertura de pruebas..." -ForegroundColor Yellow
$result = & npm run test:cov 2>$null
Check-Result $LASTEXITCODE "Cobertura minima - 30 porciento statements, 30 porciento branches, 20 porciento functions, 30 porciento lines"

# 5. Auditoría de seguridad
Write-Host "`n5. Ejecutando auditoria de seguridad..." -ForegroundColor Yellow
$result = & npm audit --audit-level=moderate 2>$null
Check-Result $LASTEXITCODE "Sin vulnerabilidades criticas o altas"

# 6. Build
Write-Host "`n6. Validando build..." -ForegroundColor Yellow
$result = & npm run build 2>$null
Check-Result $LASTEXITCODE "Build exitoso"

# 7. Migraciones (si hay base de datos disponible)
Write-Host "`n7. Validando migraciones..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>$null | Select-String "postgres"
if ($dockerRunning) {
    $result = & npm run db:run-migrations 2>$null
    Check-Result $LASTEXITCODE "Migraciones de base de datos"
} else {
    Write-Host "Base de datos no disponible, saltando validacion de migraciones" -ForegroundColor Yellow
}

# Resumen
Write-Host "`nResumen de validacion:" -ForegroundColor Yellow
Write-Host "Criterios pasados: $Passed" -ForegroundColor Green
Write-Host "Criterios fallidos: $Failed" -ForegroundColor Red

if ($Failed -eq 0) {
    Write-Host "`nTodos los criterios de calidad cumplidos!" -ForegroundColor Green
    Write-Host "El codigo esta listo para commit/push" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`nAlgunos criterios no se cumplen" -ForegroundColor Red
    Write-Host "Corrige los errores antes de hacer commit/push" -ForegroundColor Red
    exit 1
}