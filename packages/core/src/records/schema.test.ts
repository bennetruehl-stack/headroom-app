import { describe, expect, it } from 'vitest';
import { upgradeRecord } from './migrate';
import { RECORD_SCHEMA_VERSION, recordKinds, validateFields, type StoredRecord } from './schema';

const jobIds = new Set(['j1']);

describe('Prüfung je Datensatz', () => {
  it('nimmt gültige Datensätze jeder Art an', () => {
    expect(validateFields('profile', { status: 'Student', age: 20, familyInsured: true, bafoeg: false }, { jobIds })).toBeNull();
    expect(validateFields('job', { id: 'j1', title: 'Café', type: 'mini-job', wage: 13.9, startDate: '2026-01-01' }, { jobIds })).toBeNull();
    expect(validateFields('shift', { id: 's', jobId: 'j1', date: '2026-11-01', hours: 4 }, { jobIds })).toBeNull();
    expect(validateFields('payment', { id: 'p', jobId: 'j1', date: '2026-11-01', amount: 50, kind: 'bonus' }, { jobIds })).toBeNull();
    expect(validateFields('calendarSource', { id: 'c', name: 'Arbeit', kind: 'url' }, { jobIds })).toBeNull();
    expect(validateFields('settings', { language: 'en', darkMode: true }, { jobIds })).toBeNull();
  });

  it('nennt den Grund, wenn eine Schicht auf einen fehlenden Job verweist', () => {
    expect(validateFields('shift', { id: 's', jobId: 'weg', date: '2026-11-01', hours: 4 }, { jobIds })).toBe('missingJob');
  });

  it('lehnt ungültige Werte ab', () => {
    expect(validateFields('shift', { id: 's', jobId: 'j1', date: '2026-02-30', hours: 4 }, { jobIds })).toBe('invalid');
    expect(validateFields('shift', { id: 's', jobId: 'j1', date: '2026-11-01', hours: -1 }, { jobIds })).toBe('invalid');
    expect(validateFields('job', { id: 'j1', title: 'Café', type: 'freelance', wage: 13.9, startDate: '2026-01-01' }, { jobIds })).toBe('invalid');
    expect(validateFields('payment', { id: 'p', jobId: 'j1', date: '2026-11-01', amount: 0, kind: 'bonus' }, { jobIds })).toBe('invalid');
    expect(validateFields('profile', { status: 'Student', age: 121, familyInsured: true, bafoeg: false }, { jobIds })).toBe('invalid');
    expect(validateFields('settings', { language: 'fr', darkMode: false }, { jobIds })).toBe('invalid');
  });

  it('gleicht Gerätezustand und Beispielprofile nie ab', () => {
    expect(recordKinds.deviceState.synced).toBe(false);
    expect(recordKinds.shift.synced).toBe(true);
    expect(recordKinds.settings.knownFields).toEqual(['language', 'darkMode']);
  });
});

describe('Schema-Version', () => {
  const record: StoredRecord = {
    id: 'shift:s', kind: 'shift', schemaVersion: RECORD_SCHEMA_VERSION, fields: { id: 's' }, fieldClock: {}, deleted: false,
  };

  it('lässt den aktuellen Stand schreibbar', () => {
    expect(upgradeRecord(record)).toEqual({ record, writable: true });
  });

  it('zeigt einen neueren Datensatz nur an und verändert ihn nicht', () => {
    const newer = { ...record, schemaVersion: RECORD_SCHEMA_VERSION + 2 };
    expect(upgradeRecord(newer)).toEqual({ record: newer, writable: false });
  });

  it('hebt einen älteren Datensatz Schritt für Schritt an', () => {
    const old = { ...record, schemaVersion: RECORD_SCHEMA_VERSION - 1, fields: { id: 's', stunden: 3 } };
    const steps = {
      [RECORD_SCHEMA_VERSION - 1]: (fields: Record<string, unknown>) => {
        const { stunden, ...rest } = fields;
        return { ...rest, hours: stunden };
      },
    };
    expect(upgradeRecord(old, steps)).toEqual({
      record: { ...old, schemaVersion: RECORD_SCHEMA_VERSION, fields: { id: 's', hours: 3 } },
      writable: true,
    });
  });
});
