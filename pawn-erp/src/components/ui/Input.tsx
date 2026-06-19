import { InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const fieldClass =
  'block w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm/6 text-zinc-950 shadow-sm ring-1 ring-zinc-950/10 ring-inset placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-zinc-950 disabled:bg-zinc-50 disabled:text-zinc-500';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, 'min-h-[80px] resize-y', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClass, className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('block text-sm/6 font-medium text-zinc-950', className)} {...props}>
      {children}
    </label>
  );
}

/** Uniform required-field asterisk — use via Field `required` or RequiredLabel */
export function RequiredMark() {
  return (
    <span className="font-medium text-red-600" aria-hidden="true">
      {' '}
      *
    </span>
  );
}

export function RequiredLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <>
      {children}
      {required && <RequiredMark />}
    </>
  );
}

export function Field({
  label,
  children,
  className,
  required,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>
        <RequiredLabel required={required}>{label}</RequiredLabel>
      </Label>
      {children}
    </div>
  );
}
