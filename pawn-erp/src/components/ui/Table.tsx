import { cn } from '../../lib/cn';
import { RequiredLabel } from './Input';

export function TableCard({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DataTable({ children }: { children: React.ReactNode }) {
  return <table className="min-w-full text-left text-sm/6">{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-zinc-950/5 text-zinc-500">{children}</thead>;
}

export function TH({
  children,
  className,
  required,
}: {
  children?: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <th className={cn('px-4 py-3 font-medium first:pl-6 last:pr-6 sm:px-6', className)}>
      <RequiredLabel required={required}>{children}</RequiredLabel>
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-zinc-950/5">{children}</tbody>;
}

export function TD({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn('px-4 py-4 text-zinc-700 first:pl-6 last:pr-6 sm:px-6', className)}>
      {children}
    </td>
  );
}
