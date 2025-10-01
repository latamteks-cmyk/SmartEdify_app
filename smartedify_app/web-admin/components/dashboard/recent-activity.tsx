import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  UsersIcon, 
  CalendarDaysIcon, 
  UserPlusIcon, 
  ShieldCheckIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface Activity {
  id: string;
  type: 'assembly' | 'reservation' | 'user' | 'policy' | 'document';
  title: string;
  description: string;
  timestamp: string;
  user: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

const activityIcons = {
  assembly: UsersIcon,
  reservation: CalendarDaysIcon,
  user: UserPlusIcon,
  policy: ShieldCheckIcon,
  document: DocumentTextIcon,
};

const activityColors = {
  assembly: 'bg-blue-100 text-blue-600',
  reservation: 'bg-green-100 text-green-600',
  user: 'bg-purple-100 text-purple-600',
  policy: 'bg-yellow-100 text-yellow-600',
  document: 'bg-gray-100 text-gray-600',
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-medium text-gray-900">Actividad Reciente</h3>
      </div>
      <div className="card-body">
        <div className="flow-root">
          <ul className="-mb-8">
            {activities.map((activity, activityIdx) => {
              const Icon = activityIcons[activity.type];
              return (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {activityIdx !== activities.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span
                          className={clsx(
                            'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white',
                            activityColors[activity.type]
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-500">{activity.description}</p>
                          <p className="text-xs text-gray-400">por {activity.user}</p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}