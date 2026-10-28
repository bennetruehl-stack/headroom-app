export const PROFILE_STATUSES = [
  'Student',
  'Working student',
  'Mini-jobber',
  'Employee',
  'Pupil',
  'School leaver',
  'Apprentice',
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

/** Wöchentlich wiederkehrender Unterrichtsblock. weekday: 1 = Montag … 7 = Sonntag. */
export type SchoolLesson = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  start: string;
  end: string;
};

/** Schulferien als Zeitraum (beide Tage einschließlich). */
export type SchoolHoliday = {
  start: string;
  end: string;
  name?: string;
};

export const BUNDESLAENDER = [
  'BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH',
] as const;
export type Bundesland = (typeof BUNDESLAENDER)[number];

/** „Was machst du nach der Schule?“ – entscheidet, ob ein Job dazwischen berufsmäßig ist. */
export const AFTER_SCHOOL_PLANS = ['study', 'apprenticeship', 'voluntaryService', 'work', 'undecided'] as const;
export type AfterSchoolPlan = (typeof AFTER_SCHOOL_PLANS)[number];

/** Checkliste der Eltern für einen Job. Jeder Punkt ist „besprochen und einverstanden“. */
export type ParentalConsentChecklist = {
  job: boolean;
  hours: boolean;
  wage: boolean;
  commute: boolean;
  /** Datum, an dem die unterschriebene Einwilligung vorlag. */
  signedOn?: string;
};

export type Profile = {
  status: ProfileStatus;
  /** Ältere Stände kennen nur das Alter. Mit Geburtsdatum wird das Alter je Stichtag berechnet. */
  age: number;
  familyInsured: boolean;
  bafoeg: boolean;
  hasMainJob?: boolean;
  semesterPeriods?: SemesterPeriod[];
  birthDate?: string;
  /**
   * Vollzeitschulpflichtig (§ 2 Abs. 3 JArbSchG). Wie lange die Vollzeitschulpflicht dauert,
   * regelt jedes Bundesland selbst (meist 9 oder 10 Schuljahre). Deshalb fragt Headroom das ab.
   */
  isFullTimeSchoolObligated?: boolean;
  bundesland?: Bundesland;
  schoolSchedule?: SchoolLesson[];
  schoolHolidays?: SchoolHoliday[];
  /** Die Familie (Bedarfsgemeinschaft) bekommt Bürgergeld bzw. die Nachfolgeleistung. */
  familyReceivesBasicIncome?: boolean;
  /** Einwilligung der Eltern je Job-ID. */
  parentalConsent?: Record<string, ParentalConsentChecklist>;
  afterSchool?: AfterSchoolPlan;
  /** Voraussichtlicher oder tatsächlicher Schulabschluss. */
  graduationDate?: string;
  /** Datum der ärztlichen Erstuntersuchung nach § 32 JArbSchG. */
  medicalExamDate?: string;
  /** Abgeschlossene Berufsausbildung (wichtig für den Mindestlohn unter 18). */
  completedVocationalTraining?: boolean;
  /** Bereits bestätigte oder abgelehnte Übergänge, damit sie nicht erneut erscheinen. */
  handledTransitions?: string[];
};

/**
 * Merkmale einer Tätigkeit, an denen Jugendarbeitsschutz-Regeln hängen.
 * Kommen aus den Job-Vorlagen; für ältere Jobs werden sie aus dem WZ-Code abgeleitet.
 */
export const JOB_TAGS = [
  'gastronomy',
  'retail',
  'bakery',
  'agriculture',
  'multiShift',
  'showmen',
  'hospital',
  'household',
  'sport',
  'transport',
  'pieceWork',
  'hazardous',
  'barNightclub',
  'alcoholTobacco',
  'lightWork',
] as const;
export type JobTag = (typeof JOB_TAGS)[number];

/** Pausenblock innerhalb einer Schicht. */
export type ShiftBreak = { start: string; end: string };

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
  /** Vorlage, aus der der Job angelegt wurde. */
  presetId?: string;
  /** Merkmale für den Jugendarbeitsschutz (Branche, Akkord, gefährlich …). */
  tags?: JobTag[];
  /** Laut Lohnabrechnung wird Lohnsteuer abgezogen. */
  incomeTaxWithheld?: boolean;
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
  /** Pausen in der Schicht. Fehlen sie, prüft Headroom die Pausenregel nur als Hinweis. */
  breaks?: ShiftBreak[];
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
