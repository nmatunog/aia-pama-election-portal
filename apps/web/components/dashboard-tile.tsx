import Link from 'next/link';
import { TileIcon, type TileIconName } from './tile-icon';
import { tile } from '@/lib/layout-classes';

type DashboardTileProps = {
  title: string;
  description: string;
  href: string;
  icon: TileIconName;
  accent?: boolean;
  enabled?: boolean;
  disabledMessage?: string;
};

export function DashboardTile({
  title,
  description,
  href,
  icon,
  accent = false,
  enabled = true,
  disabledMessage,
}: DashboardTileProps) {
  const className = `${tile} ${
    enabled
      ? `hover:border-[#4D4D4D]/30 ${accent ? 'border-[#D41245]' : 'border-[#E8E6E3]'}`
      : 'cursor-not-allowed border-[#E8E6E3] opacity-60'
  }`;

  const content = (
    <div className="flex gap-4">
      <TileIcon name={icon} accent={accent} enabled={enabled} />
      <div className="min-w-0 flex-1">
        <h3
          className={`text-base font-semibold sm:text-lg ${
            enabled && accent ? 'text-[#D41245]' : 'text-[#1C1C1C]'
          }`}
        >
          {title}
        </h3>
        <p className="mt-2 text-sm text-[#4D4D4D] sm:text-base">{description}</p>
        {!enabled && disabledMessage && (
          <p className="mt-3 text-sm font-medium text-[#9A6700]">{disabledMessage}</p>
        )}
      </div>
    </div>
  );

  if (!enabled) {
    return (
      <div className={className} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
