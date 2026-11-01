// Lokale Datenhaltung je Datensatz. Jeder Datensatz hat eine eigene Zeitmarke je Feld,
// damit Geräte später feldweise zusammenführen können.
import { isValidIsoDate } from '../input';
import { ONE_TIME_PAYMENT_KINDS, PROFILE_STATUSES, type Job, type OneTimePayment, type Profile, type Shift } from '../types';
import type { HlcStamp } from './hlc';

/** Version des Datensatz-Formats. Bei jeder Änderung an Feldern einen Schritt in `recordMigrations` ergänzen. */
export const RECORD_SCHEMA_VERSION = 1;

export type RecordKind = 'profile' | 'job' | 'shift' | 'payment' | 'calendarSource' | 'settings' | 'deviceState';

export type StoredRecord = {
  /** Art und Kennung zusammen, z. B. `shift:abc`. */
  id: string;
  kind: RecordKind;
  schemaVersion: number;
  fields: Record<string, unknown>;
  /** Zeitmarke je Feld. Einträge wie `parentalConsent.<jobId>` gelten für einen einzelnen Schlüssel. */
  fieldClock: Record<string, HlcStamp>;
  deleted: boolean;
  deletedAt?: HlcStamp;
};

/** Ein Datensatz, der die Prüfung nicht bestanden hat. Er bleibt unverändert erhalten, bis die Person ihn verwirft. */
export type QuarantinedRecord = {
  id: string;
  kind: RecordKind;
  raw: unknown;
  reason: ValidationFailure;
};

export type ValidationFailure = 'invalid' | 'missingJob';

/** Prüft, dass eine Feldliste jeden Schlüssel des Typs nennt. */
type AllKeys<T, List extends readonly string[]> = Exclude<keyof T, List[number]> extends never ? List : never;
const fieldsOf = <T>() => <const List extends readonly (keyof T & string)[]>(list: AllKeys<T, List>) => list;

const profileFields = fieldsOf<Profile>()([
  'status', 'age', 'familyInsured', 'bafoeg', 'hasMainJob', 'semesterPeriods', 'birthDate', 'isFullTimeSchoolObligated',
  'bundesland', 'schoolSchedule', 'schoolHolidays', 'familyReceivesBasicIncome', 'parentalConsent', 'afterSchool',
  'graduationDate', 'medicalExamDate', 'completedVocationalTraining', 'handledTransitions',
]);
const jobFields = fieldsOf<Job>()([
  'id', 'title', 'type', 'wage', 'startDate', 'endDate', 'industry', 'skillLevel', 'company', 'city', 'expectedWage',
  'surcharges', 'tipsEnabled', 'tips', 'calendarKeywords', 'presetId', 'tags', 'incomeTaxWithheld',
]);
const shiftFields = fieldsOf<Shift>()([
  'id', 'jobId', 'date', 'hours', 'startTime', 'endTime', 'days', 'planned', 'recurring', 'surchargeAmount', 'tips',
  'source', 'externalId', 'calendarId', 'editedManually', 'breaks',
]);
const paymentFields = fieldsOf<OneTimePayment>()(['id', 'jobId', 'date', 'amount', 'kind', 'note']);

type KindInfo = {
  /** Wird mit einem Konto zwischen Geräten abgeglichen. */
  synced: boolean;
  /** Felder, die dieser App-Stand kennt. Unbekannte Felder bleiben beim Speichern erhalten. */
  knownFields: readonly string[];
};

export const recordKinds: Record<RecordKind, KindInfo> = {
  profile: { synced: true, knownFields: profileFields },
  job: { synced: true, knownFields: jobFields },
  shift: { synced: true, knownFields: shiftFields },
  payment: { synced: true, knownFields: paymentFields },
  calendarSource: { synced: true, knownFields: ['id', 'name', 'kind', 'url', 'lastSync', 'lastError'] },
  settings: { synced: true, knownFields: ['language', 'darkMode'] },
  deviceState: {
    synced: false,
    knownFields: ['example', 'isPremium', 'peerToken', 'pendingImports', 'onboarded', 'dismissedRecommendations', 'peerOptIn'],
  },
};

/** Felder, die beim Zusammenführen als Menge vereinigt werden. */
export const setFields: Readonly<Partial<Record<RecordKind, readonly string[]>>> = { profile: ['handledTransitions'] };
/** Felder, deren Schlüssel einzeln zusammengeführt werden. */
export const mapFields: Readonly<Partial<Record<RecordKind, readonly string[]>>> = { profile: ['parentalConsent'] };

/** Feste Kennungen der Datensätze, die es nur einmal gibt. */
export const singletonIds = { profile: 'profile', settings: 'settings', deviceState: 'device' } as const;

export function recordId(kind: RecordKind, entityId: string): string {
  return kind + ':' + entityId;
}

const employmentTypes: readonly Job['type'][] = ['mini-job', 'short-term', 'working student', 'regular'];
const isText = (value: unknown): value is string => typeof value === 'string';
const isDate = (value: unknown) => isText(value) && isValidIsoDate(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * Prüft einen einzelnen Datensatz. `jobIds` sind die gültigen Jobs desselben Stands.
 * Gibt den Grund zurück oder `null`, wenn der Datensatz gültig ist.
 */
export function validateFields(kind: RecordKind, fields: Record<string, unknown>, ctx: { jobIds: ReadonlySet<string> }): ValidationFailure | null {
  const valid = (() => {
    switch (kind) {
      case 'profile':
        return (PROFILE_STATUSES as readonly unknown[]).includes(fields.status) && isNumber(fields.age) && fields.age >= 0 &&
          fields.age <= 120 && typeof fields.familyInsured === 'boolean' && typeof fields.bafoeg === 'boolean';
      case 'job':
        return isText(fields.id) && isText(fields.title) && employmentTypes.includes(fields.type as Job['type']) &&
          isNumber(fields.wage) && fields.wage >= 0 && isDate(fields.startDate) && (fields.endDate === undefined || fields.endDate === '' || isDate(fields.endDate));
      case 'shift':
        return isText(fields.jobId) && isDate(fields.date) && isNumber(fields.hours) && fields.hours >= 0 && fields.hours <= 24 * 366;
      case 'payment':
        return isText(fields.id) && isText(fields.jobId) && isDate(fields.date) && isNumber(fields.amount) && fields.amount > 0 &&
          (ONE_TIME_PAYMENT_KINDS as readonly unknown[]).includes(fields.kind);
      case 'calendarSource':
        return isText(fields.id) && isText(fields.name) && (fields.kind === 'url' || fields.kind === 'file');
      case 'settings':
        return (fields.language === 'de' || fields.language === 'en') && typeof fields.darkMode === 'boolean';
      case 'deviceState':
        return true;
    }
  })();
  if (!valid) return 'invalid';
  if ((kind === 'shift' || kind === 'payment') && !ctx.jobIds.has(fields.jobId as string)) return 'missingJob';
  return null;
}
