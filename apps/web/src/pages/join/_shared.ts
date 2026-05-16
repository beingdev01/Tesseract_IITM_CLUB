import type {
  BsLevel,
  CoreInterest,
  CoreRole,
  HiringApplicationStatus,
  HiringGender,
  TesseractHouse,
  TesseractRegion,
  WeeklyHours,
} from '@/lib/api';

export const HOUSE_OPTIONS: TesseractHouse[] = [
  'BANDIPUR', 'CORBETT', 'GIR', 'KANHA', 'KAZIRANGA', 'NALLAMALA', 'NAMDAPHA',
  'NILGIRI', 'PICHAVARAM', 'SARANDA', 'SUNDARBANS', 'WAYANAD', 'NOT_ALLOTED',
];

export const HOUSE_LABEL: Record<TesseractHouse, string> = {
  BANDIPUR: 'Bandipur',
  CORBETT: 'Corbett',
  GIR: 'Gir',
  KANHA: 'Kanha',
  KAZIRANGA: 'Kaziranga',
  NALLAMALA: 'Nallamala',
  NAMDAPHA: 'Namdapha',
  NILGIRI: 'Nilgiri',
  PICHAVARAM: 'Pichavaram',
  SARANDA: 'Saranda',
  SUNDARBANS: 'Sundarbans',
  WAYANAD: 'Wayanad',
  NOT_ALLOTED: 'Not Allotted',
};

export const REGION_OPTIONS: TesseractRegion[] = [
  'BENGALURU', 'CHANDIGARH', 'CHENNAI', 'DELHI', 'HYDERABAD', 'KOLKATA',
  'LUCKNOW', 'MUMBAI', 'PATNA', 'INTERNATIONAL', 'NOT_ALLOTED',
];

export const REGION_LABEL: Record<TesseractRegion, string> = {
  BENGALURU: 'Bengaluru',
  CHANDIGARH: 'Chandigarh',
  CHENNAI: 'Chennai',
  DELHI: 'Delhi',
  HYDERABAD: 'Hyderabad',
  KOLKATA: 'Kolkata',
  LUCKNOW: 'Lucknow',
  MUMBAI: 'Mumbai',
  PATNA: 'Patna',
  INTERNATIONAL: 'International',
  NOT_ALLOTED: 'Not Allotted',
};

export const GENDER_OPTIONS: { value: HiringGender; label: string }[] = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

export const BS_LEVEL_OPTIONS_MEMBER: { value: BsLevel; label: string }[] = [
  { value: 'FOUNDATION', label: 'Fresh Outta Foundations' },
  { value: 'DIPLOMA', label: 'Diploma Survivor' },
  { value: 'DEGREE', label: 'Degree Mode Activated' },
];

export const BS_LEVEL_OPTIONS_CORE: { value: BsLevel; label: string }[] = [
  { value: 'FOUNDATION', label: 'Foundation' },
  { value: 'DIPLOMA', label: 'Diploma' },
  { value: 'DEGREE', label: 'Degree' },
];

export const CORE_INTEREST_OPTIONS: { value: CoreInterest; label: string }[] = [
  { value: 'YES', label: 'Yes! Let me cook! 🧑‍🍳' },
  { value: 'MAYBE', label: 'Maybe… let me vibe first. 🤔' },
  { value: 'NO', label: 'Nah, just here to witness the chaos. 🍿' },
];

export const WEEKLY_HOURS_OPTIONS: { value: WeeklyHours; label: string }[] = [
  { value: 'LT_7', label: 'Less than 7 hours' },
  { value: 'H_7_15', label: '7–15 hours' },
  { value: 'GT_15', label: 'More than 15 hours' },
];

export const CORE_ROLE_OPTIONS: { value: CoreRole; label: string; icon: string }[] = [
  { value: 'MANAGEMENT', label: 'Management', icon: '🔥' },
  { value: 'CONTENT_CREATOR', label: 'Content Creator / Video Editor', icon: '🎬' },
  { value: 'GRAPHIC_DESIGNER', label: 'Graphic Designer', icon: '🎨' },
  { value: 'TECHNICAL_WEBOPS', label: 'Technical / WebOps', icon: '💻' },
  { value: 'MEMER', label: 'Memer', icon: '🤣' },
  { value: 'PR_OUTREACH', label: 'PR & Outreach', icon: '📢' },
  { value: 'RESEARCH_SPONSORSHIP', label: 'Research & Sponsorship', icon: '💰' },
  { value: 'DOCUMENTATION', label: 'Documentation', icon: '📜' },
  { value: 'STREAMER_SPEAKER', label: 'Streamer & Speaker', icon: '📺' },
];

export const CORE_ROLE_LABEL: Record<CoreRole, string> =
  Object.fromEntries(CORE_ROLE_OPTIONS.map((r) => [r.value, r.label])) as Record<CoreRole, string>;

export const STATUS_LABEL: Record<HiringApplicationStatus, string> = {
  PENDING: 'Application under review',
  INTERVIEW_SCHEDULED: 'Interview scheduled — check your email',
  SELECTED: 'Selected — welcome to the team!',
  REJECTED: 'Not selected this round',
};

/** Map User.level (UserLevel enum) → BsLevel enum used by hiring. */
export function bsLevelFromUserLevel(level: string | null | undefined): BsLevel | undefined {
  switch (level) {
    case 'FOUNDATION': return 'FOUNDATION';
    case 'DIPLOMA': return 'DIPLOMA';
    case 'BSC':
    case 'BS': return 'DEGREE';
    default: return undefined;
  }
}
