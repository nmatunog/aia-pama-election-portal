const API_BASE =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_BASE ?? '/api'
    : process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

export type MemberSearchResult = {
  id: string;
  full_name: string;
  zone: string;
};

export type NominationLimits = {
  ok: boolean;
  electionId?: string;
  canSubmitZonal?: boolean;
  canSubmitNational?: boolean;
  nominatorZonalCount?: number;
  nominatorNationalCount?: number;
  zonalCandidatesInZone?: number;
  nationalCandidatesCount?: number;
  error?: string;
};

export type SubmitNominationResponse = {
  ok: boolean;
  message?: string;
  error?: string;
  nominationId?: string;
};

export type CandidateInvitation = {
  candidateId: string;
  type: 'zonal' | 'national';
  zone: string | null;
  status: string;
  nominatedAt: string;
  nominationId: string;
  nominatorName: string;
};

export type CandidateResponseResult = {
  ok: boolean;
  message?: string;
  error?: string;
  status?: string;
};

export type RequestOtpResponse = {
  ok: boolean;
  sessionId?: string;
  devOtp?: string;
  message?: string;
  error?: string;
};

export type VerifyOtpResponse = {
  ok: boolean;
  token?: string;
  member?: { fullName: string; zone: string };
  error?: string;
};
