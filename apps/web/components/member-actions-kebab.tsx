'use client';

import { useEffect, useId, useState } from 'react';

export type MemberKebabAction = {
  id: string;
  label: string;
  destructive?: boolean;
};

type Props = {
  memberName: string;
  actions: MemberKebabAction[];
  disabled?: boolean;
  onSelect: (actionId: string) => void;
};

export function MemberActionsKebab({
  memberName,
  actions,
  disabled = false,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  if (actions.length === 0) {
    return <span className="text-xs text-[#4D4D4D]">—</span>;
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-[#E8E6E3] bg-white text-[#1C1C1C] hover:border-[#D41245]/40 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Actions for ${memberName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <span className="sr-only">Open actions menu</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <circle cx="10" cy="4" r="1.75" />
          <circle cx="10" cy="10" r="1.75" />
          <circle cx="10" cy="16" r="1.75" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[11.5rem] overflow-hidden rounded-lg border-2 border-[#E8E6E3] bg-white py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              className={`block w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-[#F8F7F5] ${
                action.destructive ? 'text-[#D41245]' : 'text-[#1C1C1C]'
              }`}
              onClick={() => {
                setOpen(false);
                onSelect(action.id);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
