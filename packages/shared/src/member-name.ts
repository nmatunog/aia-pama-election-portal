function formatMiddleInitial(middleInitial?: string | null): string {
  const mi = middleInitial?.trim();
  if (!mi) return '';
  const miDisplay = mi.length === 1 && !mi.endsWith('.') ? `${mi}.` : mi;
  return ` ${miDisplay}`;
}

function formatSuffix(suffix?: string | null): string {
  const s = suffix?.trim();
  if (!s) return '';
  return ` ${s}`;
}

/** Build stored/display full name from registration name parts. */
export function formatMemberFullName(
  lastName: string,
  firstName: string,
  middleInitial?: string | null,
  suffix?: string | null,
): string {
  const last = lastName.trim();
  const first = firstName.trim();
  return `${first}${formatMiddleInitial(middleInitial)} ${last}${formatSuffix(suffix)}`.replace(
    /\s+/g,
    ' ',
  ).trim();
}
