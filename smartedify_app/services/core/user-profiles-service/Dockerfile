# Multi-stage build para optimizar tamaño de imagen
FROM node:20-alpine AS builder

# Metadatos de la imagen
LABEL maintainer="SmartEdify Platform Team <platform@smartedify.global>"
LABEL version="2.1.0"
LABEL description="User Profiles Service - Fuente canónica de perfiles de usuario, membresías y roles"

# Instalar dependencias del sistema necesarias para compilación
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Crear usuario no-root para seguridad
RUN addgroup -g 1000 -S smartedify && \
    adduser -u 1000 -S smartedify -G smartedify

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig*.json ./

# Instalar dependencias (solo production en esta etapa)
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY src/ ./src/

# Compilar TypeScript
RUN npm run build

# Etapa de producción
FROM node:20-alpine AS production

# Instalar dependencias de runtime
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Crear usuario no-root
RUN addgroup -g 1000 -S smartedify && \
    adduser -u 1000 -S smartedify -G smartedify

# Establecer directorio de trabajo
WORKDIR /app

# Crear directorios necesarios con permisos correctos
RUN mkdir -p /app/logs /tmp && \
    chown -R smartedify:smartedify /app /tmp

# Copiar dependencias de producción desde builder
COPY --from=builder --chown=smartedify:smartedify /app/node_modules ./node_modules

# Copiar código compilado
COPY --from=builder --chown=smartedify:smartedify /app/dist ./dist

# Copiar archivos de configuración
COPY --chown=smartedify:smartedify package*.json ./

# Cambiar a usuario no-root
USER smartedify

# Configurar variables de entorno por defecto
ENV NODE_ENV=production \
    PORT=3002 \
    LOG_LEVEL=info \
    LOG_FORMAT=json \
    METRICS_ENABLED=true \
    TELEMETRY_ENABLED=true \
    OTEL_SERVICE_NAME=user-profiles-service \
    OTEL_SERVICE_VERSION=2.1.0

# Exponer puerto
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3002/health/live || exit 1

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]

# Comando por defecto
CMD ["node", "dist/main.js"]

# Metadatos adicionales
LABEL org.opencontainers.image.title="SmartEdify User Profiles Service"
LABEL org.opencontainers.image.description="Fuente canónica de perfiles de usuario, membresías, roles locales y entitlements"
LABEL org.opencontainers.image.version="2.1.0"
LABEL org.opencontainers.image.vendor="SmartEdify Global"
LABEL org.opencontainers.image.licenses="Proprietary"
LABEL org.opencontainers.image.source="https://github.com/smartedify/smartedify_app"
LABEL org.opencontainers.image.documentation="https://docs.smartedify.global/services/user-profiles"