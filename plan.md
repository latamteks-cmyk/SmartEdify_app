# Plan de Próximos Pasos

Este documento resume las próximas tareas de implementación para los servicios `identity-service` y `gateway-service`, basadas en el estado actual del proyecto.

## `gateway-service`

La configuración estructural del gateway está mayormente completa. El foco principal ahora es la implementación de la lógica de validación de JWT.

-   **Tarea Crítica: Implementar Validación Criptográfica de JWT en `Lua`**
    -   **Objetivo:** Reemplazar la validación simulada en el filtro `envoy.lua.jwt_validator` con una validación criptográfica real.
    -   **Desafío:** Requiere integrar una librería de criptografía y JWT en el entorno Lua de Envoy, lo cual puede necesitar una imagen de Envoy personalizada.
    -   **Próximo Paso Sugerido:** Investigar y seleccionar una librería Lua para JWT (ej. `lua-resty-jwt` o similar) y planificar su integración.

-   **Tarea Secundaria: Configurar mTLS Interno**
    -   **Objetivo:** Añadir la configuración de `transport_socket` a los clústeres de Envoy para asegurar la comunicación con los backends mediante mTLS (SPIFFE).

## `identity-service`

Se ha completado el scaffolding para varias funcionalidades críticas. El siguiente paso es implementar la lógica de negocio.

-   **Tarea Principal: Implementar Flujo de Borrado de Datos (DSAR)**
    -   **Objetivo:** Completar la lógica del `ComplianceService` para orquestar el borrado de datos a través de múltiples servicios.
    -   **Desafío:** Requiere una implementación robusta del consumidor de Kafka que escuche los eventos de confirmación de otros servicios y un mecanismo de notificación al cliente (webhook).
    -   **Próximo Paso Sugerido:** Crear un servicio "consumidor" (placeholder) dentro del `identity-service` que simule la recepción de eventos de Kafka.

-   **Tarea Secundaria: Implementar Lógica de `backchannel-logout`**
    -   **Objetivo:** Completar la implementación del método `handleBackchannelLogout` en `auth.service.ts` para validar completamente el `logout_token` y revocar la sesión.
