import { useQuery } from '@tanstack/react-query'
import { Building2, Calendar, CreditCard, Users, TrendingUp, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'

export function Dashboard() {
  const { data: services } = useQuery({
    queryKey: ['services-health'],
    queryFn: api.getServicesHealth,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: tenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: api.getTenants,
  })

  const { data: reservations } = useQuery({
    queryKey: ['reservations'],
    queryFn: api.getReservations,
  })

  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: api.getOrders,
  })

  const stats = [
    {
      name: 'Condominios Activos',
      value: tenants?.data?.length || 0,
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Reservas Hoy',
      value: reservations?.data?.filter((r: any) => 
        new Date(r.startTime).toDateString() === new Date().toDateString()
      ).length || 0,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Órdenes Pendientes',
      value: orders?.data?.filter((o: any) => o.status === 'PENDING').length || 0,
      icon: CreditCard,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      name: 'Servicios Activos',
      value: services?.filter((s: any) => s.status === 'healthy').length || 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen general del sistema SmartEdify</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Estado de Servicios</h3>
          <div className="space-y-3">
            {services?.map((service: any) => (
              <div key={service.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`h-2 w-2 rounded-full ${
                    service.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-sm font-medium text-gray-900">{service.name}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  service.status === 'healthy' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {service.status === 'healthy' ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actividad Reciente</h3>
          <div className="space-y-3">
            {reservations?.data?.slice(0, 5).map((reservation: any) => (
              <div key={reservation.id} className="flex items-start space-x-3">
                <Calendar className="h-4 w-4 text-gray-400 mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    Nueva reserva para {reservation.amenityName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(reservation.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  reservation.status === 'CONFIRMED' 
                    ? 'bg-green-100 text-green-800'
                    : reservation.status === 'PENDING_PAYMENT'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {reservation.status}
                </span>
              </div>
            )) || (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No hay actividad reciente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="btn btn-primary flex items-center justify-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Nuevo Condominio</span>
          </button>
          <button className="btn btn-secondary flex items-center justify-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Ver Reservas</span>
          </button>
          <button className="btn btn-secondary flex items-center justify-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Gestionar Pagos</span>
          </button>
        </div>
      </div>
    </div>
  )
}