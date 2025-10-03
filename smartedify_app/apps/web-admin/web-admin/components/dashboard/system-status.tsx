import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  uptime: string;
}

interface SystemStatusProps {
  status: {
    overall: 'healthy' | 'warning' | 'error';
    services: ServiceStatus[];
  };
}

const statusIcons = {
  healthy: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
};

const statusColors = {
  healthy: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
};

const statusBadges = {
  healthy: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
};

export function SystemStatus({ status }: SystemStatusProps) {
  const OverallIcon = statusIcons[status.overall];

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Estado del Sistema</h3>
          <div className="flex items-center">
            <OverallIcon className={clsx('h-5 w-5 mr-2', statusColors[status.overall])} />
            <span
              className={clsx(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                statusBadges[status.overall]
              )}
            >
              {status.overall === 'healthy' && 'Operacional'}
              {status.overall === 'warning' && 'Advertencia'}
              {status.overall === 'error' && 'Error'}
            </span>
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="space-y-3">
          {status.services.map((service) => {
            const Icon = statusIcons[service.status];
            return (
              <div key={service.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <Icon className={clsx('h-4 w-4 mr-3', statusColors[service.status])} />
                  <span className="text-sm font-medium text-gray-900">{service.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">{service.uptime}</span>
                  <span
                    className={clsx(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      statusBadges[service.status]
                    )}
                  >
                    {service.status === 'healthy' && 'OK'}
                    {service.status === 'warning' && 'Warn'}
                    {service.status === 'error' && 'Error'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Última actualización: {new Date().toLocaleTimeString('es-ES')}
          </p>
        </div>
      </div>
    </div>
  );
}