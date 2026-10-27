import type { DateErrorCode, NumberResult } from '@headroom/core';
import { t, type Language } from '../i18n/translations';

function numberText(value: number | undefined, language: Language): string {
  if (value === undefined) return '';
  return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-GB', { maximumFractionDigits: 2 }).format(value);
}

/** Verständliche Fehlermeldung zu einer geprüften Zahleneingabe; leer, wenn alles passt. */
export function numberError(result: NumberResult, field: string, language: Language): string {
  if (result.ok) return '';
  const values = { field, min: numberText(result.min, language), max: numberText(result.max, language) };
  switch (result.error) {
    case 'empty': return t(language, 'errEmpty', values);
    case 'invalid': return t(language, 'errInvalid', values);
    case 'tooSmall': return t(language, 'errTooSmall', values);
    case 'tooLarge': return t(language, 'errTooLarge', values);
    case 'notInteger': return t(language, 'errNotInteger', values);
  }
}

export function dateError(code: DateErrorCode | null, field: string, language: Language): string {
  switch (code) {
    case null: return '';
    case 'empty': return t(language, 'errDateEmpty', { field });
    case 'invalidDate': return t(language, 'errDateInvalid', { field });
    case 'outOfRange': return t(language, 'errDateRange', { field });
    case 'endBeforeStart': return t(language, 'errEndBeforeStart');
  }
}

/** Zahl für ein Textfeld vorbelegen, im Deutschen mit Komma. */
export function numberInputValue(value: number | undefined | null, language: Language): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '';
  return language === 'de' ? String(value).replace('.', ',') : String(value);
}
