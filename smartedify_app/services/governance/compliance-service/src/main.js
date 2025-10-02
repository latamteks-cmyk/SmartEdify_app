// Mock Compliance Service for testing
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3012;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'compliance-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      llm_policies: process.env.FEATURE_LLM_POLICIES === 'true',
      compliance_validation: process.env.FEATURE_COMPLIANCE_VALIDATION === 'true'
    }
  });
});

// Mock policy validation
app.post('/policies/validate', (req, res) => {
  const { action, resource, subject, context } = req.body;
  
  // Mock validation logic
  const isAllowed = Math.random() > 0.2; // 80% success rate for testing
  
  res.json({
    success: true,
    decision: isAllowed ? 'PERMIT' : 'DENY',
    reason: isAllowed ? 'Policy allows this action' : 'Policy denies this action',
    policyId: 'mock-policy-' + Date.now(),
    evaluatedAt: new Date().toISOString(),
    context: {
      action,
      resource,
      subject,
      ...context
    }
  });
});

// Mock LLM policy compilation
app.post('/llm/policies/compile', (req, res) => {
  const { condominiumId, scope, docRefs } = req.body;
  
  res.json({
    success: true,
    data: {
      id: 'policy-draft-' + Date.now(),
      condominiumId,
      scope,
      rules: [
        {
          id: 'rule-1',
          condition: 'user.role == "resident"',
          action: 'PERMIT',
          resource: 'amenity:pool'
        },
        {
          id: 'rule-2',
          condition: 'time.hour >= 6 && time.hour <= 22',
          action: 'PERMIT',
          resource: 'amenity:*'
        }
      ],
      groundingScore: 0.85,
      citations: docRefs || [],
      compiledAt: new Date().toISOString()
    }
  });
});

// Mock policy explanation
app.post('/llm/policies/explain', (req, res) => {
  const { condominiumId, action, resource, subject, decision } = req.body;
  
  res.json({
    success: true,
    data: {
      explanation: `The ${decision.toLowerCase()} decision for ${action} on ${resource} by ${subject} is based on the condominium policies and regulations.`,
      citations: [
        {
          document: 'Reglamento Interno',
          section: '4.2',
          text: 'Los residentes pueden usar las amenidades en horarios establecidos'
        }
      ],
      confidence: 0.92,
      generatedAt: new Date().toISOString()
    }
  });
});

// Mock RAG search
app.get('/llm/rag/search', (req, res) => {
  const { q, condominiumId, topK = 5, minSimilarity = 0.7 } = req.query;
  
  res.json({
    success: true,
    data: {
      results: [
        {
          id: 'doc-1',
          title: 'Reglamento de Amenidades',
          content: 'Las amenidades están disponibles para todos los residentes...',
          similarity: 0.95,
          metadata: {
            type: 'regulation',
            section: 'amenities'
          }
        },
        {
          id: 'doc-2',
          title: 'Horarios de Funcionamiento',
          content: 'Los horarios de las amenidades son de 6:00 AM a 10:00 PM...',
          similarity: 0.88,
          metadata: {
            type: 'schedule',
            section: 'operations'
          }
        }
      ],
      total: 2,
      query: q,
      condominiumId
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`⚖️ Compliance Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});