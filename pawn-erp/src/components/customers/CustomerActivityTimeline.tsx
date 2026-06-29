import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { customersApi, type CustomerActivity } from '../../api/customers';
import { Card, CardTitle } from '../ui/Card';
import { formatDateTimeIN } from '../../lib/formatDate';

const formatWhen = formatDateTimeIN;

export function CustomerActivityTimeline({ customerId }: { customerId: number }) {
  const { t } = useTranslation('customer');
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['customers', customerId, 'activities'],
    queryFn: () => customersApi.activities(customerId),
  });

  return (
    <Card>
      <CardTitle>{t('activity.title')}</CardTitle>
      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-500">{t('activity.loading')}</p>
      ) : activities.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">{t('activity.empty')}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {activities.map((item: CustomerActivity) => (
            <li key={item.id} className="rounded-lg border border-zinc-100 px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-zinc-950">
                  {t(`activity.actions.${item.action}`, { defaultValue: item.action })}
                </span>
                <time className="text-xs text-zinc-500">{formatWhen(item.createdOn)}</time>
              </div>
              <p className="mt-1 text-zinc-600">{item.description}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
