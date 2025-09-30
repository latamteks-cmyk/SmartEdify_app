# tenancy-service

## Alcance y responsabilidades

- Fuente canónica de tenants, condominios, edificios y unidades.
- Mantiene la estructura física y organizativa de cada comunidad.
- Crear y mantener tenants (cliente SaaS: administradora o junta).
- Registrar y gestionar condominios bajo cada tenant.
- Definir edificios y metadatos estructurales.
- Gestionar unidades (privadas y comunes) de cada condominio.
- Exponer catálogo estructural a otros servicios (`user-profiles`, `asset`, `reservation`, `finance`, `governance`).
- Emitir eventos de cambios para sincronización y reporting.

## Contexto multi-tenant y aislamiento

- `tenant_id` = cliente SaaS (ej. administradora de edificios, junta).
- `condominium_id` = comunidad específica bajo un tenant.
- RLS activo en todas las tablas por `tenant_id`.
- Algunas tablas requieren filtros adicionales por `condominium_id`.

## Modelo de dominio

- Tenants: administradora (varios condominios) o junta (uno).
- Condominios: nombre, dirección, país, estado, configuraciones financieras.
- Edificios: nombre, niveles, metadatos estructurales.
- Unidades: privadas y comunes, asociadas a condominios.
