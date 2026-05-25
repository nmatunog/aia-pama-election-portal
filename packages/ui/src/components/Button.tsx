import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'help';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-aia-red text-white hover:bg-aia-red-hover focus-visible:outline focus-visible:outline-3 focus-visible:outline-aia-red focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'bg-surface-card text-ink-primary border-2 border-border hover:bg-surface-page focus-visible:outline focus-visible:outline-3 focus-visible:outline-aia-red focus-visible:outline-offset-2',
  help: 'bg-transparent text-aia-blue underline hover:no-underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-aia-blue focus-visible:outline-offset-2',
};

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-[48px] items-center justify-center rounded-lg px-6 text-lg font-semibold transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
