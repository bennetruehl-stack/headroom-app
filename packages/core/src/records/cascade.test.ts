import { describe, expect, it } from 'vitest';
import { deleteJobWithDependents, orphanConflicts } from './cascade';
import { createClock, tick } from './hlc';
import type { StoredRecord } from './schema';
import { updateRecord } from './update';

const T = Date.UTC(2026, 10, 1, 12, 0, 0);
const stamp = (minutes: number) => tick(createClock('gerät-a'), T + minutes * 60_000).stamp;

const job = updateRecord(undefined, 'job', 'job:j1', { id: 'j1', title: 'Café', type: 'mini-job', wage: 13.9, startDate: '2026-01-01' }, stamp(0))!;
const shift = (id: string, jobId = 'j1') =>
  updateRecord(undefined, 'shift', 'shift:' + id, { id, jobId, date: '2026-11-01', hours: 3 }, stamp(0))!;
const payment = updateRecord(undefined, 'payment', 'payment:p1', { id: 'p1', jobId: 'j1', date: '2026-11-30', amount: 100, kind: 'bonus' }, stamp(0))!;
const otherJob = updateRecord(undefined, 'job', 'job:j2', { id: 'j2', title: 'Kino', type: 'mini-job', wage: 13.9, startDate: '2026-01-01' }, stamp(0))!;

describe('Job löschen', () => {
  it('liefert Löschvermerke für den Job, seine 3 Schichten und seine Zahlung', () => {
    const records = [job, shift('a'), shift('b'), shift('c'), payment, otherJob, shift('x', 'j2')];
    const tombstones = deleteJobWithDependents(records, 'j1', stamp(1));
    expect(tombstones).toHaveLength(5);
    expect(tombstones.every((record) => record.deleted)).toBe(true);
    expect(tombstones.map((record) => record.id).sort()).toEqual(['job:j1', 'payment:p1', 'shift:a', 'shift:b', 'shift:c']);
  });
});

describe('Konflikte nach dem Abgleich', () => {
  it('meldet eine lebende Schicht, deren Job gelöscht wurde, statt sie zu verwerfen', () => {
    const deleted: StoredRecord[] = deleteJobWithDependents([job, shift('a')], 'j1', stamp(1));
    const createdOffline = shift('neu');
    expect(orphanConflicts([...deleted, createdOffline, otherJob])).toEqual([
      { type: 'orphanedByDeletedJob', recordId: 'shift:neu', jobId: 'j1' },
    ]);
  });

  it('meldet nichts, solange der Job lebt', () => {
    expect(orphanConflicts([job, shift('a'), payment])).toEqual([]);
  });
});
