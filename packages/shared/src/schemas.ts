import { z } from 'zod';
import { ELECTION_PHASES, ZONES } from './constants';
import { formatMemberFullName } from './member-name';

export const validateMemberSchema = z.object({
  licenseCode: z
    .string()
    .min(1, 'AIA License Code is required')
    .max(50)
    .trim(),
  contact: z
    .string()
    .min(1, 'Email or mobile is required')
    .max(255)
    .trim(),
});

export const sendOtpSchema = z.object({
  sessionId: z.string().uuid(),
  licenseCode: z.string().min(1).max(50).trim(),
});

export const verifyOtpSchema = z.object({
  licenseCode: z.string().min(1).max(50).trim(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  sessionId: z.string().uuid(),
});

export const zonalVoteSchema = z.object({
  candidateId: z.string().uuid(),
});

export const nationalVoteSchema = z.object({
  candidateIds: z
    .array(z.string().uuid())
    .max(5, 'Maximum 5 national votes allowed'),
});

export const submitBallotSchema = z.object({
  electionId: z.string().uuid(),
  zonalVote: zonalVoteSchema,
  nationalVotes: nationalVoteSchema,
  turnstileToken: z.string().min(1),
});

export const zonalNominationSchema = z.object({
  electionId: z.string().uuid(),
  candidateMemberId: z.string().uuid(),
  endorserMemberIds: z
    .array(z.string().uuid())
    .min(1, 'At least 1 endorser required'),
});

export const nationalNominationSchema = z.object({
  electionId: z.string().uuid(),
  candidateMemberId: z.string().uuid(),
  endorserMemberIds: z
    .array(z.string().uuid())
    .min(3, 'At least 3 endorsers required for national nomination'),
});

export const candidateResponseSchema = z.object({
  electionId: z.string().uuid(),
  candidateId: z.string().uuid(),
});

export const elecomLoginSchema = z.object({
  email: z.string().email('Valid ELECOM email required').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const candidateReviewSchema = z.object({
  electionId: z.string().uuid(),
  candidateId: z.string().uuid(),
  rejectionReason: z.string().max(500).optional(),
});

const ELECOM_MANUAL_PHASES = [
  'draft',
  'nomination',
  'voting',
  'canvassing',
  'failed',
] as const;

export const electionPhaseUpdateSchema = z.object({
  electionId: z.string().uuid(),
  phase: z.enum(ELECOM_MANUAL_PHASES),
});

export const electionCertifySchema = z.object({
  electionId: z.string().uuid(),
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm certification' }),
  }),
});

export const candidateStatusUpdateSchema = z.object({
  electionId: z.string().uuid(),
  candidateId: z.string().uuid(),
  status: z.enum([
    'pending_acceptance',
    'declined',
    'pending_approval',
    'approved',
    'rejected',
  ]),
  rejectionReason: z.string().max(500).optional(),
});

export const memberUpdateSchema = z.object({
  memberId: z.string().uuid(),
  goodStanding: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const memberSignupSchema = z
  .object({
    licenseCode: z.string().min(1).max(50).trim(),
    lastName: z.string().min(1, 'Last name is required').max(100).trim(),
    firstName: z.string().min(1, 'First name is required').max(100).trim(),
    middleInitial: z.string().max(10).trim().optional(),
    suffix: z.string().max(20).trim().optional(),
    zone: z.enum(ZONES),
    contactEmail: z.string().email().max(255),
  })
  .transform((data) => ({
    ...data,
    fullName: formatMemberFullName(
      data.lastName,
      data.firstName,
      data.middleInitial,
      data.suffix,
    ),
  }));

export const memberApprovalSchema = z.object({
  memberId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(500).optional(),
});

export const memberDeleteSchema = z.object({
  memberId: z.string().uuid(),
  confirm: z.literal(true),
});

export const rosterImportRowSchema = z.object({
  licenseCode: z.string().min(1).max(50).trim(),
  fullName: z.string().min(2).max(200).trim(),
  zone: z.enum(ZONES),
  goodStanding: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const rosterImportSchema = z.object({
  confirm: z.literal(true),
  members: z.array(rosterImportRowSchema).min(1).max(5000),
  deactivateOthers: z.boolean().optional(),
});

export const newElectionCycleSchema = z.object({
  confirm: z.literal(true),
  cycleYear: z.number().int().min(2020).max(2100).optional(),
  force: z.boolean().optional(),
});

/** @deprecated Use validateMemberSchema + sendOtpSchema */
export const requestOtpSchema = validateMemberSchema;

export type ValidateMemberInput = z.infer<typeof validateMemberSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type SubmitBallotInput = z.infer<typeof submitBallotSchema>;
export type ZonalNominationInput = z.infer<typeof zonalNominationSchema>;
export type NationalNominationInput = z.infer<typeof nationalNominationSchema>;
export type CandidateResponseInput = z.infer<typeof candidateResponseSchema>;
export type ElecomLoginInput = z.infer<typeof elecomLoginSchema>;
export type CandidateReviewInput = z.infer<typeof candidateReviewSchema>;
export type ElectionPhaseUpdateInput = z.infer<typeof electionPhaseUpdateSchema>;
export type ElectionCertifyInput = z.infer<typeof electionCertifySchema>;
export type CandidateStatusUpdateInput = z.infer<typeof candidateStatusUpdateSchema>;
export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;
export type MemberSignupInput = z.infer<typeof memberSignupSchema>;
export type MemberApprovalInput = z.infer<typeof memberApprovalSchema>;
export type RosterImportInput = z.infer<typeof rosterImportSchema>;
export type NewElectionCycleInput = z.infer<typeof newElectionCycleSchema>;
