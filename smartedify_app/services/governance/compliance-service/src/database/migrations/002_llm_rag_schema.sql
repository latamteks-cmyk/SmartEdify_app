-- Compliance Service - LLM & RAG Schema Migration
-- Version: 2.0.0
-- Date: 2025-01-01
-- Description: Adds LLM, RAG, and policy compilation capabilities

-- Enable vector extension for pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_manifests table for document tracking
CREATE TABLE document_manifests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    condominium_id UUID NOT NULL,
    doc_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    language CHAR(2) NOT NULL DEFAULT 'es',
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('REGULATION', 'POLICY', 'MINUTES', 'CONTRACT', 'OTHER')),
    processing_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    chunk_count INTEGER DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, condominium_id, doc_id)
);

-- Create indexes for document_manifests
CREATE INDEX idx_document_manifests_tenant_condo ON document_manifests(tenant_id, condominium_id);
CREATE INDEX idx_document_manifests_status ON document_manifests(processing_status);
CREATE INDEX idx_document_manifests_type ON document_manifests(document_type);
CREATE INDEX idx_document_manifests_hash ON document_manifests(content_hash);
CREATE INDEX idx_document_manifests_created_at ON document_manifests(created_at);

-- Enable RLS on document_manifests
ALTER TABLE document_manifests ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for document_manifests
CREATE POLICY tenant_isolation_document_manifests ON document_manifests
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create rag_chunks table for vector storage
CREATE TABLE rag_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    condominium_id UUID NOT NULL,
    doc_id UUID NOT NULL,
    section_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768) NOT NULL, -- multilingual-e5-small dimension
    lang CHAR(2) NOT NULL DEFAULT 'es',
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (tenant_id, condominium_id, doc_id) REFERENCES document_manifests(tenant_id, condominium_id, doc_id) ON DELETE CASCADE
);

-- Create indexes for rag_chunks
CREATE INDEX idx_rag_chunks_tenant_condo ON rag_chunks(tenant_id, condominium_id);
CREATE INDEX idx_rag_chunks_doc_section ON rag_chunks(doc_id, section_id);
CREATE INDEX idx_rag_chunks_lang ON rag_chunks(lang);

-- Create vector similarity index (IVFFlat)
CREATE INDEX idx_rag_chunks_embedding ON rag_chunks 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- Enable RLS on rag_chunks
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for rag_chunks
CREATE POLICY tenant_isolation_rag_chunks ON rag_chunks
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create policy_drafts table
CREATE TABLE policy_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    condominium_id UUID NOT NULL,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('reservation', 'streaming', 'privacy', 'sanctions')),
    rules JSONB NOT NULL,
    requires_human_review BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED')),
    grounding_score DECIMAL(3,2),
    source_docs JSONB NOT NULL DEFAULT '[]'::jsonb,
    prompt_hash VARCHAR(64),
    completion_hash VARCHAR(64),
    reviewed_by TEXT,
    review_notes TEXT,
    published_version TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for policy_drafts
CREATE INDEX idx_policy_drafts_tenant_condo ON policy_drafts(tenant_id, condominium_id);
CREATE INDEX idx_policy_drafts_scope_status ON policy_drafts(scope, status);
CREATE INDEX idx_policy_drafts_created_at ON policy_drafts(created_at);
CREATE INDEX idx_policy_drafts_grounding_score ON policy_drafts(grounding_score) WHERE grounding_score IS NOT NULL;
CREATE INDEX idx_policy_drafts_tenant_scope ON policy_drafts(tenant_id, scope);

-- Enable RLS on policy_drafts
ALTER TABLE policy_drafts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for policy_drafts
CREATE POLICY tenant_isolation_policy_drafts ON policy_drafts
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create llm_audit_log table for WORM auditing
CREATE TABLE llm_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    condominium_id UUID,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('COMPILE', 'EXPLAIN', 'SEARCH')),
    prompt_hash VARCHAR(64) NOT NULL,
    completion_hash VARCHAR(64),
    input_tokens INTEGER,
    output_tokens INTEGER,
    processing_time_ms INTEGER,
    grounding_score DECIMAL(3,2),
    chunks_cited JSONB,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_id UUID,
    trace_id VARCHAR(32),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for llm_audit_log
CREATE INDEX idx_llm_audit_log_tenant ON llm_audit_log(tenant_id, created_at);
CREATE INDEX idx_llm_audit_log_operation ON llm_audit_log(operation_type, created_at);
CREATE INDEX idx_llm_audit_log_prompt_hash ON llm_audit_log(prompt_hash);
CREATE INDEX idx_llm_audit_log_trace_id ON llm_audit_log(trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX idx_llm_audit_log_request_id ON llm_audit_log(request_id) WHERE request_id IS NOT NULL;

-- Enable RLS on llm_audit_log
ALTER TABLE llm_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for llm_audit_log
CREATE POLICY tenant_isolation_llm_audit_log ON llm_audit_log
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Create updated_at trigger for tables that need it
CREATE TRIGGER update_document_manifests_updated_at 
    BEFORE UPDATE ON document_manifests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policy_drafts_updated_at 
    BEFORE UPDATE ON policy_drafts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector(768),
    tenant_uuid UUID,
    condominium_uuid UUID,
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
    chunk_id UUID,
    doc_id UUID,
    section_id TEXT,
    content TEXT,
    similarity FLOAT,
    lang CHAR(2),
    meta JSONB
)
LANGUAGE SQL STABLE
AS $$
    SELECT 
        id,
        doc_id,
        section_id,
        content,
        1 - (embedding <=> query_embedding) as similarity,
        lang,
        meta
    FROM rag_chunks
    WHERE tenant_id = tenant_uuid 
        AND condominium_id = condominium_uuid
        AND (1 - (embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY embedding <=> query_embedding
    LIMIT max_results;
$$;

-- Create function for document chunk statistics
CREATE OR REPLACE FUNCTION get_chunk_stats(
    tenant_uuid UUID,
    condominium_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
    total_chunks BIGINT,
    document_count BIGINT,
    language_distribution JSONB
)
LANGUAGE SQL STABLE
AS $$
    SELECT 
        COUNT(*) as total_chunks,
        COUNT(DISTINCT doc_id) as document_count,
        jsonb_object_agg(lang, lang_count) as language_distribution
    FROM (
        SELECT 
            doc_id,
            lang,
            COUNT(*) as lang_count
        FROM rag_chunks
        WHERE tenant_id = tenant_uuid 
            AND (condominium_uuid IS NULL OR condominium_id = condominium_uuid)
        GROUP BY doc_id, lang
    ) lang_stats
    GROUP BY lang;
$$;

-- Create view for policy draft summary
CREATE VIEW policy_draft_summary AS
SELECT 
    pd.id,
    pd.tenant_id,
    pd.condominium_id,
    pd.scope,
    pd.status,
    pd.requires_human_review,
    pd.grounding_score,
    array_length(pd.rules, 1) as rule_count,
    jsonb_array_length(pd.source_docs) as source_doc_count,
    pd.created_at,
    pd.updated_at,
    pd.reviewed_by,
    pd.published_version
FROM policy_drafts pd;

-- Migration complete
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('002_llm_rag_schema', NOW())
ON CONFLICT (version) DO NOTHING;