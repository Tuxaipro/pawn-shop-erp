import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ page, totalPages, total, onPageChange, className }: PaginationProps) {
  const { t } = useTranslation('common');
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-t border-zinc-950/5 px-4 py-3 sm:px-6',
        className
      )}
    >
      <p className="text-sm/6 text-zinc-500">
        {t('pagination.page_of', { page, totalPages })}
        {total !== undefined && (
          <>
            {' '}
            · {t('pagination.results', { count: total })}
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm/6 font-medium transition',
            canPrev
              ? 'text-zinc-700 hover:bg-zinc-950/5 hover:text-zinc-950'
              : 'cursor-not-allowed text-zinc-300'
          )}
        >
          <ChevronIcon className="rotate-180" />
          {t('pagination.previous')}
        </button>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm/6 font-medium transition',
            canNext
              ? 'text-zinc-700 hover:bg-zinc-950/5 hover:text-zinc-950'
              : 'cursor-not-allowed text-zinc-300'
          )}
        >
          {t('pagination.next')}
          <ChevronIcon />
        </button>
      </div>
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('h-4 w-4', className)} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}
