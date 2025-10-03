import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, Users, MapPin } from 'lucide-react'
import { api } from '../lib/api'

export function Reservations() {
  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations'],
    queryFn: api.getReservations,
  })

  const { data: amenities } = useQuery({
    queryKey: ['amenities'],
    queryFn: api.getAmenities,
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
          <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-600">Gestión de reservas de amenidades</p>
        </div>
        <button className="btn btn-primary">Nueva Reserva</button>
      </div>

      {/* Amenities Overview */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Amenidades Disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {amenities?.data?.map((amenity: any) => (
            <div key={amenity.id} className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">{amenity.name}</h4>
              <p className="text-sm text-gray-600">Capacidad: {amenity.capacity} personas</p>
              <p className="text-sm text-gray-600">
                Precio: {amenity.currency} {amenity.pricePerHour}/hora
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Reservations List */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Reservas Recientes</h3>
        <div className="space-y-4">
          {reservations?.data?.map((reservation: any) => (
            <div key={reservation.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{reservation.amenityName}</h4>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {new Date(reservation.startTime).toLocaleString()} - 
                        {new Date(reservation.endTime).toLocaleString()}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        {reservation.partySize} personas
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        {reservation.condominiumId}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    reservation.status === 'CONFIRMED' 
                      ? 'bg-green-100 text-green-800'
                      : reservation.status === 'PENDING_PAYMENT'
                      ? 'bg-yellow-100 text-yellow-800'
                      : reservation.status === 'ACTIVE'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {reservation.status}
                  </span>
                  {reservation.priceAmount > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {reservation.currency} {reservation.priceAmount}
                    </p>
                  )}
                </div>
              </div>
              
              {reservation.orderId && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Orden: {reservation.orderId}
                  </p>
                </div>
              )}
            </div>
          )) || (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay reservas registradas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}