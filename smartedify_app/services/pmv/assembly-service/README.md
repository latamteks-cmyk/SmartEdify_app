# assembly-service

Servicio principal para la gestión de ensamblajes en SmartEdify.

## Alcance y responsabilidades

- Orquestación y control de procesos de ensamblaje.
- Ejecuta el ciclo de vida completo de las asambleas comunitarias, desde la propuesta inicial hasta la generación del acta final con valor legal.
- No define políticas: ejecuta reglas provistas por `compliance-service`.
- Inclusión universal con privacidad: soporta múltiples métodos de participación, minimiza y protege datos personales.
- Auditoría inmutable y verificable: event sourcing, pruebas criptográficas, endpoint público de verificación.
- Transparencia radical con seguridad: integridad de grabaciones y actas verificable por propietarios.
- Participación proactiva con IA asistida: MCP asiste en redacción de actas, revisión y aprobación humana obligatoria.
- Aislamiento multi-tenant garantizado: RLS activo, FK compuestas, unicidad por tenant.
- Cumplimiento legal delegado: compliance-service es la única fuente de verdad normativa.
- Retención gobernada por política: plazos definidos por política legal vigente.

## Arquitectura

- Microservicio RESTful + WebSocket.
- Event-Driven Architecture: eventos a Apache Kafka.
- CQRS + Event Sourcing.
- Saga Pattern para flujos complejos.
- Workflow Engine para flujos de aprobación definidos por compliance-service.
- AI Agent Pattern (MCP) para asistencia en actas.
- Feature Flags, Circuit Breaker.

## Diagrama de contexto

- Frontends: User Web, Admin Web, Mobile App → API Gateway → assembly-service
- Dependencias: compliance-service, document-service, finance-service, user-service

Consulta las políticas globales en [doc/POLICY_INDEX.md](../../../doc/POLICY_INDEX.md).

## Alcance y responsabilidades

- Núcleo operativo y legal de la plataforma SmartEdify.
- Ejecuta el ciclo de vida completo de las asambleas comunitarias, desde la propuesta inicial hasta la generación del acta final con valor legal.
- No define políticas: ejecuta reglas provistas por `compliance-service`.
- Inclusión universal con privacidad: soporta múltiples métodos de participación, minimiza y protege datos personales.
- Auditoría inmutable y verificable: event sourcing, pruebas criptográficas, endpoint público de verificación.
- Transparencia radical con seguridad: integridad de grabaciones y actas verificable por propietarios.
- Participación proactiva con IA asistida: MCP asiste en redacción de actas, revisión y aprobación humana obligatoria.
- Aislamiento multi-tenant garantizado: RLS activo, FK compuestas, unicidad por tenant.
- Cumplimiento legal delegado: compliance-service es la única fuente de verdad normativa.
- Retención gobernada por política: plazos definidos por política legal vigente.

## Arquitectura

- Microservicio RESTful + WebSocket.
- Event-Driven Architecture: eventos a Apache Kafka.
- CQRS + Event Sourcing.
- Saga Pattern para flujos complejos.
- Workflow Engine para flujos de aprobación definidos por compliance-service.
- AI Agent Pattern (MCP) para asistencia en actas.
- Feature Flags, Circuit Breaker.

## Diagrama de contexto

- Frontends: User Web, Admin Web, Mobile App → API Gateway → governance-service
- Dependencias: compliance-service, documents-service, streaming-service, finance-service, user-profiles-service
