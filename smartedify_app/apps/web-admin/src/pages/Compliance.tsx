import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Shield, Search, FileText, Brain } from 'lucide-react'
import { api } from '../lib/api'

export function Compliance() {
  const [policyValidation, setPolicyValidation] = useState({
    action: 'reservation:create',
    resource: 'amenity:pool',
    subject: 'user:123',
  })

  const [ragQuery, setRagQuery] = useState('')

  const validatePolicyMutation = useMutation({
    mutationFn: api.validatePolicy,
  })

  const searchRAGMutation = useMutation({
    mutationFn: api.searchRAG,
  })

  const handleValidatePolicy = () => {
    validatePolicyMutation.mutate(policyValidation)
  }

  const handleSearchRAG = () => {
    if (ragQuery.trim()) {
      searchRAGMutation.mutate({
        q: ragQuery,
        condominiumId: 'tenant-1',
        topK: 5,
        minSimilarity: 0.7,
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
        <p className="text-gray-600">Validación de políticas y búsqueda de conocimiento</p>
      </div>

      {/* Policy Validation */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Validación de Políticas</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acción
            </label>
            <input
              type="text"
              className="input"
              value={policyValidation.action}
              onChange={(e) => setPolicyValidation(prev => ({ ...prev, action: e.target.value }))}
              placeholder="reservation:create"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recurso
            </label>
            <input
              type="text"
              className="input"
              value={policyValidation.resource}
              onChange={(e) => setPolicyValidation(prev => ({ ...prev, resource: e.target.value }))}
              placeholder="amenity:pool"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sujeto
            </label>
            <input
              type="text"
              className="input"
              value={policyValidation.subject}
              onChange={(e) => setPolicyValidation(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="user:123"
            />
          </div>
        </div>

        <button
          onClick={handleValidatePolicy}
          disabled={validatePolicyMutation.isPending}
          className="btn btn-primary"
        >
          {validatePolicyMutation.isPending ? 'Validando...' : 'Validar Política'}
        </button>

        {validatePolicyMutation.data && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Resultado de Validación</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-600">Decisión:</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  validatePolicyMutation.data.decision === 'PERMIT'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {validatePolicyMutation.data.decision}
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-sm font-medium text-gray-600">Razón:</span>
                <span className="text-sm text-gray-900">{validatePolicyMutation.data.reason}</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-sm font-medium text-gray-600">ID Política:</span>
                <span className="text-sm text-gray-900">{validatePolicyMutation.data.policyId}</span>
              </div>
            </div>
          </div>
        )}

        {validatePolicyMutation.error && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-800">
              Error: {validatePolicyMutation.error.message}
            </p>
          </div>
        )}
      </div>

      {/* RAG Search */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Search className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-medium text-gray-900">Búsqueda RAG</h3>
        </div>

        <div className="flex space-x-4 mb-4">
          <input
            type="text"
            className="input flex-1"
            value={ragQuery}
            onChange={(e) => setRagQuery(e.target.value)}
            placeholder="Buscar en la base de conocimiento..."
            onKeyPress={(e) => e.key === 'Enter' && handleSearchRAG()}
          />
          <button
            onClick={handleSearchRAG}
            disabled={searchRAGMutation.isPending || !ragQuery.trim()}
            className="btn btn-primary"
          >
            {searchRAGMutation.isPending ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {searchRAGMutation.data && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">
              Resultados ({searchRAGMutation.data.data.total})
            </h4>
            {searchRAGMutation.data.data.results.map((result: any, index: number) => (
              <div key={result.id || index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{result.title}</h5>
                  <span className="text-sm text-gray-500">
                    Similitud: {(result.similarity * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{result.content}</p>
                {result.metadata && (
                  <div className="flex space-x-4 text-xs text-gray-500">
                    <span>Tipo: {result.metadata.type}</span>
                    <span>Sección: {result.metadata.section}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {searchRAGMutation.error && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-800">
              Error: {searchRAGMutation.error.message}
            </p>
          </div>
        )}
      </div>

      {/* LLM Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Brain className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-medium text-gray-900">Compilación de Políticas</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Compila documentos en políticas ejecutables usando LLM
          </p>
          <button className="btn btn-secondary w-full">
            Compilar Políticas
          </button>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-medium text-gray-900">Explicación de Decisiones</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Genera explicaciones detalladas de decisiones de políticas
          </p>
          <button className="btn btn-secondary w-full">
            Explicar Decisión
          </button>
        </div>
      </div>
    </div>
  )
}