import { createContext, useCallback, useContext, useState } from 'react';
import { cn } from '../lib/cn';

export type ToastType = 'error' | 'success' | 'info';

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

const ToastContext = createContext<((message: string, type?: ToastType) => void) | null>(null);

const TOAST_DURATION_MS = 4000;

const typeStyles: Record<ToastType, string> = {
  error: 'bg-red-50 text-red-900 ring-red-200',
  success: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  info: 'bg-zinc-50 text-zinc-900 ring-zinc-200',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'error') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="alert"
            className={cn(
              'pointer-events-auto rounded-lg px-4 py-3 text-sm font-medium shadow-lg ring-1',
              typeStyles[item.type]
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
