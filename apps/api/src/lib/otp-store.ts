type PendingSession = {
  licenseHash: string;
  memberId: string;
  contact: string;
  memberName: string;
  expiresAt: number;
};

type OtpEntry = PendingSession & {
  otp: string;
};

const store = new Map<string, PendingSession | OtpEntry>();

function isOtpEntry(entry: PendingSession | OtpEntry): entry is OtpEntry {
  return 'otp' in entry;
}

/** Step 1: validate member — license encoded (hashed), no OTP yet */
export function prepareMemberSession(
  sessionId: string,
  licenseHash: string,
  memberId: string,
  contact: string,
  memberName: string,
): void {
  store.set(sessionId, {
    licenseHash,
    memberId,
    contact,
    memberName,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
}

/** Step 2: generate OTP after user clicks Send OTP */
export function generateOtp(sessionId: string): string | null {
  const entry = store.get(sessionId);
  if (!entry || entry.expiresAt < Date.now()) {
    store.delete(sessionId);
    return null;
  }
  if (isOtpEntry(entry)) {
    return entry.otp;
  }
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  store.set(sessionId, { ...entry, otp });
  return otp;
}

export function verifyOtpSession(
  sessionId: string,
  licenseHash: string,
  otp: string,
): { ok: true; memberId: string } | { ok: false } {
  const entry = store.get(sessionId);
  if (!entry || !isOtpEntry(entry)) return { ok: false };
  if (entry.expiresAt < Date.now()) {
    store.delete(sessionId);
    return { ok: false };
  }
  if (entry.licenseHash !== licenseHash || entry.otp !== otp) {
    return { ok: false };
  }
  store.delete(sessionId);
  return { ok: true, memberId: entry.memberId };
}

export function getSessionMemberName(sessionId: string): string | null {
  const entry = store.get(sessionId);
  return entry?.memberName ?? null;
}
