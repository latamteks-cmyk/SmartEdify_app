# Streaming Service

> **Puerto:** 3014  
> **Alcance:** Gestión de sesiones de video en vivo para asambleas híbridas

## Responsabilidades

- Iniciar/terminar sesiones de video con Google Meet
- **Mostrar y escanear QR** (delegando emisión/validación al identity-service)
- Validar asistencia mediante biometría o SMS/Email
- Transcripción en tiempo real con Speech-to-Text
- Grabación, cifrado y almacenamiento seguro de videos
- Controles de moderación (silenciar, ceder palabra, cronómetro)
- Modo Presencial para registro manual de asistentes

## Integraciones

- `identity-service`: Emisión y validación de tokens contextuales QR
- `governance-service`: Estado de asambleas y participantes
- `notifications-service`: Códigos de verificación SMS/Email
- Google Meet API: Sesiones de video
- Speech-to-Text API: Transcripción en vivo

## Endpoints Principales

- `POST /sessions` - Crear sesión de video
- `GET /sessions/{id}/qr` - Mostrar QR de asistencia
- `POST /sessions/{id}/validate-attendance` - Validar asistencia (QR/biometría/SMS)
- `GET /sessions/{id}/transcript` - Obtener transcripción en tiempo real
- `POST /sessions/{id}/moderate` - Controles de moderación

## Notas de Seguridad

- Videos cifrados con AES-256
- Hash de verificación para integridad
- Validación de identidad delegada al identity-service
- Logs de auditoría para todas las acciones de moderación