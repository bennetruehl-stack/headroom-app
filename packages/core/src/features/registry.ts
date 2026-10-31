// Eine Stelle entscheidet, welche Funktion für wen aktiv ist. Menü, Routen und Karten fragen nur hier nach.
// Jeder Eintrag entspricht einer Zeile in docs/Funktionskatalog.md (Spalte „Aktiv wenn“).
// Reine Funktionen: Das Datum wird übergeben.
import { consentAgeRule } from '../../data/privacy';
import { detectedCombinations } from '../combinations';
import { ageOn, fullTimeSchoolObligated, isStudentMode, youthLaborApplies } from '../rules/youthLabor/profile';
import type { Job, Profile } from '../types';
import { effectiveFeatures, studentModeHiddenFeatures, type FeatureName } from './flags';

export type FeaturePriority = 'P0' | 'P1' | 'P2' | 'P3';

export type FeatureContext = {
  profile: Profile;
  jobs: Job[];
  /** Stichtag als ISO-Datum (YYYY-MM-DD). */
  date: string;
  advancedMode: boolean;
  /** Gespeicherte Einzel-Flags der Demo-Funktionen. */
  flags: Record<FeatureName, boolean>;
  /** Ein Beispielprofil ist geladen. */
  isExample: boolean;
  hasAccount: boolean;
};

type Derived = FeatureContext & { studentMode: boolean; consent: boolean; demo: Record<FeatureName, boolean> };

type Entry = {
  id: string;
  /** Nummer der Zeile im Funktionskatalog. */
  catalog: string;
  priority: FeaturePriority;
  /** Noch nicht gebaute Funktionen sind nie aktiv, egal was die Bedingung sagt. */
  built: boolean;
  activeWhen: (ctx: Derived) => boolean;
};

const always = () => true;
const never = () => false;

/** Ein Demo-Flag gilt nur mit Advanced-Modus, ab 16 und außerhalb des Schüler-Modus. */
const demoFlag = (name: FeatureName) => (ctx: Derived) => ctx.demo[name] && ctx.consent;

export const featureRegistry = [
  // P0 Fundament
  { id: 'onboarding', catalog: 'F01', priority: 'P0', built: true, activeWhen: always },
  { id: 'jobs', catalog: 'F02', priority: 'P0', built: true, activeWhen: always },
  { id: 'shifts', catalog: 'F03', priority: 'P0', built: true, activeWhen: always },
  { id: 'dashboard', catalog: 'F04', priority: 'P0', built: true, activeWhen: always },
  { id: 'limitData', catalog: 'F05', priority: 'P0', built: true, activeWhen: always },
  { id: 'language', catalog: 'F06', priority: 'P0', built: true, activeWhen: always },
  { id: 'dataExport', catalog: 'F07', priority: 'P0', built: true, activeWhen: always },
  { id: 'versionedStorage', catalog: 'F08', priority: 'P0', built: false, activeWhen: always },
  { id: 'featureRegistry', catalog: 'F09', priority: 'P0', built: true, activeWhen: always },
  { id: 'examples', catalog: 'F10', priority: 'P0', built: true, activeWhen: always },
  { id: 'legalPages', catalog: 'F11', priority: 'P0', built: true, activeWhen: always },
  // P1 Kern
  { id: 'account', catalog: 'F20', priority: 'P1', built: false, activeWhen: (ctx) => ctx.hasAccount || accountPossible(ctx) },
  { id: 'sync', catalog: 'F21', priority: 'P1', built: false, activeWhen: (ctx) => ctx.hasAccount },
  { id: 'recoveryCode', catalog: 'F22', priority: 'P1', built: false, activeWhen: (ctx) => ctx.hasAccount },
  { id: 'roleLimits', catalog: 'F23', priority: 'P1', built: true, activeWhen: always },
  { id: 'shiftCheck', catalog: 'F24', priority: 'P1', built: true, activeWhen: always },
  { id: 'payments', catalog: 'F25', priority: 'P1', built: true, activeWhen: always },
  { id: 'limitsPage', catalog: 'F26', priority: 'P1', built: true, activeWhen: always },
  { id: 'infoCards', catalog: 'F27', priority: 'P1', built: true, activeWhen: always },
  { id: 'youthLaborCheck', catalog: 'F28', priority: 'P1', built: true, activeWhen: (ctx) => youthLaborApplies(ctx.profile, ctx.date) },
  { id: 'holidayJobCounter', catalog: 'F29', priority: 'P1', built: true, activeWhen: (ctx) => ctx.studentMode && fullTimeSchoolObligated(ctx.profile).value && ageOn(ctx.profile, ctx.date) >= 15 },
  { id: 'minorJobHints', catalog: 'F30', priority: 'P1', built: true, activeWhen: (ctx) => youthLaborApplies(ctx.profile, ctx.date) },
  { id: 'mainJobMiniJob', catalog: 'F31', priority: 'P1', built: true, activeWhen: (ctx) => ctx.profile.status === 'Employee' && ctx.profile.hasMainJob !== false },
  { id: 'multipleMiniJobs', catalog: 'F32', priority: 'P1', built: true, activeWhen: (ctx) => ctx.jobs.filter((job) => job.type === 'mini-job').length >= 2 },
  // P2 Komfort
  { id: 'icsImport', catalog: 'F40', priority: 'P2', built: true, activeWhen: always },
  { id: 'calendarSubscription', catalog: 'F41', priority: 'P2', built: true, activeWhen: always },
  { id: 'photoImport', catalog: 'F42', priority: 'P2', built: true, activeWhen: always },
  { id: 'parents', catalog: 'F43', priority: 'P2', built: true, activeWhen: (ctx) => ctx.studentMode },
  { id: 'transitions', catalog: 'F44', priority: 'P2', built: true, activeWhen: (ctx) => Boolean(ctx.profile.birthDate || ctx.profile.graduationDate) },
  { id: 'wageCheck', catalog: 'F45', priority: 'P2', built: true, activeWhen: always },
  { id: 'trends', catalog: 'F46', priority: 'P2', built: true, activeWhen: always },
  { id: 'taxRefundHint', catalog: 'F47', priority: 'P2', built: true, activeWhen: (ctx) => ctx.jobs.some((job) => job.incomeTaxWithheld) },
  { id: 'basicIncomeCard', catalog: 'F48', priority: 'P2', built: true, activeWhen: (ctx) => Boolean(ctx.profile.familyReceivesBasicIncome) },
  { id: 'schoolLeaverShortTerm', catalog: 'F49', priority: 'P2', built: true, activeWhen: (ctx) => ctx.profile.status === 'School leaver' },
  { id: 'weekCalendar', catalog: 'F50', priority: 'P2', built: true, activeWhen: always },
  { id: 'jobCombinations', catalog: 'F51', priority: 'P2', built: true, activeWhen: (ctx) => detectedCombinations(ctx.profile, ctx.jobs, Number(ctx.date.slice(0, 4))).length > 0 },
  { id: 'darkMode', catalog: 'F52', priority: 'P2', built: true, activeWhen: always },
  { id: 'desktopApp', catalog: 'F53', priority: 'P2', built: true, activeWhen: always },
  // P3 Erweiterungen (Advanced, standardmäßig aus)
  { id: 'premium', catalog: 'F60', priority: 'P3', built: true, activeWhen: (ctx) => ctx.demo.premium },
  { id: 'peerStats', catalog: 'F61', priority: 'P3', built: true, activeWhen: demoFlag('peerStats') },
  { id: 'jobBoard', catalog: 'F62', priority: 'P3', built: true, activeWhen: demoFlag('jobBoard') },
  { id: 'partnerRecommendations', catalog: 'F63', priority: 'P3', built: true, activeWhen: demoFlag('partnerRecommendations') },
  { id: 'osmCompanyCheck', catalog: 'F64', priority: 'P3', built: true, activeWhen: demoFlag('osmCompanyCheck') },
  { id: 'developer', catalog: 'F65', priority: 'P3', built: true, activeWhen: (ctx) => ctx.advancedMode },
  { id: 'parentLink', catalog: 'F66', priority: 'P3', built: false, activeWhen: (ctx) => ctx.studentMode },
  { id: 'reminders', catalog: 'F67', priority: 'P3', built: false, activeWhen: never },
  { id: 'reportingDutyReminder', catalog: 'F68', priority: 'P3', built: false, activeWhen: never },
  { id: 'youthWageComparison', catalog: 'F69', priority: 'P3', built: false, activeWhen: (ctx) => ctx.studentMode },
  { id: 'calendarRecurrence', catalog: 'F70', priority: 'P3', built: false, activeWhen: never },
  { id: 'employerShiftApps', catalog: 'F71', priority: 'P3', built: false, activeWhen: never },
] as const satisfies readonly Entry[];

/** Teile einer Funktion, die keine eigene Katalogzeile haben, aber an einer Bedingung hängen. */
const subFeatures = {
  /** Wochenkalender markiert Schichten in der Schulzeit rot. */
  schoolTimeMarking: (ctx: Derived) => ctx.studentMode,
  /** Stunden- und 26-Wochen-Regel für Werkstudent:innen. */
  workingStudentRules: (ctx: Derived) => ctx.profile.status === 'Working student',
} satisfies Record<string, (ctx: Derived) => boolean>;

export type FeatureId = (typeof featureRegistry)[number]['id'] | keyof typeof subFeatures;
export type ActiveFeatures = Readonly<Record<FeatureId, boolean>>;

/** Einwilligungsalter nach Art. 8 DSGVO, mit Geburtsdatum am Stichtag gerechnet. */
export function consentAgeReached(profile: Pick<Profile, 'age' | 'birthDate'>, date: string): boolean {
  return ageOn(profile, date) >= consentAgeRule.minimumAge;
}

/** Ein Konto kann angelegt werden: ab 16 und nicht mit einem Beispielprofil. */
export function accountPossible(ctx: Pick<FeatureContext, 'profile' | 'date' | 'isExample'>): boolean {
  return !ctx.isExample && consentAgeReached(ctx.profile, ctx.date);
}

export function resolveFeatures(ctx: FeatureContext): ActiveFeatures {
  const studentMode = isStudentMode(ctx.profile, ctx.date);
  const demo = { ...effectiveFeatures(ctx.advancedMode, ctx.flags) };
  if (studentMode) for (const name of studentModeHiddenFeatures) demo[name] = false;
  const derived: Derived = { ...ctx, studentMode, consent: consentAgeReached(ctx.profile, ctx.date), demo };
  const result = {} as Record<FeatureId, boolean>;
  for (const entry of featureRegistry) result[entry.id] = entry.built && entry.activeWhen(derived);
  for (const [id, condition] of Object.entries(subFeatures)) result[id as FeatureId] = condition(derived);
  return result;
}
