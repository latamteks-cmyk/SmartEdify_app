# Compliance + Llama Local — Arquitectura y Plan de Integración

## 0) Objetivo

Usar **Llama en local** para **interpretar documentos** de cada condominio (reglamentos, políticas, actas) y producir **políticas ejecutables** para `compliance-service`, manteniendo decisiones deterministas para `reservation-service`, `streaming-service`, `asset-management`, etc.

> Principio: el **LLM no decide en producción**. Propone reglas y explicaciones. El **PDP** de `compliance` ejecuta políticas compiladas y versionadas.

---

## 1) Arquitectura de alto nivel

```
[Docs Condo (PDF/DOC/HTML)]
     │  (ingesta)
     ▼
[ETL: OCR + limpieza + chunking]
     │
     ├──► [Embeddings (local)] ─► [Vector Store pgvector]
     │
     └──► [Llama.cpp (instruct)] ─► [Policy Compiler]
                                    │
                                    └──► [Policy Store (PAP)] ─► [PDP (evaluate)]

Servicios consumidores → compliance:/v1/policies:evaluate, /v1/retention:resolve, /v1/consents:resolve

Observabilidad: OTel traces + métricas LLM + auditoría WORM
```

### 1.1 Componentes

* **Llama.cpp server**: modelo `Llama 3 Instruct` local (GGUF, Q4_K_M o Q5_K_M según hardware).
* **Embeddings local**: `bge-small-en/es` o `e5-small` vía `text-embeddings-inference` local.
* **Vector DB**: Postgres + pgvector con RLS por tenant/condominio.
* **Policy Compiler**: traduce salidas del LLM a **JSON de política** validado contra esquema.
* **PAP/PDP**: repositorio y motor de políticas (determinista) de compliance.
* **ETL**: extractor con OCR (Tesseract) + normalizador.

---

## 2) Modos de uso del LLM

1. **Compile Mode (offline/async)**

   * Input: documentos + metadatos (tenant, condominio, clase de documento).
   * Output: `PolicyDraft` JSON con **reglas**, **obligaciones**, **excepciones**, **referencias** (IDs de párrafos) y **justificación**.
   * Revisión humana opcional en Admin Web → Publícase como `Policy@version`.

2. **Explain Mode (online)**

   * Endpoint: `POST /v1/policies:explain`.
   * RAG sobre vector store. Devuelve **explicación con citas** y **no PII**.
   * Uso en UI para mostrar “por qué” una decisión fue `DENY/CONDITIONAL`.

> Las **decisiones** en `/v1/policies:evaluate` siguen siendo por **PDP** determinista. El LLM jamás ejecuta `allow/deny`.

---

## 3) Docker Compose (extracto)

```yaml
services:
  llama:
    image: ghcr.io/ggerganov/llama.cpp:full
    command: ["./server", "-m", "/models/llama3-instruct.Q4_K_M.gguf", "-c", "4096", "-ngl", "1", "-fa"]
    volumes: ["./models:/models"]
    ports: ["8089:8080"]
    environment:
      GGML_LOG_LEVEL: info
    deploy: { resources: { reservations: { devices: [ { capabilities: [ "gpu" ] } ] } } }

  embeddings:
    image: ghcr.io/huggingface/text-embeddings-inference:cpu-1.5
    environment:
      MODEL_ID: intfloat/multilingual-e5-small
    ports: ["8091:80"]

  pg:
    image: postgres:16
    environment: { POSTGRES_USER: dev, POSTGRES_PASSWORD: devpass, POSTGRES_DB: compliance_rag }
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d

  compliance:
    image: ghcr.io/org/compliance-service:dev
    environment:
      VECTOR_DB_URL: postgres://dev:devpass@pg:5432/compliance_rag
      LLM_BASE_URL: http://llama:8080
      EMBEDDINGS_URL: http://embeddings:80
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
    depends_on: [ pg, llama, embeddings ]

volumes: { pgdata: {} }
```

---

## 4) Esquema de almacenamiento (pgvector)

```sql
create extension if not exists vector;
create table rag_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  condominium_id uuid not null,
  doc_id uuid not null,
  section_id text not null,
  content text not null,
  embedding vector(768) not null,
  lang char(2) not null,
  meta jsonb not null default '{}'::jsonb
);
create index on rag_chunks using ivfflat (embedding vector_cosine_ops) with (lists=100);
-- RLS por tenant/condominio
```

---

## 5) Pipeline de ingesta

1. **Detectar**: watcher en `s3://policies/{tenant}/{condo}/...` o carpeta local.
2. **Extraer**: PDF→texto (pdfminer) y OCR para escaneados.
3. **Normalizar**: limpieza, idioma, split por títulos y párrafos (chunk 800–1200 tokens, overlap 120).
4. **Embed** y **persistir** en `rag_chunks`.
5. **Indexar**: construir `doc_manifest` con hashes para trazabilidad.

---

## 6) Plantillas de prompt

### 6.1 Compile Mode → PolicyDraft

```
Sistema: Eres un compilador de políticas. Devuelves JSON válido que cumpla el esquema PolicyDraft v1.
Usuario: A partir de los fragmentos con citas, extrae reglas operativas para reservas/streaming.
- Si hay ambigüedad marca "requiresHumanReview": true
- Referencia cada regla con doc.section_id
- No inventes valores

Salida JSON (solo JSON):
{
  "tenantId":"<uuid>",
  "condominiumId":"<uuid>",
  "scope":"reservation|streaming|privacy",
  "rules":[{
    "action":"reservation:create",
    "condition":"partySize <= amenity.capacity && withinAdvance(start,end)",
    "obligations":[{"type":"REQUIRES_APPROVAL","when":"amenity.type in ['piscina','sum']"}],
    "refs":["doc:abc#s12","doc:def#s3"]
  }],
  "requiresHumanReview": false
}
```

### 6.2 Explain Mode → explicación con citas

```
Sistema: Responde con explicación concisa y citas [doc#section]. Sin PII.
Usuario: ¿Por qué la acción X fue DENY para el usuario Y en la amenidad Z?
```

---

## 7) API (ampliaciones)

* `POST /v1/policies:compile`
  Body: `{ tenantId, condominiumId, docRefs[] }`
  Efecto: genera `PolicyDraft` y lo guarda en PAP como borrador.

* `POST /v1/policies:promote`
  Body: `{ draftId, versionNote }`
  Efecto: valida contra esquema y publica `Policy@version`.

* `POST /v1/policies:explain`
  Body: `{ decisionId | {action, resource, subject, context} }`
  RAG + explicación con citas.

* `GET /v1/rag:search`
  Query: `q, tenant, condominium, topK`
  Devuelve fragmentos con `section_id` y doc.

> Todas con JWT; escrituras requieren DPoP. RLS aplica a RAG.

---

## 8) Seguridad y privacidad

* **Aislamiento**: RLS por tenant/condominio.
* **Egreso cero**: contenedor LLM sin salida a Internet.
* **PII**: redacción previa al prompt; hashing de identificadores.
* **Auditoría**: registrar prompts/completions y chunks citados en WORM.
* **Rate limit**: por usuario y por condo.
* **Determinismo**: `temperature≤0.2`, `top_p≤0.9`. Semillas fijas para reproducibilidad en compile.

---

## 9) Calidad y evaluación

* **Conjunto verdad‑terreno** por condo: 50–100 preguntas y 10–20 reglas.
* **Métricas**: exactitud de extracción de reglas, cobertura, F1 macro, grounding (≥0.9), alucinación (≤1%).
* **Revisión humana**: requerida si `requiresHumanReview=true` o `grounding<0.85`.

---

## 10) Observabilidad

* Métricas: `llm_requests_total{mode}`, `latency_ms_bucket`, `rag_hit_ratio`, `compile_accept_rate`.
* Trazas OTel con atributos `tenant_id`, `condominium_id`, `doc_id`.
* Logs JSON con `prompt_hash`, `completion_hash`.

---

## 11) Rendimiento y sizing

* Llama 3 8B Q4_K_M: ~8–12 tok/s CPU AVX2; con GPU 8–20 tok/s.
* Target: **Compile Mode** ≤ 20s por doc de 10 páginas; **Explain Mode** ≤ 1.5s P95 con top‑k=8.
* Embeddings `e5-small`: 500–1k QPS CPU.

---

## 12) Plan de entrega

* **S1**: Infra (llama, embeddings, pgvector), ETL, RAG search.
* **S2**: `policies:compile` + esquema `PolicyDraft` + Admin review.
* **S3**: `policies:explain` + auditoría.
* **S4**: hardening, métricas, pruebas de aceptación, CI/CD.

---

## 13) Criterios de aceptación

1. `policies:compile` genera JSON válido y reproducible, con ≥90% de cobertura de reglas esperadas.
2. `policies:promote` publica políticas aplicables por PDP y usadas por `reservation/streaming`.
3. `policies:explain` responde con citas a párrafos reales. Sin PII.
4. Aislamiento por tenant/condominio validado con tests negativos.
5. E2E: cambio en documento → nuevo draft → promoción → decisión PDP cambia de forma esperada.

---

## 14) Riesgos y mitigación

* **Hallucinations**: grounding y citas obligatorias; bloque si score bajo.
* **Drift**: versionado de embeddings y de modelos; reindex tras cambios.
* **Latencia**: cache de pasajes por pregunta frecuente; hardware con GPU opcional.
* **Cumplimiento legal**: retención y trazabilidad de prompts en WORM.

---

## 15) Anexos

### 15.1 Esquema `PolicyDraft` (JSON Schema v2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smartedify.com/schemas/policydraft.v1.json",
  "type": "object",
  "required": ["tenantId","condominiumId","scope","rules"],
  "properties": {
    "tenantId": {"type":"string","format":"uuid"},
    "condominiumId": {"type":"string","format":"uuid"},
    "scope": {"type":"string","enum":["reservation","streaming","privacy","sanctions"]},
    "rules": {"type":"array","items":{
      "type":"object",
      "required": ["action","condition","refs"],
      "properties": {
        "action": {"type":"string"},
        "condition": {"type":"string"},
        "obligations": {"type":"array","items":{"type":"object"}},
        "exceptions": {"type":"array","items":{"type":"string"}},
        "refs": {"type":"array","items":{"type":"string"}}
      }
    }},
    "requiresHumanReview": {"type":"boolean","default":false}
  }
}
```
