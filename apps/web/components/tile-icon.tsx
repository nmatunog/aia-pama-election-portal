import type { ReactElement } from 'react';

export type TileIconName = 'vote' | 'nominate' | 'profile' | 'info' | 'admin';

type TileIconProps = {
  name: TileIconName;
  accent?: boolean;
  enabled?: boolean;
};

const BRAND = {
  red: '#D41245',
  blue: '#63A9FA',
  yellow: '#E8B923',
  ink: '#1C1C1C',
  muted: '#9A9A9A',
};

function iconColors(accent: boolean, enabled: boolean) {
  if (!enabled) {
    return { primary: BRAND.muted, secondary: BRAND.muted, tertiary: BRAND.muted };
  }
  if (accent) {
    return { primary: BRAND.red, secondary: BRAND.blue, tertiary: BRAND.yellow };
  }
  return { primary: BRAND.ink, secondary: BRAND.blue, tertiary: BRAND.red };
}

function VoteIcon({ colors }: { colors: ReturnType<typeof iconColors> }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden>
      <rect x="8" y="6" width="16" height="20" rx="2" stroke={colors.primary} strokeWidth="2" />
      <path d="M12 12h8M12 16h8M12 20h5" stroke={colors.secondary} strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="22" r="5" fill={colors.tertiary} />
      <path d="M20 22l1.5 1.5L24 20" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function NominateIcon({ colors }: { colors: ReturnType<typeof iconColors> }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden>
      <circle cx="13" cy="11" r="4" stroke={colors.primary} strokeWidth="2" />
      <path
        d="M6 26c0-3.5 3.1-6 7-6s7 2.5 7 6"
        stroke={colors.primary}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 8h6M25 5v6"
        stroke={colors.secondary}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M20 18l4-6 4 3" stroke={colors.tertiary} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon({ colors }: { colors: ReturnType<typeof iconColors> }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden>
      <circle cx="16" cy="11" r="5" stroke={colors.primary} strokeWidth="2" />
      <path
        d="M8 27c0-4.5 3.6-8 8-8s8 3.5 8 8"
        stroke={colors.primary}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="4" fill={colors.secondary} fillOpacity="0.25" stroke={colors.secondary} strokeWidth="1.5" />
      <path d="M24 22v4M22 24h4" stroke={colors.secondary} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon({ colors }: { colors: ReturnType<typeof iconColors> }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden>
      <rect x="6" y="8" width="20" height="18" rx="2" stroke={colors.primary} strokeWidth="2" />
      <path d="M10 14h12M10 18h8M10 22h10" stroke={colors.secondary} strokeWidth="2" strokeLinecap="round" />
      <rect x="20" y="4" width="8" height="8" rx="4" fill={colors.tertiary} />
      <path d="M23 6v4M21 8h4" stroke={colors.primary} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function AdminIcon({ colors }: { colors: ReturnType<typeof iconColors> }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden>
      <path
        d="M16 5l9 4v6c0 6-3.8 9.5-9 12-5.2-2.5-9-6-9-12V9l9-4z"
        stroke={colors.primary}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 15l3 3 6-6"
        stroke={colors.secondary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const icons: Record<
  TileIconName,
  (props: { colors: ReturnType<typeof iconColors> }) => ReactElement
> = {
  vote: VoteIcon,
  nominate: NominateIcon,
  profile: ProfileIcon,
  info: InfoIcon,
  admin: AdminIcon,
};

/** Action tile icon — matches association palette (red, blue, gold) */
export function TileIcon({ name, accent = false, enabled = true }: TileIconProps) {
  const colors = iconColors(accent, enabled);
  const Icon = icons[name];

  const bg = !enabled
    ? 'bg-[#F0EFED]'
    : accent
      ? 'bg-[#FDF2F5] ring-1 ring-[#D41245]/20'
      : 'bg-[#F8F7F5]';

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 ${bg}`}
      aria-hidden
    >
      <Icon colors={colors} />
    </div>
  );
}
