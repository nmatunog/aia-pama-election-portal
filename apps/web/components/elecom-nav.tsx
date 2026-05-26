'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/roster', label: 'Signups' },
  { href: '/admin/candidates', label: 'Nominees' },
  { href: '/admin/nominations', label: 'Nominations' },
  { href: '/admin/voters', label: 'Voters' },
];

export function ElecomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-[#E8E6E3] pb-4">
      {links.map((link) => {
        const active =
          link.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? 'bg-[#D41245] text-white'
                : 'bg-white text-[#1C1C1C] border-2 border-[#E8E6E3] hover:border-[#D41245]/40'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
