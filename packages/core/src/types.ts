export const PROFILE_STATUSES = [
  'Student',
  'Working student',
  'Mini-jobber',
  'Employee',
  'Pupil',
] as const;

export type ProfileStatus = (typeof PROFILE_STATUSES)[number];
/** Kept as a concise alias for limit records. */
export type Status = ProfileStatus;

export type EmploymentType =
  | 'mini-job'
  | 'short-term'
  | 'working student'
  | 'regular';

export type Period = 'month' | 'year' | 'week' | 'day' | 'season' | 'hour';
export type RiskStatus = 'Safe' | 'Close' | 'Over';

export type Limit = {
  id: string;
  name: string;
  name_en?: string;
  value: number | null;
  unit: string;
  period: Period;
  appliesTo: ProfileStatus[];
  condition?: string;
  consequence: string;
  consequence_en?: string;
  sourceName: string;
  sourceUrl: string;
  asOf: string;
  validFrom: string;
  validTo: string;
  verified: boolean;
  /** Interne Prüfnotiz. Wird nie in der Oberfläche angezeigt. */
  reviewNote?: string;
};

export type SemesterPeriod = {
  start: string;
  end: string;
};

export type Profile = {
  status: ProfileStatus;
  age: number;
  familyInsured: boolean;
  bafoeg: boolean;
  hasMainJob?: boolean;
  semesterPeriods?: SemesterPeriod[];
};

export type Job = {
  id: string;
  title: string;
  type: EmploymentType;
  wage: number;
  startDate: string;
  endDate?: string;
  industry?: string;
  skillLevel?: 1 | 2 | 3 | 4;
  company?: string;
  city?: string;
  expectedWage?: number;
  surcharges?: number;
  tipsEnabled?: boolean;
  tips?: number;
  /** Stichwörter, an denen Kalendertermine oder Dienstplanzeilen diesem Job zugeordnet werden. */
  calendarKeywords?: string[];
};

export type ShiftSource = 'manual' | 'calendar' | 'photo';

export type Shift = {
  id?: string;
  jobId: string;
  date: string;
  hours: number;
  startTime?: string;
  endTime?: string;
  days?: number;
  planned?: boolean;
  recurring?: 'weekly';
  surchargeAmount?: number;
  tips?: number;
  /** Herkunft der Schicht. Fehlt bei älteren Einträgen und bedeutet dann „manuell“. */
  source?: ShiftSource;
  /** Stabile Kennung aus dem Kalender (UID, bei Serien plus ursprünglicher Startzeit). */
  externalId?: string;
  calendarId?: string;
  /** Nach dem Import von Hand bearbeitet: spätere Kalender-Syncs überschreiben die Zeiten nicht. */
  editedManually?: boolean;
};

export type CalculationSummary = {
  total: number;
  remaining: number;
  hours: number;
  ratio: number;
  status: RiskStatus;
};

export type PeerWageRow = {
  jobPresetId: string;
  city: string;
  hourlyWage: number;
  expectedWage: number;
  month: string;
};
