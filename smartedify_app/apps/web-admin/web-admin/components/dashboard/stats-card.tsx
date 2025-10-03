import Link from 'next/link';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';

interface StatsCardProps {
  name: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href?: string;
}

export function StatsCard({ name, value, change, changeType, icon: Icon, href }: StatsCardProps) {
  const content = (
    <div className="card hover:shadow-medium transition-shadow duration-200">
      <div className="card-body">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8 text-gray-400" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{name}</dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">{value}</div>
                <div
                  className={clsx(
                    'ml-2 flex items-baseline text-sm font-semibold',
                    changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {changeType === 'increase' ? (
                    <ArrowUpIcon className="h-3 w-3 flex-shrink-0 self-center" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3 flex-shrink-0 self-center" />
                  )}
                  <span className="ml-1">{change}</span>
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}