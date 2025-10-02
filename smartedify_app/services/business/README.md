📘 Business Services — marketplace-service (3015) y analytics-service (3016)

Servicios de negocio orientados a monetización y toma de decisiones: un Marketplace para contratar servicios premium y un Analytics para BI/ML y reporting. Ambos se integran con identidad, cumplimiento, gobernanza, reservas y operaciones.

🧭 Alcance

marketplace-service (3015): catálogo de servicios, gestión de solicitudes y cotizaciones, adjudicación, órdenes de trabajo externas, asesoría en vivo, revisión legal de actas y servicios de mantenimiento especializados. No emite identidad ni reglas legales. Orquesta con finanzas, documentos y governance.

analytics-service (3016): datasets multi-tenant, ETL, dashboards, métricas RED, modelos predictivos y explicabilidad. Consumidor de eventos de streaming, governance, reservations y asset management. Sin acceso directo a PII sin resolución previa de políticas.

🏗️ Arquitectura
graph TD
  subgraph Gateway 8080
    GW[API Gateway]
  end

  subgraph Business
    MKT[marketplace-service 3015]
    ANL[analytics-service 3016]
  end

  subgraph Core
    ID[identity 3001]
    UP[user-profiles 3002]
    TEN[tenancy 3003]
    CMP[compliance 3012]
    GOV[governance 3011]
    STR[streaming 3014]
    RSV[reservation 3013]
    DOC[documents 3006]
    FIN[finance 3007]
    AMS[asset-management 3010]
    NOT[notifications 3005]
  end

  GW-->MKT
  GW-->ANL

  MKT<-->FIN
  MKT<-->DOC
  MKT<-->AMS
  MKT<-->GOV
  MKT-->NOT
  MKT-->CMP
  MKT<--JWT/DPoP-->ID
  MKT-->UP
  MKT-->TEN

  ANL<-events- STR
  ANL<-events- GOV
  ANL<-events- RSV
  ANL<-events- AMS
  ANL<--JWT-->ID
  ANL-->CMP


Ruteo vía gateway con validación de JWT ES256/EdDSA, DPoP, mTLS interno y políticas de rate-limit. Prefijos:
/api/v1/marketplace/* y /api/v1/analytics/*.

Delegación estricta: identidad y QR contextuales en identity; tokens QR solo se muestran/escanean desde front o integraciones como streaming, se validan en identity.

🔒 Seguridad y cumplimiento

Algoritmos: solo ES256/EdDSA. HS256 prohibido en docs y ejemplos. Header kid obligatorio.

JWKS: TTL ≤ 300 s y negative caching 60 s. Soportar rollover 7 días con 2 claves activas.

DPoP: obligatorio en escrituras. Anti-replay distribuido. Handshake para WS cuando aplique.

Runtime compliance: todas las decisiones normativas y de retención se evalúan en compliance-service; Analytics minimiza PII por defecto y documenta linaje y retención.

🔌 Integraciones clave

identity-service: autenticación OIDC, tokens PoP, sesiones, QR contextuales; no almacenar plantillas biométricas.

governance-service: marketplace habilita revisión legal de actas y asesoría en vivo; analytics consume participación, quórum y resultados de votación.

streaming-service: sesiones en vivo; marketplace coordina asesoría técnica/legal, usando tokens contextuales validados por identity.

reservation-service: analytics consume uso de amenidades, no-shows y check-ins.

asset-management-service: marketplace gestiona cotizaciones y adjudicación; analytics usa métricas de OT, consumos y vendor scorecard.

user-profiles / tenancy: fuente de perfiles, membresías, roles y estructura de unidades/áreas; determinan ámbito y permisos efectivos.

finance / documents / notifications: pagos, contratos/actas y comunicaciones transaccionales.

📦 Dominios y contratos
marketplace-service

Catálogo: servicios legal_review, live_advisory, maintenance_pro, diagnostics, etc. Fuentes: proveedores de AMS y terceros.

Solicitudes y cotizaciones: crear SOS a proveedores sugeridos, seleccionar oferta, emitir OC y OT técnica cuando aplique.

Asesoría en vivo: agenda y unión a sesión de streaming; autorización efectiva por identity y política activa por compliance.

Revisión de actas: intake de borrador desde governance, dictamen y sello de validez con evidencias en documents.

Eventos (AsyncAPI):
MarketplaceRequestCreated.v1, QuoteReceived.v1, QuoteAwarded.v1, PurchaseOrderIssued.v1, LiveAdvisoryStarted.v1, LegalReviewCompleted.v1.

analytics-service

Ingesta por eventos: transcripciones, asistencia, resultados de votación, reservas, OTs, finanzas resumidas.

Datasets y linaje: versionado, retención por política, auditoría WORM. PII minimizada y acceso sujeto a evaluate de compliance.

Dashboards: participación, quórum, tiempos de sesión, utilización de áreas, mantenimiento y proveedores.

ML: predicción de quórum y tiempos/consumos estándar; explicabilidad requerida.

🛣️ Rutas del Gateway

/api/v1/marketplace/* → marketplace-service:3015

/api/v1/analytics/* → analytics-service:3016
Con validación JWT/DPoP, mTLS interno y WAF.

📚 API y contratos

OpenAPI 3.1 por servicio en contracts/openapi/*. Versionado v1. Idempotencia en POST críticos. Errores RFC 7807.

Eventos registrados en el Schema Registry de notificaciones; claves por tenant_id y entidad de dominio.

🛡️ Políticas de datos

Retención y borrado: governed por compliance; DSAR orquestado cross-service; crypto-erase cuando aplique.

Acceso a PII en Analytics: sólo tras resolución de políticas/consents; preferir agregados o seudonimización.

📈 Observabilidad y SLOs

Métricas (Prometheus):

Marketplace: requests_total{route}, quotes_received_total, awards_total, live_advisory_minutes_total, legal_reviews_completed_total.

Analytics: ingest_events_total{source}, pipeline_latency_p95_seconds, dashboards_views_total, models_trained_total.

SLOs: P95 API ≤ 150 ms; error 5xx < 0.5%; pipelines P95 ≤ 5 min; dashboards P95 ≤ 200 ms.

Trazas: W3C con tenant_id, condominium_id, actor, policy_id/version.

Logs: JSON, WORM, sin PII.

🔐 Lineamientos de implementación

AuthN/Z: OIDC con PKCE obligatorio, JWT con kid, DPoP en write, cache JWKS ≤ 300 s.

Delegación de QR y biometría: emitir/validar solo en identity; clientes escanean/muestran.

Compliance-first: todas las decisiones normativas, consents, retención y DSAR vía compliance; fail-closed.

Multi-tenant: RLS activo, FKs compuestas y aislamiento por tenant_id en toda tabla con datos de cliente.

🚀 Desarrollo local

Ramas y contratos contracts-first; generar SDKs desde OpenAPI.

Semillas mínimas: tenants/condominios de tenancy, perfiles/roles de user-profiles, proveedores/amenidades de asset-management/tenancy.

✅ Definition of Done

OpenAPI publicado con ejemplos y matriz de errores RFC 7807.

Rate-limits y WAF efectivos en gateway; WS con DPoP cuando aplique.

Métricas, trazas y dashboards RED listos; linaje y retención documentados en Analytics.

Flujos E2E validados:

Marketplace: solicitud → cotizaciones → adjudicación → OC/OT → cierre con evidencias.

Analytics: ingesta eventos (streaming/governance/reservations/asset) → dataset versionado → dashboard.

🧭 No-goals

Marketplace no firma actas ni decide validez legal. Eso es governance + compliance + documents.

Analytics no expone PII directa ni actúa como fuente canónica de identidad o estructuras. Eso es identity/user-profiles/tenancy.
