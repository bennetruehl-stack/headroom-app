import { RECORD_SCHEMA_VERSION, type StoredRecord } from './schema';

/** Hebt die Felder eines Datensatzes von Version n auf n + 1. */
export type FieldMigration = (fields: Record<string, unknown>) => Record<string, unknown>;

/** Schritte je Ausgangsversion. */
export const recordMigrations: Readonly<Record<number, FieldMigration>> = {};

/**
 * Bringt einen Datensatz auf den Stand dieses App-Stands.
 * Ein Datensatz aus einem neueren App-Stand bleibt unverändert und darf hier nicht geschrieben werden.
 */
export function upgradeRecord(record: StoredRecord, steps: Readonly<Record<number, FieldMigration>> = recordMigrations): { record: StoredRecord; writable: boolean } {
  if (record.schemaVersion > RECORD_SCHEMA_VERSION) return { record, writable: false };
  if (record.schemaVersion === RECORD_SCHEMA_VERSION) return { record, writable: true };
  let fields = record.fields;
  for (let version = record.schemaVersion; version < RECORD_SCHEMA_VERSION; version += 1) {
    const step = steps[version];
    if (step) fields = step(fields);
  }
  return { record: { ...record, schemaVersion: RECORD_SCHEMA_VERSION, fields }, writable: true };
}
