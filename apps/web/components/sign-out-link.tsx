'use client';

export function SignOutLink() {
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
      }}
      className="inline-flex min-h-[44px] items-center text-base font-semibold text-[#63A9FA] underline"
    >
      Sign out
    </button>
  );
}
