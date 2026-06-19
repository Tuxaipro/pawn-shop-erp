import { createContext, useCallback, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type PendingConfirm = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => close(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl ring-1 ring-zinc-950/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-zinc-950">
              {pending.options.title ?? t('confirm.delete_title')}
            </h3>
            <p className="mt-2 text-sm text-zinc-600">{pending.options.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => close(false)}>
                {pending.options.cancelLabel ?? t('actions.cancel')}
              </Button>
              <Button type="button" variant="danger" onClick={() => close(true)}>
                {pending.options.confirmLabel ?? t('actions.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
