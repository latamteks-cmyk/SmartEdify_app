#!/bin/bash
# SmartEdify Audit Quick Start

echo "🚀 Iniciando auditoría SmartEdify..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    exit 1
fi

# Ir al directorio de scripts
cd "$(dirname "$0")"

# Ejecutar auditoría rápida
echo "📊 Ejecutando auditoría rápida..."
node run-audit-suite.js --mode quick

echo "✅ Auditoría completada!"
echo "📁 Ver reportes en: ../reports/"
