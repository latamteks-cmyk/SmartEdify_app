# compliance-service

Servicio complementario para la gestión de cumplimiento normativo en SmartEdify.

## Alcance
Motor de Cumplimiento Normativo Global. Valida reglas legales (financieras, laborales, de asambleas) basadas en el país del tenant y su reglamento interno. Usa motor de reglas + LLM.

## Responsabilidades Clave
- Definir y validar flujos de aprobación de convocatorias.
- Inyectar dinámicamente quórum y mayorías requeridas para cada tipo de decisión.
- Gestionar perfiles regulatorios por país y tipo de propiedad.
- Adaptación multi-país.
- Orquestar el flujo de eliminación de datos (DSAR cross-service) y ejecutar crypto-erase en servicios como governance-service.

Consulta las políticas globales en [doc/POLICY_INDEX.md](../../../doc/POLICY_INDEX.md).