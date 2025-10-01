# Governance Services

Servicios especializados en la gobernanza democrática digital con validez legal adaptativa multi-país.

## Servicios

### governance-service (Puerto 3011)
- **Alcance**: Ciclo completo de asambleas con validez legal adaptable
- **Responsabilidades**: Convocatorias, votación ponderada, actas con IA (MCP), moderación híbrida
- **Legal**: Validación dinámica de quórum y mayorías vía compliance-service
- **Auditoría**: Sello criptográfico de quórum, endpoint público de verificación

### compliance-service (Puerto 3012)
- **Alcance**: Motor de cumplimiento normativo global
- **Responsabilidades**: Validación de reglas legales, perfiles regulatorios por país, DSAR
- **Adaptabilidad**: Motor de reglas + LLM para diferentes jurisdicciones
- **GDPR/LGPD**: Orquestación de crypto-erase cross-service

### reservation-service (Puerto 3013)
- **Alcance**: Gestión de reservas de áreas comunes
- **Responsabilidades**: Calendario, reglas de uso, validación de conflictos
- **Integración**: Conectado con asset-management-service para disponibilidad

### streaming-service (Puerto 3014)
- **Alcance**: Sesiones de video en vivo para asambleas híbridas
- **Responsabilidades**: Google Meet, QR (mostrar/escanear), biometría, transcripción, moderación
- **Seguridad**: Videos cifrados, hash de verificación, validación delegada al identity-service
- **Modalidades**: Presencial, virtual, mixta con registro manual

## Flujo de Gobernanza

1. **Iniciativa**: Cualquier propietario crea convocatoria
2. **Adhesiones**: Recolección hasta 25% de alícuotas
3. **Convocatoria Formal**: Administrador emite en 15 días
4. **Sesión Híbrida**: streaming-service + governance-service
5. **Validación Legal**: compliance-service valida quórum/mayorías
6. **Acta Final**: Generación con IA, firma digital, auditoría

## Integraciones Clave

- `identity-service`: Tokens contextuales QR, autenticación
- `user-profiles-service`: Roles, estructura organizacional
- `finance-service`: Propietarios habilitados (al día en pagos)
- `documents-service`: Generación y almacenamiento de actas
- `notifications-service`: Convocatorias, recordatorios

## Cumplimiento Legal

- **Multi-país**: Perú (PMV), expansión a LATAM y Europa
- **Validez jurídica**: Asambleas híbridas legalmente válidas
- **Auditoría**: Trazabilidad completa, verificación pública
- **Privacidad**: Consentimientos explícitos, DSAR automatizado