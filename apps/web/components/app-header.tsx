import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogoSlot, PamaLogo } from './pama-logo';
import { headerInner, headerInnerNarrow, navLink } from '@/lib/layout-classes';

type AppHeaderProps = {
  variant?: 'wide' | 'narrow';
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  showLogo?: boolean;
};

export function AppHeader({
  variant = 'wide',
  backHref,
  backLabel = '← Back',
  title,
  subtitle,
  right,
  showLogo = false,
}: AppHeaderProps) {
  const inner = variant === 'narrow' ? headerInnerNarrow : headerInner;

  if (backHref && !showLogo && !title) {
    return (
      <header className="border-b border-[#E8E6E3] bg-white safe-top">
        <div className={inner}>
          <Link href={backHref} className={navLink}>
            {backLabel}
          </Link>
          {right}
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-[#E8E6E3] bg-white safe-top">
      <div className={`${inner} flex-wrap sm:flex-nowrap`}>
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          {showLogo && (
            <LogoSlot className="rounded-lg bg-black px-1.5 py-1">
              <PamaLogo context="header" priority className="block" />
            </LogoSlot>
          )}
          {(title || subtitle) && (
            <div className="flex min-w-0 flex-col justify-center">
              {title && (
                <h1 className="text-base font-bold leading-tight text-[#1C1C1C] sm:text-lg md:text-xl">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="truncate text-sm text-[#4D4D4D] sm:text-base">{subtitle}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-3 sm:w-auto">
          {backHref && (
            <Link href={backHref} className={`${navLink} sm:order-last`}>
              {backLabel}
            </Link>
          )}
          {right}
        </div>
      </div>
    </header>
  );
}
