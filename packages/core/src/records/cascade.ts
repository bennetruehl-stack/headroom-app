import type { RecordConflict } from './merge';
import { recordId, type StoredRecord } from './schema';
import type { HlcStamp } from './hlc';
import { deleteRecord } from './update';

const dependsOn = (record: StoredRecord, jobId: string) =>
  (record.kind === 'shift' || record.kind === 'payment') && record.fields.jobId === jobId;

/** Löschvermerke für einen Job und alle seine Schichten und Einmalzahlungen. */
export function deleteJobWithDependents(records: readonly StoredRecord[], jobId: string, stamp: HlcStamp): StoredRecord[] {
  const jobRecord = recordId('job', jobId);
  return records
    .filter((record) => !record.deleted && (record.id === jobRecord || dependsOn(record, jobId)))
    .map((record) => deleteRecord(record, stamp));
}

/**
 * Lebende Schichten und Zahlungen, deren Job gelöscht ist. Sie werden nicht still verworfen:
 * Die App fragt, ob der Job wiederhergestellt oder der Datensatz mitgelöscht werden soll.
 */
export function orphanConflicts(records: readonly StoredRecord[]): RecordConflict[] {
  const deletedJobs = new Set(records.filter((record) => record.kind === 'job' && record.deleted).map((record) => record.fields.id as string));
  return records
    .filter((record) => !record.deleted && (record.kind === 'shift' || record.kind === 'payment') && deletedJobs.has(record.fields.jobId as string))
    .map((record) => ({ type: 'orphanedByDeletedJob', recordId: record.id, jobId: record.fields.jobId as string }));
}
