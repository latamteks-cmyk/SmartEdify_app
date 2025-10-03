import { useQuery } from '@tanstack/react-query'
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { api } from '../lib/api'

export function ServiceStatus() {
  const { data: services, isLoading, refetch } = useQuery({
    queryKey: ['services-health'],
    queryFn: api.getServicesHealth,
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  const handleRefresh = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const healthyServices = services?.filter((s: any) => s.status === 'healthy').length || 0
  const totalServices = services?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estado de Servicios</h1>
          <p className="text-gray-600">
            {healthyServices}/{totalServices} servicios funcionando correctamente
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="btn btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Overall Status */}
      <div className="card">
        <div className="flex items-center space-x-4">
          {healthyServices === totalServices ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : healthyServices > totalServices / 2 ? (
            <Clock className="h-8 w-8 text-yellow-500" />
          ) : (
            <XCircle className="h-8 w-8 text-red-500" />
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {healthyServices === totalServices
                ? 'Todos los servicios operativos'
                : healthyServices > totalServices / 2
                ? 'Servicios parcialmente operativos'
                : 'Servicios con problemas'
              }
            </h2>
            <p className="text-gray-600">
              Última actualización: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services?.map((service: any) => (
          <div key={service.name} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                {service.status === 'healthy' ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <h3 className="font-medium text-gray-900">{service.name}</h3>
                  <p className="text-sm text-gray-500">Puerto {service.port}</p>
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  service.status === 'healthy'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {service.status === 'healthy' ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            {service.data && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Versión:</span>
                  <span className="text-gray-900">{service.data.version || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Entorno:</span>
                  <span className="text-gray-900">{service.data.environment || 'N/A'}</span>
                </div>
                {service.data.database && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Base de datos:</span>
                    <span className="text-gray-900">{service.data.database}</span>
                  </div>
                )}
                {service.data.features && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Características:</p>
                    <div className="space-y-1">
                      {Object.entries(service.data.features).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-gray-500">{key}:</span>
                          <span className={value ? 'text-green-600' : 'text-red-600'}>
                            {value ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {service.data.providers && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Proveedores:</p>
                    <div className="space-y-1">
                      {Object.entries(service.data.providers).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-gray-500">{key}:</span>
                          <span className={value === 'configured' ? 'text-green-600' : 'text-yellow-600'}>
                            {value as string}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {service.error && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800">Error: {service.error}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Service URLs */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">URLs de Servicios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services?.map((service: any) => (
            <div key={service.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{service.name}</p>
                <p className="text-sm text-gray-500">http://localhost:{service.port}</p>
              </div>
              <a
                href={`http://localhost:${service.port}/health`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Probar
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}