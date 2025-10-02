@echo off
REM SmartEdify Audit Quick Start for Windows

echo 🚀 Iniciando auditoría SmartEdify...

REM Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js no está instalado
    exit /b 1
)

REM Ir al directorio de scripts
cd /d "%~dp0"

REM Ejecutar auditoría rápida
echo 📊 Ejecutando auditoría rápida...
node run-audit-suite.js --mode quick

echo ✅ Auditoría completada!
echo 📁 Ver reportes en: ../reports/
pause
