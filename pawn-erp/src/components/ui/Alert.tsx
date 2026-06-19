export function Alert({ variant = 'error', children }: { variant?: 'error' | 'info'; children: React.ReactNode }) {
  const styles =
    variant === 'error'
      ? 'bg-red-50 text-red-800 ring-red-200'
      : 'bg-zinc-50 text-zinc-700 ring-zinc-200';
  return (
    <div className={`rounded-lg px-4 py-3 text-sm/6 ring-1 ring-inset ${styles}`}>{children}</div>
  );
}
