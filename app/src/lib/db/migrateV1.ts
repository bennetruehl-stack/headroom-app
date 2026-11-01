import {
  recordId,
  recordKinds,
  singletonIds,
  validateFields,
  type Job,
  type OneTimePayment,
  type Profile,
  type QuarantinedRecord,
  type RecordKind,
  type Shift,
  type ShiftCandidate,
} from '@headroom/core';
import type { AppState, CalendarSource, ExampleProfile } from '../storage';

export type RecordInput = { id: string; kind: RecordKind; fields: Record<string, unknown> };

type Fields = Record<string, unknown>;

export const blankProfile = (): Profile => ({ status: 'Student', age: 0, familyInsured: false, bafoeg: false, hasMainJob: false, semesterPeriods: [] });

/** Feste Kennung aus Job, Datum und Reihenfolge für Schichten ohne Kennung. */
function shiftIds(shifts: readonly Partial<Shift>[]): string[] {
  const seen = new Map<string, number>();
  return shifts.map((shift) => {
    if (typeof shift.id === 'string' && shift.id) return shift.id;
    const base = 'legacy-' + String(shift.jobId) + '-' + String(shift.date);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return base + '-' + count;
  });
}

type SettingsFields = Pick<AppState, 'language' | 'darkMode'>;
type DeviceFields = Pick<AppState, 'onboarded' | 'isPremium' | 'dismissedRecommendations' | 'peerOptIn' | 'peerToken' | 'example' | 'pendingImports'>;

function settingsFields(source: Partial<AppState>): SettingsFields {
  return { language: source.language === 'en' ? 'en' : 'de', darkMode: Boolean(source.darkMode) };
}

function deviceFields(source: Partial<AppState>): DeviceFields {
  const example: ExampleProfile | undefined =
    source.example === 'standard' || source.example === 'lena' || source.example === 'mia' ? source.example : undefined;
  return {
    onboarded: Boolean(source.onboarded),
    isPremium: Boolean(source.isPremium),
    dismissedRecommendations: Array.isArray(source.dismissedRecommendations)
      ? source.dismissedRecommendations.filter((level): level is number => Number.isInteger(level) && level >= 1 && level <= 4)
      : [],
    peerOptIn: Boolean(source.peerOptIn),
    peerToken: typeof source.peerToken === 'string' ? source.peerToken : undefined,
    example,
    pendingImports: Array.isArray(source.pendingImports)
      ? source.pendingImports.filter((item): item is ShiftCandidate =>
        Boolean(item) && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.hours) && (item.source === 'calendar' || item.source === 'photo'))
      : [],
  };
}

/** Zerlegt den App-Zustand in Datensätze, in der Reihenfolge der Listen. */
export function stateToInputs(state: AppState): RecordInput[] {
  const ids = shiftIds(state.shifts);
  return [
    { id: singletonIds.profile, kind: 'profile', fields: state.profile },
    { id: singletonIds.settings, kind: 'settings', fields: settingsFields(state) },
    { id: singletonIds.deviceState, kind: 'deviceState', fields: deviceFields(state) },
    ...state.jobs.map((job): RecordInput => ({ id: recordId('job', job.id), kind: 'job', fields: job })),
    ...state.shifts.map((shift, index): RecordInput => ({ id: recordId('shift', ids[index]), kind: 'shift', fields: { ...shift, id: ids[index] } })),
    ...state.payments.map((payment): RecordInput => ({ id: recordId('payment', payment.id), kind: 'payment', fields: payment })),
    ...state.calendars.map((calendar): RecordInput => ({ id: recordId('calendarSource', calendar.id), kind: 'calendarSource', fields: calendar })),
  ];
}

/** Baut den App-Zustand aus Datensätzen (in gespeicherter Reihenfolge). Fehlt das Profil, beginnt das Onboarding. */
export function inputsToState(records: readonly { kind: RecordKind; fields: Fields }[]): AppState {
  const of = (kind: RecordKind) => records.filter((record) => record.kind === kind).map((record) => record.fields);
  const profile = of('profile')[0] as Profile | undefined;
  const settings = settingsFields((of('settings')[0] ?? {}) as Partial<AppState>);
  const device = deviceFields((of('deviceState')[0] ?? {}) as Partial<AppState>);
  return {
    profile: profile ? { ...profile, semesterPeriods: Array.isArray(profile.semesterPeriods) ? profile.semesterPeriods : [] } : blankProfile(),
    jobs: of('job') as Job[],
    shifts: of('shift') as Shift[],
    payments: of('payment') as OneTimePayment[],
    calendars: of('calendarSource') as CalendarSource[],
    ...settings,
    ...device,
    onboarded: Boolean(profile) && Boolean(device.onboarded),
  };
}

/**
 * Prüft einen gespeicherten Block aus Version 1 oder eine Sicherungsdatei je Datensatz.
 * Liefert `null`, wenn der Wert gar kein App-Zustand ist.
 */
export function splitLegacyState(value: unknown): { inputs: RecordInput[]; quarantine: QuarantinedRecord[] } | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<AppState>;
  if (!source.profile && !Array.isArray(source.jobs)) return null;
  const inputs: RecordInput[] = [];
  const quarantine: QuarantinedRecord[] = [];
  const list = (items: unknown) => (Array.isArray(items) ? (items as Fields[]) : []);
  const check = (kind: RecordKind, id: string, raw: unknown, jobIds: ReadonlySet<string>, fields?: Fields) => {
    const reason = raw && typeof raw === 'object' ? validateFields(kind, raw as Fields, { jobIds }) : 'invalid';
    if (reason) quarantine.push({ id, kind, raw, reason });
    else inputs.push({ id, kind, fields: fields ?? (raw as Fields) });
    return !reason;
  };
  const noJobs = new Set<string>();

  if (source.profile !== undefined) {
    const profile = source.profile as Partial<Profile> | null;
    const fields = profile && typeof profile === 'object'
      ? { ...profile, semesterPeriods: Array.isArray(profile.semesterPeriods) ? profile.semesterPeriods : [] }
      : undefined;
    check('profile', singletonIds.profile, source.profile, noJobs, fields);
  }
  inputs.push({ id: singletonIds.settings, kind: 'settings', fields: settingsFields(source) });
  inputs.push({ id: singletonIds.deviceState, kind: 'deviceState', fields: deviceFields(source) });

  const jobIds = new Set<string>();
  list(source.jobs).forEach((job, index) => {
    const id = recordId('job', typeof job?.id === 'string' ? job.id : '#' + index);
    if (check('job', id, job, noJobs)) jobIds.add(job.id as string);
  });
  const shifts = list(source.shifts);
  const ids = shiftIds(shifts.map((shift) => (shift && typeof shift === 'object' ? shift : {})));
  shifts.forEach((shift, index) => {
    const id = recordId('shift', ids[index]);
    check('shift', id, shift, jobIds, shift && typeof shift === 'object' ? { ...shift, id: ids[index] } : undefined);
  });
  list(source.payments).forEach((payment, index) =>
    check('payment', recordId('payment', typeof payment?.id === 'string' ? payment.id : '#' + index), payment, jobIds));
  list(source.calendars).forEach((calendar, index) =>
    check('calendarSource', recordId('calendarSource', typeof calendar?.id === 'string' ? calendar.id : '#' + index), calendar, jobIds));
  return { inputs, quarantine };
}

const quarantineReasons: readonly QuarantinedRecord['reason'][] = ['invalid', 'missingJob'];

/** Aussortierte Einträge aus einer Sicherungsdatei. Nur vollständige Einträge werden übernommen. */
function backupQuarantine(value: unknown): QuarantinedRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is QuarantinedRecord =>
    Boolean(item) && typeof item === 'object' && typeof item.id === 'string' && item.kind in recordKinds &&
    quarantineReasons.includes(item.reason) && 'raw' in item);
}

/**
 * Prüft eine Sicherungsdatei je Datensatz und baut daraus den App-Zustand.
 * `savedQuarantine` sind die in der Datei mitgesicherten aussortierten Einträge.
 */
export function parseBackup(value: unknown, savedQuarantine?: unknown): { state: AppState; quarantine: QuarantinedRecord[] } | null {
  const split = splitLegacyState(value);
  if (!split || !split.inputs.some((input) => input.kind === 'profile')) return null;
  return {
    state: inputsToState(split.inputs),
    quarantine: [...new Map([...backupQuarantine(savedQuarantine), ...split.quarantine].map((item) => [item.id, item])).values()],
  };
}
