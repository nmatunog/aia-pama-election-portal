import Link from 'next/link';
import { tile } from '@/lib/layout-classes';

type LandingPathCardProps = {
  href: string;
  title: string;
  description: string;
  ctaLabel: string;
  accent?: boolean;
  icon: 'register' | 'signin';
  features?: string[];
  footerLink?: { href: string; label: string };
};

function RegisterPathIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
      <circle cx="12" cy="10" r="4" stroke="#1C1C1C" strokeWidth="2" />
      <path
        d="M5 26c0-4 3.1-7 7-7s7 3 7 7"
        stroke="#1C1C1C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M22 9h6M25 6v6" stroke="#63A9FA" strokeWidth="2" strokeLinecap="round" />
      <rect x="19" y="17" width="10" height="10" rx="2" stroke="#E8B923" strokeWidth="2" />
    </svg>
  );
}

function SignInPathIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
      <rect x="6" y="8" width="20" height="18" rx="2" stroke="#D41245" strokeWidth="2" />
      <path d="M10 14h12M10 18h8" stroke="#63A9FA" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="5" fill="#E8B923" />
      <path d="M22 24l1.5 1.5L26 22" stroke="#1C1C1C" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function LandingPathCard({
  href,
  title,
  description,
  ctaLabel,
  accent = false,
  icon,
  features,
  footerLink,
}: LandingPathCardProps) {
  const Icon = icon === 'register' ? RegisterPathIcon : SignInPathIcon;
  const borderClass = accent ? 'border-[#D41245]' : 'border-[#E8E6E3]';

  return (
    <div
      className={`${tile} flex flex-col ${borderClass} ${accent ? 'bg-[#FDF2F5]/30' : 'bg-white'}`}
    >
      <Link href={href} className="group flex flex-1 flex-col hover:opacity-95">
        <div className="flex gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl sm:h-16 sm:w-16 ${
              accent ? 'bg-[#FDF2F5] ring-1 ring-[#D41245]/20' : 'bg-[#F8F7F5]'
            }`}
          >
            <Icon />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              className={`text-lg font-bold sm:text-xl ${accent ? 'text-[#D41245]' : 'text-[#1C1C1C]'}`}
            >
              {title}
            </h2>
            <p className="mt-2 text-sm text-[#4D4D4D] sm:text-base">{description}</p>
          </div>
        </div>

        {features && features.length > 0 && (
          <ul className="mt-5 space-y-2 border-t border-[#E8E6E3] pt-5">
            {features.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#4D4D4D] sm:text-base">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#63A9FA]"
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
        )}

        <p
          className={`mt-6 text-base font-semibold sm:mt-auto sm:pt-6 ${
            accent ? 'text-[#D41245] group-hover:text-[#B0103A]' : 'text-[#63A9FA]'
          }`}
        >
          {ctaLabel} →
        </p>
      </Link>

      {footerLink && (
        <p className="mt-3 border-t border-[#E8E6E3] pt-3 text-sm">
          <Link href={footerLink.href} className="font-medium text-[#63A9FA] underline hover:no-underline">
            {footerLink.label}
          </Link>
        </p>
      )}
    </div>
  );
}
