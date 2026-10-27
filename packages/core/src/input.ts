// Zentrale Prüfung von Nutzereingaben. Die Texte zu den Fehlercodes stehen in der App (i18n).

export type NumberErrorCode = 'empty' | 'invalid' | 'tooSmall' | 'tooLarge' | 'notInteger';

export type NumberRule = {
  min?: number;
  max?: number;
  integer?: boolean;
  /** Leere Eingabe ist erlaubt und ergibt `null`. */
  optional?: boolean;
};

export type NumberResult =
  | { ok: true; value: number | null }
  | { ok: false; error: NumberErrorCode; min?: number; max?: number };

/**
 * Liest eine Zahl aus deutscher oder englischer Schreibweise:
 * „12,50“, „12.50“, „1.234,56“, „1,234.56“, „ 13,90 € “.
 * Gibt `null` zurück, wenn die Eingabe keine eindeutige endliche Zahl ist.
 */
export function parseLocaleNumber(input: string): number | null {
  let text = input.replace(/[\s  ]/g, '').replace(/(€|eur|euro|h|std\.?)$/i, '');
  if (!text) return null;
  const negative = text.startsWith('-');
  if (negative || text.startsWith('+')) text = text.slice(1);
  if (!/^[\d.,]+$/.test(text)) return null;
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    // Beide Zeichen: das hintere ist das Dezimalzeichen, das andere trennt Tausender.
    const decimal = lastComma > lastDot ? ',' : '.';
    const group = decimal === ',' ? '.' : ',';
    const [whole, fraction, ...rest] = text.split(decimal);
    if (rest.length || fraction === undefined || !/^\d{1,3}([.,]\d{3})*$/.test(whole) || whole.includes(decimal)) return null;
    normalized = whole.split(group).join('') + '.' + fraction;
  } else if (lastComma >= 0 || lastDot >= 0) {
    const separator = lastComma >= 0 ? ',' : '.';
    const parts = text.split(separator);
    if (parts.length > 2) {
      // Mehrfach: nur als Tausendertrennung gültig („1.234.567“).
      if (!/^\d{1,3}$/.test(parts[0]) || parts.slice(1).some((part) => !/^\d{3}$/.test(part))) return null;
      normalized = parts.join('');
    } else if (separator === '.' && /^\d{1,3}$/.test(parts[0]) && /^\d{3}$/.test(parts[1]) && parts[0] !== '0') {
      // „1.500“ ist im Deutschen eintausendfünfhundert. Das ist eindeutig genug,
      // weil niemand Stunden oder Löhne mit drei Nachkommastellen eingibt.
      normalized = parts.join('');
    } else {
      normalized = parts[0] + '.' + parts[1];
    }
  } else {
    normalized = text;
  }
  if (!/^\d*\.?\d+$/.test(normalized) && !/^\d+\.?$/.test(normalized)) return null;
  const value = Number(normalized) * (negative ? -1 : 1);
  return Number.isFinite(value) ? value : null;
}

export function validateNumber(input: string, rule: NumberRule = {}): NumberResult {
  if (!input.trim()) {
    return rule.optional ? { ok: true, value: null } : { ok: false, error: 'empty' };
  }
  const value = parseLocaleNumber(input);
  if (value === null || !Number.isFinite(value)) return { ok: false, error: 'invalid' };
  if (rule.integer && !Number.isInteger(value)) return { ok: false, error: 'notInteger' };
  if (rule.min !== undefined && value < rule.min) return { ok: false, error: 'tooSmall', min: rule.min, max: rule.max };
  if (rule.max !== undefined && value > rule.max) return { ok: false, error: 'tooLarge', min: rule.min, max: rule.max };
  return { ok: true, value };
}

/** Wertebereiche der Eingabefelder. Bewusst großzügig: sie fangen Tippfehler, keine Sonderfälle. */
export const inputRules = {
  hourlyWage: { min: 0.01, max: 500 },
  expectedWage: { min: 0, max: 500, optional: true },
  shiftHours: { min: 0.25, max: 24 },
  surchargePercent: { min: 0, max: 300, optional: true },
  tipsPerShift: { min: 0, max: 10_000, optional: true },
  paymentAmount: { min: 0.01, max: 100_000 },
  age: { min: 0, max: 120, integer: true },
} as const satisfies Record<string, NumberRule>;

export type DateErrorCode = 'empty' | 'invalidDate' | 'outOfRange' | 'endBeforeStart';

/** Echter Kalendertag im Format JJJJ-MM-TT (kein 31. Februar). */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Datumsangaben außerhalb dieses Rahmens sind fast immer Tippfehler (z. B. 0202 statt 2026). */
export const dateBounds = { min: '2000-01-01', max: '2099-12-31' } as const;

export function validateDate(value: string, optional = false): DateErrorCode | null {
  if (!value) return optional ? null : 'empty';
  if (!isValidIsoDate(value)) return 'invalidDate';
  if (value < dateBounds.min || value > dateBounds.max) return 'outOfRange';
  return null;
}

/** Prüft Beginn und optionales Ende. Ein Ende vor dem Beginn ist ein Fehler. */
export function validateDateRange(start: string, end: string, endOptional = true): DateErrorCode | null {
  const startError = validateDate(start);
  if (startError) return startError;
  const endError = validateDate(end, endOptional);
  if (endError) return endError;
  if (end && end < start) return 'endBeforeStart';
  return null;
}
