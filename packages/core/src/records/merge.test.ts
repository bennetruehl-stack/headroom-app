import { describe, expect, it } from 'vitest';
import { createClock, tick, type HlcStamp } from './hlc';
import { mergeRecord } from './merge';
import { RECORD_SCHEMA_VERSION, type StoredRecord } from './schema';
import { deleteRecord, updateRecord } from './update';

const T = Date.UTC(2026, 10, 1, 12, 0, 0);
const at = (minutes: number, node = 'gerät-a'): HlcStamp => tick(createClock(node), T + minutes * 60_000).stamp;

const shiftFields = { id: 's1', jobId: 'j1', date: '2026-11-01', hours: 4 };
const base = updateRecord(undefined, 'shift', 'shift:s1', shiftFields, at(0)) as StoredRecord;

describe('Zusammenführen je Feld', () => {
  it('behält Änderungen an verschiedenen Feldern derselben Schicht von beiden Geräten', () => {
    const onA = updateRecord(base, 'shift', base.id, { ...shiftFields, hours: 5 }, at(1, 'gerät-a'))!;
    const onB = updateRecord(base, 'shift', base.id, { ...shiftFields, startTime: '10:00' }, at(2, 'gerät-b'))!;
    const { record, conflict } = mergeRecord(onA, onB);
    expect(record.fields).toMatchObject({ hours: 5, startTime: '10:00' });
    expect(conflict).toBeUndefined();
    expect(mergeRecord(onB, onA).record.fields).toEqual(record.fields);
  });

  it('lässt im selben Feld die jüngere Änderung gewinnen', () => {
    const older = updateRecord(base, 'shift', base.id, { ...shiftFields, hours: 5 }, at(1, 'gerät-a'))!;
    const newer = updateRecord(base, 'shift', base.id, { ...shiftFields, hours: 6 }, at(2, 'gerät-b'))!;
    expect(mergeRecord(older, newer).record.fields.hours).toBe(6);
    expect(mergeRecord(newer, older).record.fields.hours).toBe(6);
  });

  it('entscheidet bei gleicher Zeit nach der Geräte-ID, egal in welcher Reihenfolge', () => {
    const onA = updateRecord(base, 'shift', base.id, { ...shiftFields, hours: 5 }, at(1, 'gerät-a'))!;
    const onB = updateRecord(base, 'shift', base.id, { ...shiftFields, hours: 6 }, at(1, 'gerät-b'))!;
    expect(mergeRecord(onA, onB).record.fields.hours).toBe(6);
    expect(mergeRecord(onB, onA).record.fields.hours).toBe(6);
  });

  it('übernimmt ein entferntes Feld, wenn das Entfernen jünger ist', () => {
    const withEnd = updateRecord(base, 'shift', base.id, { ...shiftFields, endTime: '14:00' }, at(1))!;
    const removed = updateRecord(withEnd, 'shift', base.id, shiftFields, at(2, 'gerät-b'))!;
    expect(mergeRecord(withEnd, removed).record.fields).not.toHaveProperty('endTime');
  });

  it('führt erledigte Übergänge als Menge zusammen', () => {
    const profile = { status: 'Pupil', age: 17, familyInsured: true, bafoeg: false };
    const start = updateRecord(undefined, 'profile', 'profile', profile, at(0))!;
    const onA = updateRecord(start, 'profile', 'profile', { ...profile, handledTransitions: ['adult:2026'] }, at(1, 'gerät-a'))!;
    const onB = updateRecord(start, 'profile', 'profile', { ...profile, handledTransitions: ['school:2026:dismissed'] }, at(2, 'gerät-b'))!;
    const merged = mergeRecord(onA, onB).record.fields.handledTransitions;
    expect([...(merged as string[])].sort()).toEqual(['adult:2026', 'school:2026:dismissed']);
  });

  it('führt Einwilligungen der Eltern je Job zusammen', () => {
    const profile = { status: 'Pupil', age: 16, familyInsured: true, bafoeg: false };
    const start = updateRecord(undefined, 'profile', 'profile', profile, at(0))!;
    const bakery = { job: true, hours: true, wage: true, commute: true };
    const tutoring = { job: true, hours: false, wage: true, commute: true };
    const onA = updateRecord(start, 'profile', 'profile', { ...profile, parentalConsent: { bakery } }, at(1, 'gerät-a'))!;
    const onB = updateRecord(start, 'profile', 'profile', { ...profile, parentalConsent: { tutoring } }, at(2, 'gerät-b'))!;
    expect(mergeRecord(onA, onB).record.fields.parentalConsent).toEqual({ bakery, tutoring });
  });

  it('lässt ein Feld, das das Gerät nicht kennt, unverändert', () => {
    const remote: StoredRecord = {
      ...base,
      fields: { ...base.fields, neuesFeld: { wert: 1 } },
      fieldClock: { ...base.fieldClock, neuesFeld: at(1, 'gerät-b') },
    };
    const local = updateRecord(base, 'shift', base.id, { ...shiftFields, hours: 7 }, at(2))!;
    const { record } = mergeRecord(local, remote);
    expect(record.fields.neuesFeld).toEqual({ wert: 1 });
    expect(record.fields.hours).toBe(7);
    // Ein Gerät, das das Feld nicht kennt, entfernt es auch beim Speichern nicht.
    const saved = updateRecord(record, 'shift', base.id, { ...shiftFields, hours: 8 }, at(3))!;
    expect(saved.fields.neuesFeld).toEqual({ wert: 1 });
  });

  it('nimmt einen Datensatz mit neuerer Schema-Version unverändert und schreibt ihn nicht', () => {
    const newer: StoredRecord = { ...base, schemaVersion: RECORD_SCHEMA_VERSION + 1, fields: { ...base.fields, hours: 9 } };
    expect(mergeRecord(base, newer).record).toEqual(newer);
    expect(updateRecord(newer, 'shift', base.id, { ...shiftFields, hours: 1 }, at(5))).toBeNull();
  });
});

describe('Löschen gegen Ändern', () => {
  it('lässt das Löschen gewinnen, wenn die Änderung vorher war', () => {
    const edited = updateRecord(base, 'shift', base.id, { ...shiftFields, hours: 5 }, at(1, 'gerät-b'))!;
    const deleted = deleteRecord(base, at(2, 'gerät-a'));
    const result = mergeRecord(edited, deleted);
    expect(result.record.deleted).toBe(true);
    expect(result.conflict).toBeUndefined();
  });

  it('verwirft eine spätere Änderung nicht und meldet einen Konflikt', () => {
    const deleted = deleteRecord(base, at(1, 'gerät-a'));
    const edited = updateRecord(base, 'shift', base.id, { ...shiftFields, hours: 5 }, at(2, 'gerät-b'))!;
    for (const result of [mergeRecord(deleted, edited), mergeRecord(edited, deleted)]) {
      expect(result.record.deleted).toBe(false);
      expect(result.record.fields.hours).toBe(5);
      expect(result.conflict).toEqual({ type: 'editedAfterDelete', recordId: 'shift:s1' });
    }
  });
});
