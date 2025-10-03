import { useQuery } from '@tanstack/react-query'
import { Building2, Users, MapPin } from 'lucide-react'
import { api } from '../lib/api'

export function Tenants() {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: api.getTenants,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Condominios</h1>
          <p className="text-gray-600">Gestión de condominios registrados</p>
        </div>
        <button className="btn btn-primary">Nuevo Condominio</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants?.data?.map((tenant: any) => (
          <div key={tenant.id} className="card">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900">{tenant.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{tenant.type}</p>
                
                <div className="mt-3 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {tenant.address}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {tenant.units} unidades
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    tenant.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tenant.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    Ver detalles
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}