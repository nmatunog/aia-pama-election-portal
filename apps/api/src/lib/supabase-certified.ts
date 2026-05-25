import { computeCertifiedResults, type CertifiedElectionResults } from '@aia-pama/shared';
import type { Env } from '../env';
import { loadPublicResults } from './supabase-public';

export async function getCertifiedElectionResults(
  env: Env,
  electionId: string,
): Promise<CertifiedElectionResults> {
  const rows = await loadPublicResults(env, electionId);
  return computeCertifiedResults(
    rows.map((r) => ({
      candidateId: r.candidate_id,
      memberId: r.member_id,
      fullName: r.full_name,
      type: r.type,
      zone: r.zone,
      voteCount: Number(r.vote_count) || 0,
    })),
  );
}
