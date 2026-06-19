import { cn } from '../../lib/cn';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm/6 font-semibold text-zinc-950">{children}</h3>;
}
