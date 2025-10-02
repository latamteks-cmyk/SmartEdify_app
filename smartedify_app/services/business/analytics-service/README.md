# Analytics Service — README

Servicio de **inteligencia de negocio** y **ML**. Puerto **3016**. 

---

## 1) Propósito y alcance

* Dashboards, reportes ad-hoc, predicciones ML, DW/ETL. 
* Consumidor de eventos de todos los dominios. 

**No-goals**

* No gestiona identidad ni autorización L7. Eso es `identity-service` y `gateway`. 

---

## 2) Arquitectura y patrones

* Microservicio en línea *business*. EDA con Kafka. Contracts-first. Observabilidad estándar.   
* Multi-tenant. Aislamiento y RLS por `tenant_id`. 

**Contexto de eventos**

* Servicios como `reservation-service` publican eventos hacia Analytics. 

---

## 3) API REST (v1)

* `GET /dashboards`, `GET /dashboards/{id}`, `POST /reports`, `GET /predictions/{type}`, `POST /insights`. 

**Security schemes**

* Bearer JWT + DPoP en operaciones que generen trabajos o materialicen datasets. 

---

## 4) Contratos e integración

* OpenAPI en `contracts/openapi/*`; AsyncAPI para eventos en `contracts/asyncapi/*`. 
* Esquemas versionados. Outbox e idempotencia en la plataforma de eventos. 

---

## 5) Seguridad

* Algoritmos: **ES256** o **EdDSA**. **HS256 prohibido**. `kid` obligatorio. 
* JWKS discovery por tenant. **TTL ≤ 300s**. Negative caching 60s. Rollover con 2 `kid` activos. 
* DPoP requerido en *writes* y handshake WS. Anti-replay distribuido. 
* Validación L7 de JWT/DPoP por gateway. 

---

## 6) Multitenancy y autorización de datos

* `tenant_id` y `condominium_id` como ejes de segmentación. RLS por `tenant_id`. 
* Catálogo estructural y jerarquías provienen de `tenancy-service`. 

---

## 7) Gobierno de datos

* Clasificación y minimización por dataset. Retención según políticas del repositorio `doc/security`. 
* Catálogo de KPIs con owner y fórmula en `doc/product/`. 
* Linaje y calidad de datos integrados a observabilidad. 

---

## 8) Eventos y fuentes

* Suscripción a tópicos por dominio. Claves por `tenant_id` y entidad. (alineado con EDA de plataforma). 
* Ejemplo productor → consumidor: `reservation-service` → `analytics-service`. 

---

## 9) Observabilidad

* Métricas Prometheus en `/metrics`. Logs JSON con `correlation_id`. Trazas OTel. Alerting de seguridad, performance y operación. 
* SLOs y tableros en plataforma de observabilidad. 

---

## 10) Prerrequisitos y *stack*

* Node.js 18+, PostgreSQL 13+, Kafka, Docker. NestJS + TypeScript.  

---

## 11) Flujo de desarrollo

* Contracts-first → codegen → implementación → validación. 
* Calidad: TS strict, ESLint, Prettier, hooks. 
* CI: lint, unit, contract, e2e, seguridad, deploy. 

---

## 12) Operación

* Health checks y *runbooks* en `doc/runbooks/`. 
* Despliegue con IaC y pipelines estandarizados. 

---

## 13) Endpoints de ejemplo

```http
GET /dashboards
GET /dashboards/{id}
POST /reports
GET /predictions/{type}
POST /insights
```



**Security**

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    DPoP:
      type: apiKey
      in: header
      name: DPoP
```



---

## 14) Roadmap breve

* Dashboards ejecutivos, modelos de quórum y morosidad, ahorro operativo.  

---

## 15) Licencia

Software propietario. Ver contratos en `contracts/`. 


Medical References:
1. None — DOI: file_0000000092c861fb8a78dc73f86ce579
2. None — DOI: file_0000000010006243898b608c4752fc36
3. None — DOI: file-GyjxMqdTv2s5DLGEFeedhR
4. None — DOI: file-D3TKX7kzvvmBd1ZfriYHMQ
5. None — DOI: file-GxmJn3rarzdJehdikrvA9q
6. None — DOI: file_00000000877461f4a0aa04a00833c6d1
