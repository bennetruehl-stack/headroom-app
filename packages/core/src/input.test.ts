import { describe, expect, it } from 'vitest';
import { inputRules, isValidIsoDate, parseLocaleNumber, validateDate, validateDateRange, validateNumber } from './input';

describe('parseLocaleNumber', () => {
  it.each([
    ['12,50', 12.5],
    ['12.50', 12.5],
    ['13,9', 13.9],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['1.500', 1500],
    ['0.500', 0.5],
    ['  13,90 € ', 13.9],
    ['8h', 8],
    ['1.234.567', 1234567],
    [',5', 0.5],
    ['7', 7],
  ])('liest %s als %s', (input, expected) => {
    expect(parseLocaleNumber(input)).toBeCloseTo(expected, 10);
  });

  it.each(['', 'abc', '1,2,3', '12,5.0,1', '1e5', 'Infinity', 'NaN', '--5', '12 50x'])('lehnt %s ab', (input) => {
    expect(parseLocaleNumber(input)).toBeNull();
  });
});

describe('validateNumber', () => {
  it('meldet leere, ungültige und zu große Werte mit Code', () => {
    expect(validateNumber('', inputRules.shiftHours)).toEqual({ ok: false, error: 'empty' });
    expect(validateNumber('abc', inputRules.shiftHours)).toEqual({ ok: false, error: 'invalid' });
    expect(validateNumber('25', inputRules.shiftHours)).toMatchObject({ ok: false, error: 'tooLarge', max: 24 });
    expect(validateNumber('0,1', inputRules.shiftHours)).toMatchObject({ ok: false, error: 'tooSmall', min: 0.25 });
    expect(validateNumber('20,5', inputRules.age)).toEqual({ ok: false, error: 'notInteger' });
    expect(validateNumber('-3', inputRules.paymentAmount)).toMatchObject({ ok: false, error: 'tooSmall' });
  });

  it('akzeptiert Grenzwerte des Bereichs und optionale leere Felder', () => {
    expect(validateNumber('24', inputRules.shiftHours)).toEqual({ ok: true, value: 24 });
    expect(validateNumber('0,25', inputRules.shiftHours)).toEqual({ ok: true, value: 0.25 });
    expect(validateNumber('', inputRules.expectedWage)).toEqual({ ok: true, value: null });
  });
});

describe('Datumsprüfung', () => {
  it('erkennt echte Kalendertage', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2028-02-29')).toBe(true);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('26-01-01')).toBe(false);
  });

  it('prüft Rahmen und Reihenfolge', () => {
    expect(validateDate('')).toBe('empty');
    expect(validateDate('', true)).toBeNull();
    expect(validateDate('0202-01-01')).toBe('outOfRange');
    expect(validateDateRange('2026-04-01', '2026-03-31')).toBe('endBeforeStart');
    expect(validateDateRange('2026-04-01', '2026-04-01')).toBeNull();
    expect(validateDateRange('2026-04-01', '')).toBeNull();
    expect(validateDateRange('2026-04-01', '', false)).toBe('empty');
  });
});
