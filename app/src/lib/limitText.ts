import { annualIncomeProjection, monthlyLimitCheck, type Job, type Limit, type MonthlyLimitCheck, type RiskStatus, type Shift } from '@headroom/core';
import { employmentTypes } from '../app/constants';
import { t, type Language, type MessageKey } from '../i18n/translations';
import { localToday } from './format';

export function statusKey(value: RiskStatus): MessageKey {
  if (value === 'Safe') return 'safe';
  if (value === 'Close') return 'close';
  if (value === 'Unknown') return 'statusUnknown';
  return 'over';
}

/** Ein Grenzwert ohne Wert für das Jahr ist „nicht verfügbar“ (nicht dasselbe wie ungeprüft). */
export function limitUnavailable(limit: Limit | undefined): boolean {
  return !limit || limit.value === null;
}

export function grossEquivalentNote(limit: Limit, language: Language): string | undefined {
  if (!limit.grossEquivalent) return undefined;
  return language === 'en' ? limit.grossEquivalent.note_en : limit.grossEquivalent.note;
}

export function limitName(limit: Limit, language: Language): string {
  return language === 'en' ? limit.name_en ?? limit.name : limit.name;
}

// Interne Prüfnotizen (limit.reviewNote) werden hier bewusst nie verwendet.
export function limitConsequence(limit: Limit, language: Language): string {
  const text = language === 'en' ? limit.consequence_en ?? limit.consequence : limit.consequence;
  return text || t(language, 'valuePending');
}

export function limitSourceName(limit: Limit, language: Language): string {
  return limit.sourceName || t(language, 'sourcePending');
}

/** Kurzname für Karten: alles vor „ – “, der volle Name steht im Tooltip. */
export function shortSourceName(limit: Limit, language: Language): string {
  return limitSourceName(limit, language).split(' – ')[0];
}

export function companyErrorMessage(code: string | undefined, language: Language): string {
  if (code === 'tooShort') return t(language, 'companyTooShort');
  if (code === 'digitsOnly') return t(language, 'companyDigits');
  return t(language, 'companyMash');
}

export function getAgeBoundary(limit: Limit | undefined): number | null {
  const boundary = limit?.condition?.match(/age\s*<\s*(\d+)/i)?.[1];
  return boundary ? Number(boundary) : null;
}

export function employmentLabel(type: Job['type'], language: Language): string {
  const entry = employmentTypes.find((item) => item.value === type);
  return entry ? t(language, entry.key) : type;
}

export function periodLabel(period: Limit['period'], language: Language): string {
  const keys: Record<Limit['period'], MessageKey> = {
    month: 'periodMonth', year: 'periodYear', week: 'periodWeek',
    day: 'periodDay', season: 'periodSeason', hour: 'periodHour',
  };
  return t(language, keys[period]);
}

export function calculateAnnualProjection(
  shifts: Shift[],
  jobs: Job[],
  year: number,
  types: Job['type'][],
): number {
  const now = localToday();
  const month = Number(now.slice(0, 4)) === year ? Number(now.slice(5, 7)) : 12;
  return annualIncomeProjection(shifts, jobs, year, types, month);
}

/** Monatsprüfung aus dem Core; `null`, wenn der Wert fehlt oder ungeprüft ist. */
export function monthlyAmountForLimit(
  limit: Limit,
  jobs: Job[],
  shifts: Shift[],
  month: string,
  year: number,
): MonthlyLimitCheck | null {
  return monthlyLimitCheck(limit, shifts, jobs, month, year);
}
