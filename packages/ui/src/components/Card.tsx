import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  selected?: boolean;
};

export function Card({
  children,
  selected = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-xl border-2 bg-surface-card p-5 transition-colors ${
        selected
          ? 'border-aia-red bg-aia-red-subtle'
          : 'border-border hover:border-ink-secondary/30'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
