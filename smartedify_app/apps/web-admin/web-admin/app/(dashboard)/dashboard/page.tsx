'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { useTenant } from '@/lib/tenant/tenant-context';
import { 
  BuildingOfficeIcon,
  UsersIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { SystemStatus } from '@/components/dashboard/system-status';

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentTenant, currentCondominium } = useTenant();

  const stats = [
    {
      name: 'Condominios Activos',
      value: '12',
      change: '+2',
      changeType: 'increase' as const,
      icon: BuildingOfficeIcon,
      href: '/condominiums',
    },
    {
      name: 'Usuarios Totales',
      value: '1,247',
      change: '+18',
      changeType: 'increase' as const,
      icon: UsersIcon,
      href: '/users',
    },
    {
      name: 'Reservas Hoy',
      value: '23',
      change: '-2',
      changeType: 'decrease' as const,
      icon: CalendarDaysIcon,
      href: '/reservations',
    },
    {
      name: 'Ingresos Mes',
      value: 'S/ 45,230',
      change: '+12%',
      changeType: 'increase' as const,
      icon: CurrencyDollarIcon,
      href: '/finance',
    },
    {
      name: 'Políticas Activas',
      value: '8',
      change: '+1',
      changeType: 'increase' as const,
      icon: ShieldCheckIcon,
      href: '/compliance',
    },
    {
      name: 'Documentos',
      value: '156',
      change: '+5',
      changeType: 'increase' as const,
      icon: DocumentTextIcon,
      href: '/documents',
    },
  ];

  const quickActions = [
    {
      name: 'Nueva Asamblea',
      description: 'Crear una nueva asamblea de propietarios',
      href: '/governance/assemblies/new',
      icon: UsersIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Gestionar Usuarios',
      description: 'Administrar usuarios y permisos',
      href: '/users',
      icon: UsersIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Ver Reservas',
      description: 'Revisar reservas de amenidades',
      href: '/reservations',
      icon: CalendarDaysIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Reportes Financieros',
      description: 'Generar reportes de ingresos y gastos',
      href: '/finance/reports',
      icon: ChartBarIcon,
      color: 'bg-yellow-500',
    },
  ];

  const recentActivities = [
    {
      id: '1',
      type: 'assembly',
      title: 'Asamblea Ordinaria 2024-01',
      description: 'Nueva asamblea creada para el 15 de enero',
      timestamp: '2024-01-01T10:30:00Z',
      user: 'Admin Sistema',
    },
    {
      id: '2',
      type: 'reservation',
      title: 'Reserva Piscina',
      description: 'Juan Pérez reservó la piscina para mañana',
      timestamp: '2024-01-01T09:15:00Z',
      user: 'Juan Pérez',
    },
    {
      id: '3',
      type: 'user',
      title: 'Nuevo Usuario',
      description: 'María García fue agregada como propietaria',
      timestamp: '2024-01-01T08:45:00Z',
      user: 'Admin Sistema',
    },
    {
      id: '4',
      type: 'policy',
      title: 'Política Actualizada',
      description: 'Política de reservas fue modificada',
      timestamp: '2024-01-01T08:00:00Z',
      user: 'Admin Sistema',
    },
  ];

  const systemStatus = {
    overall: 'healthy' as const,
    services: [
      { name: 'Identity Service', status: 'healthy' as const, uptime: '99.9%' },
      { name: 'Tenancy Service', status: 'healthy' as const, uptime: '99.8%' },
      { name: 'Governance Service', status: 'healthy' as const, uptime: '99.7%' },
      { name: 'Compliance Service', status: 'healthy' as const, uptime: '99.9%' },
      { name: 'Reservation Service', status: 'warning' as const, uptime: '98.5%' },
      { name: 'Finance Service', status: 'healthy' as const, uptime: '99.6%' },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Bienvenido de vuelta, {user?.name}
          {currentCondominium && (
            <span className="ml-2 text-primary-600">
              • {currentCondominium.name}
            </span>
          )}
        </p>
      </div>

      {/* Tenant Context Indicator */}
      {currentTenant && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-5 w-5 text-primary-600 mr-2" />
            <span className="text-sm font-medium text-primary-900">
              Contexto actual: {currentTenant.name}
              {currentCondominium && ` → ${currentCondominium.name}`}
            </span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatsCard key={stat.name} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions */}
        <div className="lg:col-span-1">
          <QuickActions actions={quickActions} />
        </div>

        {/* Middle Column - Recent Activity */}
        <div className="lg:col-span-1">
          <RecentActivity activities={recentActivities} />
        </div>

        {/* Right Column - System Status */}
        <div className="lg:col-span-1">
          <SystemStatus status={systemStatus} />
        </div>
      </div>

      {/* Alerts Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              Recordatorios Importantes
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Asamblea ordinaria programada para el 15 de enero</li>
                <li>Renovación de certificados SSL en 30 días</li>
                <li>Backup de base de datos completado exitosamente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}