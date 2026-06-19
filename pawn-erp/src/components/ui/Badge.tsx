import { cn } from '../../lib/cn';

const styles: Record<string, string> = {
  open: 'bg-emerald-500/10 text-emerald-700 ring-emerald-600/20',
  closed: 'bg-zinc-500/10 text-zinc-600 ring-zinc-500/20',
  renewed: 'bg-amber-500/10 text-amber-800 ring-amber-600/20',
  soon: 'bg-zinc-500/10 text-zinc-600 ring-zinc-500/20',
  dark: 'bg-white/10 text-zinc-400 ring-white/10',
  danger: 'bg-red-500/10 text-red-700 ring-red-600/20',
};

export function Badge({
  variant = 'soon',
  children,
}: {
  variant?: keyof typeof styles;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        styles[variant] ?? styles.soon
      )}
    >
      {children}
    </span>
  );
}
