/** AIA-PAMA election zones per Election Code Article II */
export const ZONES = [
  'North Central Luzon',
  'South Central Luzon',
  'Manila 1',
  'Manila 2',
  'Visayas',
  'Mindanao',
] as const;

export type Zone = (typeof ZONES)[number];

/** Election lifecycle phases */
export const ELECTION_PHASES = [
  'draft',
  'nomination',
  'voting',
  'canvassing',
  'certified',
  'failed',
] as const;

export type ElectionPhase = (typeof ELECTION_PHASES)[number];

export const PHASE_LABELS: Record<ElectionPhase, string> = {
  draft: 'Draft',
  nomination: 'Nomination Open',
  voting: 'Voting Open',
  canvassing: 'Canvassing',
  certified: 'Results Certified',
  failed: 'Election Failed',
};

/** Business rule limits from Election Code */
export const RULES = {
  MAX_ZONAL_VOTES: 1,
  MAX_NATIONAL_VOTES: 5,
  MAX_NATIONAL_NOMINATIONS_PER_MEMBER: 5,
  MAX_ZONAL_NOMINEES_PER_ZONE: 3,
  MAX_NATIONAL_NOMINEES: 10,
  MIN_ZONAL_ENDORSERS: 1,
  MIN_NATIONAL_ENDORSERS: 3,
  MIN_VOTING_HOURS: 8,
  MAX_VOTING_HOURS: 72,
  PROTEST_FILING_DAYS: 5,
} as const;

/** Official AIA brand colors — Digital Red ≤ 20% of layout */
export const BRAND = {
  red: '#D41245',
  redHover: '#B0103A',
  redSubtle: '#FDF2F5',
  orange: '#FA4132',
  blue: '#63A9FA',
  surfacePage: '#F8F7F5',
  surfaceCard: '#FFFFFF',
  inkPrimary: '#1C1C1C',
  inkSecondary: '#4D4D4D',
  border: '#E8E6E3',
  success: '#1A7A3A',
  warning: '#9A6700',
} as const;
