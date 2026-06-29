import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { cn } from '../lib/cn';
import { Button } from './ui/Button';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
  action?: { label: string; to: string };
  actions?: ReactNode;
  compact?: boolean;
}

export function PageHeader({ title, subtitle, aside, action, actions, compact }: PageHeaderProps) {
  const { t } = useTranslation('common');
  const h = new Date().getHours();
  const greeting =
    h < 12 ? t('greeting.morning') : h < 17 ? t('greeting.afternoon') : t('greeting.evening');

  return (
    <div className={compact ? 'mb-6' : 'mb-10'}>
      {!compact && <p className="text-sm/6 font-medium text-zinc-500">{greeting}</p>}
      <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', !compact && 'mt-1')}>
        <div className="flex flex-wrap items-end gap-4 sm:gap-6">
          <div>
            <h1 className="text-2xl/8 font-semibold tracking-tight text-zinc-950 sm:text-3xl/9">
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-sm/6 text-zinc-500">{subtitle}</p>}
          </div>
          {aside}
        </div>
        {actions}
        {action && (
          <Link to={action.to} className="shrink-0 no-underline hover:no-underline">
            <Button>{action.label}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
