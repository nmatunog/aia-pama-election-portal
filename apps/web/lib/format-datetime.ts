/** Fixed zone so server (Vercel) and browser render the same string — avoids React #418 */
const ELECTION_TIME_ZONE = 'Asia/Manila';
const ELECTION_LOCALE = 'en-PH';

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(ELECTION_LOCALE, {
    timeZone: ELECTION_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateTimeLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(ELECTION_LOCALE, {
    timeZone: ELECTION_TIME_ZONE,
    dateStyle: 'long',
    timeStyle: 'short',
  });
}
