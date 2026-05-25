import Link from 'next/link';
import { LogoSlot, PamaLogo } from './pama-logo';
import { headerInner, navLink } from '@/lib/layout-classes';

type SiteHeaderProps = {
  title?: string;
  rightLink?: { href: string; label: string };
};

export function SiteHeader({ title, rightLink }: SiteHeaderProps) {
  return (
    <header className="border-b border-[#E8E6E3] bg-white safe-top">
      <div
        className={`${headerInner} flex-col items-stretch gap-4 sm:flex-row sm:items-center`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <LogoSlot className="rounded-lg bg-black px-1.5 py-1">
            <PamaLogo context="header" priority className="block" />
          </LogoSlot>
          {title && (
            <h1 className="min-w-0 text-base font-bold leading-snug text-[#1C1C1C] sm:text-xl md:text-2xl">
              {title}
            </h1>
          )}
        </div>
        {rightLink && (
          <Link
            href={rightLink.href}
            className={`${navLink} w-full justify-center sm:w-auto sm:justify-end`}
          >
            {rightLink.label}
          </Link>
        )}
      </div>
    </header>
  );
}
