import { z } from 'zod';

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

/** @deprecated Use validateMemberSchema + sendOtpSchema */
export const requestOtpSchema = validateMemberSchema;

export type ValidateMemberInput = z.infer<typeof validateMemberSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type SubmitBallotInput = z.infer<typeof submitBallotSchema>;
export type ZonalNominationInput = z.infer<typeof zonalNominationSchema>;
export type NationalNominationInput = z.infer<typeof nationalNominationSchema>;
export type CandidateResponseInput = z.infer<typeof candidateResponseSchema>;
