import type { ReactNode } from 'react';
import Image from 'next/image';

/** Where the logo appears — keeps size and alignment consistent */
export type LogoContext = 'header' | 'hero' | 'mark';

type PamaLogoProps = {
  className?: string;
  priority?: boolean;
  /**
   * `header` — app bars (dashboard, etc.), vertically centered with titles
   * `hero` — login / nominate page tops
   * `mark` — small mark beside tiles or list items
   */
  context?: LogoContext;
  /** @deprecated Use context. Kept for favicon-only square asset if needed. */
  variant?: 'association' | 'square';
};

const ASSOCIATION_SRC = '/aia-pama-login-icon.png';
const SQUARE_SRC = '/pama-logo.png';
const ASPECT = 442 / 478;

/** Height classes per context — width follows aspect ratio via w-auto */
const contextHeights: Record<LogoContext, string> = {
  header: 'h-10 w-auto sm:h-11 md:h-12',
  hero: 'h-[72px] w-auto sm:h-[88px] md:h-[100px] lg:h-[110px]',
  mark: 'h-9 w-auto sm:h-10',
};

/**
 * Official AIA-PAMA association emblem (three-figure mark).
 * Use the same asset everywhere for visual consistency.
 */
export function PamaLogo({
  className = '',
  priority = false,
  context = 'header',
  variant = 'association',
}: PamaLogoProps) {
  if (variant === 'square') {
    const squareClass =
      context === 'mark'
        ? 'h-9 w-9 sm:h-10 sm:w-10'
        : context === 'hero'
          ? 'h-16 w-16 sm:h-20 sm:w-20'
          : 'h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12';
    return (
      <Image
        src={SQUARE_SRC}
        alt="AIA-PAMA"
        width={56}
        height={56}
        className={`object-contain ${squareClass} ${className}`.trim()}
        priority={priority}
        sizes="56px"
      />
    );
  }

  const heightClass = contextHeights[context];

  return (
    <Image
      src={ASSOCIATION_SRC}
      alt="AIA-PAMA"
      width={478}
      height={442}
      className={`object-contain object-left ${heightClass} ${className}`.trim()}
      priority={priority}
      sizes={
        context === 'hero'
          ? '(max-width: 640px) 72px, (max-width: 1024px) 100px, 110px'
          : context === 'mark'
            ? '40px'
            : '(max-width: 640px) 40px, 48px'
      }
    />
  );
}

/** Fixed-height slot so headers align logo + text on one baseline */
export function LogoSlot({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${className}`.trim()}
      style={{ minHeight: '2.75rem' }}
    >
      {children}
    </div>
  );
}
