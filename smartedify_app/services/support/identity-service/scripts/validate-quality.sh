#!/bin/bash

# Script de validación de criterios de calidad
# Uso: ./scripts/validate-quality.sh

set -e

echo "🚀 Iniciando validación de criterios de calidad..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0

# Función para mostrar resultado
check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $2${NC}"
        ((FAILED++))
    fi
}

echo "📋 Validando criterios de calidad..."

# 1. Formateo
echo -e "\n${YELLOW}1. Verificando formateo...${NC}"
npm run format -- --check > /dev/null 2>&1
check_result $? "Formateo con Prettier"

# 2. Linting estricto
echo -e "\n${YELLOW}2. Ejecutando linting estricto...${NC}"
npm run lint:strict > /dev/null 2>&1
check_result $? "Linting estricto (0 errores permitidos)"

# 3. Pruebas unitarias
echo -e "\n${YELLOW}3. Ejecutando pruebas unitarias...${NC}"
npm test > /dev/null 2>&1
check_result $? "Pruebas unitarias (100% deben pasar)"

# 4. Cobertura de pruebas
echo -e "\n${YELLOW}4. Validando cobertura de pruebas...${NC}"
npm run test:cov -- --coverageThreshold='{"global":{"statements":30,"branches":30,"functions":20,"lines":30}}' > /dev/null 2>&1
check_result $? "Cobertura mínima (30% statements, 30% branches, 20% functions, 30% lines)"

# 5. Auditoría de seguridad
echo -e "\n${YELLOW}5. Ejecutando auditoría de seguridad...${NC}"
npm audit --audit-level=moderate > /dev/null 2>&1
check_result $? "Sin vulnerabilidades críticas o altas"

# 6. Build
echo -e "\n${YELLOW}6. Validando build...${NC}"
npm run build > /dev/null 2>&1
check_result $? "Build exitoso"

# 7. Migraciones (si hay base de datos disponible)
echo -e "\n${YELLOW}7. Validando migraciones...${NC}"
if command -v docker &> /dev/null && docker ps | grep -q postgres; then
    npm run db:run-migrations > /dev/null 2>&1
    check_result $? "Migraciones de base de datos"
else
    echo -e "${YELLOW}⚠️  Base de datos no disponible, saltando validación de migraciones${NC}"
fi

# Resumen
echo -e "\n📊 ${YELLOW}Resumen de validación:${NC}"
echo -e "✅ Criterios pasados: ${GREEN}$PASSED${NC}"
echo -e "❌ Criterios fallidos: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}¡Todos los criterios de calidad cumplidos!${NC}"
    echo -e "✅ El código está listo para commit/push"
    exit 0
else
    echo -e "\n🚨 ${RED}Algunos criterios no se cumplen${NC}"
    echo -e "❌ Corrige los errores antes de hacer commit/push"
    exit 1
fi