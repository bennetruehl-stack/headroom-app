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

/**
 * Worauf sich der Grenzwert bezieht.
 * - gross: Bruttoverdienst (direkt mit den erfassten Schichten vergleichbar)
 * - net-allowance: Freibetrag nach gesetzlichen Abzügen (nicht direkt mit Brutto vergleichbar)
 * - total-income: Gesamteinkommen im Sinne von § 16 SGB IV (Einkünfte nach Steuerrecht)
 * - other: Stunden, Tage, Anzahl oder reine Information
 */
export type LimitBasis = 'gross' | 'net-allowance' | 'total-income' | 'other';

/** Rechnerisch abgeleiteter Bruttobetrag zu einem Freibetrag oder Einkommensbegriff. */
export type GrossEquivalent = {
  value: number;
  /** Rechenweg und Annahmen, sichtbar für Nutzer:innen. */
  note: string;
  note_en: string;
};
export type RiskStatus = 'Safe' | 'Close' | 'Over' | 'Unknown';

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
  basis?: LimitBasis;
  grossEquivalent?: GrossEquivalent;
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

export const ONE_TIME_PAYMENT_KINDS = ['bonus', 'holidayPay', 'christmasBonus', 'other'] as const;
export type OneTimePaymentKind = (typeof ONE_TIME_PAYMENT_KINDS)[number];

/** Einmalzahlung (Bonus, Urlaubs- oder Weihnachtsgeld). Bruttobetrag in Euro. */
export type OneTimePayment = {
  id: string;
  jobId: string;
  date: string;
  amount: number;
  kind: OneTimePaymentKind;
  note?: string;
};
