import { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'plain';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950',
  secondary:
    'bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-950/10 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400',
  ghost: 'text-zinc-600 hover:bg-zinc-950/5 hover:text-zinc-950',
  plain: 'text-zinc-500 hover:text-zinc-950 disabled:text-zinc-300',
  danger: 'text-red-600 hover:bg-red-50',
};

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm/6 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variant !== 'plain' && variants[variant],
        variant === 'plain' && variants.plain,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
