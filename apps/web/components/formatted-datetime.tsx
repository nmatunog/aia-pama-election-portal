'use client';

import { formatDateTime, formatDateTimeLong } from '@/lib/format-datetime';

type Props = {
  iso: string;
  variant?: 'default' | 'long';
  className?: string;
};

/** Locale-safe datetime for client components (SSR + hydration match) */
export function FormattedDateTime({ iso, variant = 'default', className }: Props) {
  const text = variant === 'long' ? formatDateTimeLong(iso) : formatDateTime(iso);
  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
