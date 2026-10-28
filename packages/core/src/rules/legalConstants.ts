// Alle Grenzwerte für den Schüler-Modus an einer Stelle. Jede Konstante nennt ihre
// Rechtsgrundlage und ab wann sie gilt. Komponenten lesen nur von hier, nie Zahlen direkt.
//
// Euro-Grenzen, die Headroom schon in data/limits.ts pflegt (Minijob-Grenze, Grundfreibetrag,
// Mindestlohn), stehen hier als Funktion, die den geprüften Wert für das Jahr liest. So gibt es
// genau eine Quelle der Wahrheit und keine zweite Zahl, die beim Jahreswechsel vergessen wird.
//
// verified: true  = am angegebenen Datum gegen gesetze-im-internet.de geprüft (siehe checkedAt).
// verified: false = aus dem Gesetzestext übernommen, aber noch nicht gegen die amtliche Fassung
//                   geprüft. Regeln daraus melden höchstens „warning“, nie „error“.
import { limitsForYear } from '../../data/limits';

export type LegalConstant<T> = {
  value: T;
  /** Kurzzitat der Rechtsgrundlage, wird in der Oberfläche angezeigt. */
  lawRef: string;
  /** Link auf den Gesetzestext. */
  url: string;
  validFrom: string;
  verified: boolean;
  checkedAt?: string;
  /** Interne Prüfnotiz. Wird nie angezeigt. */
  reviewNote?: string;
};

const jarbschg = (section: string) => 'https://www.gesetze-im-internet.de/jarbschg/__' + section + '.html';
/** Datum der Prüfung gegen gesetze-im-internet.de (JArbSchG, MiLoG § 22, SGB II §§ 11a, 11b). */
const CHECKED = '2026-10-28';
const UNCHECKED = 'Aus dem Gesetzestext übernommen; vor Veröffentlichung gegen gesetze-im-internet.de prüfen.';

function constant<T>(value: T, lawRef: string, url: string, validFrom: string, verified: boolean, extra: Partial<LegalConstant<T>> = {}): LegalConstant<T> {
  return { value, lawRef, url, validFrom, verified, ...(verified ? {} : { reviewNote: UNCHECKED }), ...extra };
}

// ── Altersgrenzen ────────────────────────────────────────────────────────────

/** § 5 Abs. 1, 3 JArbSchG: Kinder unter 13 dürfen grundsätzlich nicht beschäftigt werden. */
export const MIN_EMPLOYMENT_AGE = constant(13, '§ 5 Abs. 1 und 3 JArbSchG', jarbschg('5'), '1997-03-01', true, { checkedAt: CHECKED });
/** § 2 Abs. 1 JArbSchG: Kind ist, wer noch nicht 15 ist. */
export const CHILD_AGE_LIMIT = constant(15, '§ 2 Abs. 1 JArbSchG', jarbschg('2'), '1997-03-01', true, { checkedAt: CHECKED });
/** § 2 Abs. 2 JArbSchG: Jugendlicher ist, wer 15, aber noch nicht 18 ist. Ab 18 gilt das Gesetz nicht mehr. */
export const ADULT_AGE = constant(18, '§ 2 Abs. 2 JArbSchG', jarbschg('2'), '1997-03-01', true, { checkedAt: CHECKED });

// ── Gruppe A: Kinder (13–14) und vollzeitschulpflichtige Jugendliche außerhalb der Ferien ──

/** § 5 Abs. 3 JArbSchG: höchstens 2 Stunden am Tag. */
export const CHILD_MAX_HOURS_PER_DAY = constant(2, '§ 5 Abs. 3 JArbSchG', jarbschg('5'), '1997-03-01', true, { checkedAt: CHECKED });
/** § 5 Abs. 3 JArbSchG: in landwirtschaftlichen Familienbetrieben höchstens 3 Stunden am Tag. */
export const CHILD_MAX_HOURS_PER_DAY_AGRICULTURE = constant(3, '§ 5 Abs. 3 JArbSchG', jarbschg('5'), '1997-03-01', true, { checkedAt: CHECKED });
/** § 5 Abs. 3 JArbSchG: nicht zwischen 18 und 8 Uhr. */
export const CHILD_WORK_WINDOW = constant({ from: '08:00', to: '18:00' }, '§ 5 Abs. 3 JArbSchG', jarbschg('5'), '1997-03-01', true, { checkedAt: CHECKED });

// ── Gruppe B: Jugendliche (15–17) ────────────────────────────────────────────

/** § 8 Abs. 1 JArbSchG: höchstens 8 Stunden am Tag und 40 Stunden in der Woche. */
export const YOUTH_MAX_HOURS_PER_DAY = constant(8, '§ 8 Abs. 1 JArbSchG', jarbschg('8'), '1997-03-01', true, { checkedAt: '2026-10-24' });
export const YOUTH_MAX_HOURS_PER_WEEK = constant(40, '§ 8 Abs. 1 JArbSchG', jarbschg('8'), '1997-03-01', true, { checkedAt: '2026-10-24' });
/** § 8 Abs. 2a JArbSchG: 8,5 Stunden an einzelnen Tagen, wenn andere Tage derselben Woche kürzer sind. */
export const YOUTH_EXTENDED_HOURS_PER_DAY = constant(8.5, '§ 8 Abs. 2a JArbSchG', jarbschg('8'), '1997-03-01', true, { checkedAt: CHECKED });
/** § 15 JArbSchG: höchstens 5 Tage in der Woche (gilt über § 5 Abs. 3 Satz 3 auch für Kinder). */
export const MAX_WORKDAYS_PER_WEEK = constant(5, '§ 15 JArbSchG', jarbschg('15'), '1997-03-01', true, { checkedAt: CHECKED });
/** § 14 Abs. 1 JArbSchG: Nachtruhe von 20 bis 6 Uhr. */
export const YOUTH_NIGHT_REST = constant({ from: '20:00', to: '06:00' }, '§ 14 Abs. 1 JArbSchG', jarbschg('14'), '1997-03-01', true, { checkedAt: '2026-10-24' });

export type NightException = {
  /** Mindestalter in vollendeten Jahren („über 16 Jahre“ = 16 oder älter). */
  minAge: number;
  tag: 'gastronomy' | 'showmen' | 'multiShift' | 'bakery' | 'agriculture';
  /** Frühester erlaubter Beginn, falls abweichend von 6 Uhr. */
  earliestStart?: string;
  /** Spätestes erlaubtes Ende, falls abweichend von 20 Uhr. */
  latestEnd?: string;
  /** Landwirtschaft: entweder früher anfangen oder später aufhören, nicht beides am selben Tag. */
  eitherOr?: boolean;
};

/** § 14 Abs. 2 und 3 JArbSchG: Ausnahmen von der Nachtruhe nach Branche und Alter. */
export const NIGHT_EXCEPTIONS = constant<NightException[]>([
  { minAge: 16, tag: 'gastronomy', latestEnd: '22:00' },
  { minAge: 16, tag: 'showmen', latestEnd: '22:00' },
  { minAge: 16, tag: 'multiShift', latestEnd: '23:00' },
  { minAge: 16, tag: 'agriculture', earliestStart: '05:00', latestEnd: '21:00', eitherOr: true },
  { minAge: 16, tag: 'bakery', earliestStart: '05:00' },
  { minAge: 17, tag: 'bakery', earliestStart: '04:00' },
], '§ 14 Abs. 2 und 3 JArbSchG', jarbschg('14'), '1997-03-01', true, { checkedAt: CHECKED });

/** § 11 JArbSchG: Ruhepausen. */
export const BREAK_RULES = constant({
  /** Mehr als 4,5 bis 6 Stunden Arbeit → mindestens 30 Minuten. */
  shortThresholdHours: 4.5,
  shortBreakMinutes: 30,
  /** Mehr als 6 Stunden Arbeit → mindestens 60 Minuten. */
  longThresholdHours: 6,
  longBreakMinutes: 60,
  /** Als Pause zählt nur eine Unterbrechung von mindestens 15 Minuten. */
  minBlockMinutes: 15,
  /** Nie länger als 4,5 Stunden am Stück ohne Pause. */
  maxContinuousHours: 4.5,
}, '§ 11 JArbSchG', jarbschg('11'), '1997-03-01', true, { checkedAt: '2026-10-24' });

/** § 13 JArbSchG: mindestens 12 Stunden ununterbrochen frei zwischen zwei Arbeitstagen. */
export const MIN_REST_BETWEEN_DAYS_HOURS = constant(12, '§ 13 JArbSchG', jarbschg('13'), '1997-03-01', true, { checkedAt: CHECKED });

/** § 16 Abs. 2 JArbSchG: Branchen, in denen Samstagsarbeit ausnahmsweise erlaubt ist. */
export const SATURDAY_EXCEPTION_TAGS = constant(
  ['retail', 'bakery', 'gastronomy', 'showmen', 'hospital', 'household', 'agriculture', 'transport', 'sport'] as const,
  '§ 16 Abs. 2 JArbSchG', jarbschg('16'), '1997-03-01', true, { checkedAt: CHECKED },
);
/** § 17 Abs. 2 JArbSchG: Branchen, in denen Sonntagsarbeit ausnahmsweise erlaubt ist. Verkauf gehört nicht dazu. */
export const SUNDAY_EXCEPTION_TAGS = constant(
  ['hospital', 'agriculture', 'household', 'showmen', 'gastronomy', 'sport'] as const,
  '§ 17 Abs. 2 JArbSchG', jarbschg('17'), '1997-03-01', true, { checkedAt: CHECKED },
);
/** § 16 Abs. 2 Satz 2 JArbSchG: mindestens 2 Samstage im Monat sollen frei bleiben. */
export const MIN_FREE_SATURDAYS_PER_MONTH = constant(2, '§ 16 Abs. 2 JArbSchG', jarbschg('16'), '1997-03-01', true, { checkedAt: CHECKED });
/** § 17 Abs. 2 Satz 2 JArbSchG: mindestens 2 Sonntage im Monat müssen frei bleiben. */
export const MIN_FREE_SUNDAYS_PER_MONTH = constant(2, '§ 17 Abs. 2 JArbSchG', jarbschg('17'), '1997-03-01', true, { checkedAt: CHECKED });

// ── Ferienjob ────────────────────────────────────────────────────────────────

/**
 * § 5 Abs. 4 JArbSchG: Vollzeitschulpflichtige Jugendliche ab 15 dürfen in den Ferien höchstens
 * 4 Wochen im Kalenderjahr arbeiten. Headroom zählt das als 20 Arbeitstage (4 × 5-Tage-Woche).
 */
export const HOLIDAY_JOB_MAX_DAYS = constant(20, '§ 5 Abs. 4 i. V. m. § 2 Abs. 3 JArbSchG', jarbschg('5'), '1997-03-01', true, { checkedAt: CHECKED });

// ── Gesundheit ───────────────────────────────────────────────────────────────

/** § 32 Abs. 1 JArbSchG: Erstuntersuchung höchstens 14 Monate vor Jobbeginn. */
export const MEDICAL_EXAM_MAX_AGE_MONTHS = constant(14, '§ 32 Abs. 1 JArbSchG', jarbschg('32'), '1997-03-01', true, { checkedAt: CHECKED });
/** § 32 Abs. 2 JArbSchG: keine Untersuchung nötig bei geringfügiger oder höchstens 2 Monate dauernder leichter Arbeit. */
export const MEDICAL_EXAM_EXEMPT_MAX_MONTHS = constant(2, '§ 32 Abs. 2 JArbSchG', jarbschg('32'), '1997-03-01', true, { checkedAt: CHECKED });

// ── Geld ─────────────────────────────────────────────────────────────────────

/** § 22 Abs. 2 MiLoG: Unter 18 ohne abgeschlossene Berufsausbildung gilt der Mindestlohn nicht. */
export const MINIMUM_WAGE_EXEMPT_UNDER_AGE = constant(18, '§ 22 Abs. 2 MiLoG', 'https://www.gesetze-im-internet.de/milog/__22.html', '2015-01-01', true, { checkedAt: CHECKED });

/** Name der Grundsicherungsleistung. Eigene Konstante, weil eine Umbenennung geplant ist. */
export const BASIC_INCOME_NAME = constant(
  { de: 'Bürgergeld', en: 'citizen’s income (Bürgergeld)' },
  'SGB II', 'https://www.gesetze-im-internet.de/sgb_2/', '2023-01-01', false,
  { reviewNote: 'Umbenennung in „Grundsicherung“ angekündigt. Vor Veröffentlichung prüfen, ob sie in Kraft ist.' },
);
/** Ferienjob-Einkommen von Schüler:innen unter 25 wird beim Bürgergeld nicht angerechnet. */
export const BASIC_INCOME_HOLIDAY_JOB_EXEMPT = constant({ maxAge: 25 }, '§ 11a Abs. 7 SGB II', 'https://www.gesetze-im-internet.de/sgb_2/__11a.html', '2023-01-01', true, { checkedAt: CHECKED });
/** Erwerbseinkommen von Schüler:innen unter 25 bleibt bis zur Minijob-Grenze anrechnungsfrei. */
export const BASIC_INCOME_PUPIL_ALLOWANCE = constant({ maxAge: 25 }, '§ 11b Abs. 2b SGB II', 'https://www.gesetze-im-internet.de/sgb_2/__11b.html', '2023-07-01', true, { checkedAt: CHECKED });

/** Freiwillige Steuererklärung: bis zu 4 Jahre rückwirkend (Festsetzungsfrist). */
export const VOLUNTARY_TAX_RETURN_YEARS = constant(4, '§ 46 Abs. 2 Nr. 8 EStG, § 169 Abs. 2 AO', 'https://www.gesetze-im-internet.de/ao_1977/__169.html', '1977-01-01', false);

/**
 * Berufsmäßigkeit bei Schulabgänger:innen (kurzfristige Beschäftigung): zwischen Schule und Studium
 * nicht berufsmäßig, zwischen Schule und Ausbildung oder Freiwilligendienst berufsmäßig.
 */
export const SCHOOL_LEAVER_PROFESSIONAL = constant(
  { studyIsProfessional: false, trainingIsProfessional: true },
  'Geringfügigkeits-Richtlinien (Berufsmäßigkeit)',
  'https://www.minijob-zentrale.de/SharedDocs/Downloads/DE/Rundschreiben/Geringfuegigkeitsrichtlinien-2026.pdf?__blob=publicationFile',
  '2026-01-01', false,
);

// ── Euro-Werte aus data/limits.ts (eine Quelle der Wahrheit) ───────────────────

function verifiedLimit(id: string, year: number): number | null {
  const record = limitsForYear(year).find((limit) => limit.id === id);
  return record && record.verified && record.value !== null ? record.value : null;
}

/** Minijob-Verdienstgrenze (Geringfügigkeitsgrenze) im Monat. `null`, wenn für das Jahr nicht geprüft. */
export const miniJobMonthlyCap = (year: number) => verifiedLimit('miniJobMonthly', year);
/** Grundfreibetrag nach § 32a EStG. */
export const incomeTaxBasicAllowance = (year: number) => verifiedLimit('incomeTaxBasicAllowance', year);
/** Gesetzlicher Mindestlohn je Stunde. */
export const statutoryMinimumWage = (year: number) => verifiedLimit('minimumWage', year);

// ── Vergleichslöhne für Jugendliche ──────────────────────────────────────────

export type YouthWageReference = {
  /** Job-Vorlage aus data/jobPresets.ts. */
  presetId: string;
  /** Üblicher Stundenlohn für unter 18-Jährige in Euro. `null` = noch keine belastbare Quelle. */
  hourlyWage: number | null;
  sourceName: string;
  sourceUrl: string;
  asOf: string;
};

/**
 * Übliche Stundenlöhne für Jugendliche je Job-Vorlage. Pflegbar ohne Codeänderung an der UI.
 * Bewusst leer: Es gibt keine amtliche Statistik zu Stundenlöhnen unter 18. Werte nur mit Quelle
 * eintragen (z. B. Tarifvertrag der Branche oder eine veröffentlichte Erhebung). Bis dahin vergleicht
 * die App mit dem Mindestlohn als Orientierung.
 */
export const YOUTH_WAGE_REFERENCES: YouthWageReference[] = [];
