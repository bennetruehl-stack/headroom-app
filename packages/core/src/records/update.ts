import { asMap, sameValue } from './equal';
import type { HlcStamp } from './hlc';
import { mapFields, RECORD_SCHEMA_VERSION, recordKinds, type RecordKind, type StoredRecord } from './schema';

type Fields = Record<string, unknown>;

function withoutUndefined(values: Fields): Fields {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

/**
 * Schreibt neue Feldwerte in einen Datensatz und setzt nur für geänderte Felder eine neue Zeitmarke.
 * Felder, die dieser App-Stand nicht kennt, bleiben erhalten. Liefert `null`, wenn sich nichts geändert hat
 * oder der Datensatz aus einem neueren App-Stand stammt.
 */
export function updateRecord(previous: StoredRecord | undefined, kind: RecordKind, id: string, next: Fields, stamp: HlcStamp): StoredRecord | null {
  if (previous && previous.schemaVersion > RECORD_SCHEMA_VERSION) return null;
  const nextFields = withoutUndefined(next);
  const maps = mapFields[kind] ?? [];
  if (!previous || previous.deleted) {
    const fieldClock: Record<string, HlcStamp> = {};
    for (const name of Object.keys(nextFields)) {
      if (maps.includes(name)) for (const key of Object.keys(asMap(nextFields[name]))) fieldClock[name + '.' + key] = stamp;
      else fieldClock[name] = stamp;
    }
    return { id, kind, schemaVersion: RECORD_SCHEMA_VERSION, fields: nextFields, fieldClock, deleted: false };
  }
  const fields: Fields = { ...previous.fields };
  const fieldClock = { ...previous.fieldClock };
  let changed = false;
  const names = new Set([...recordKinds[kind].knownFields, ...Object.keys(nextFields)]);
  for (const name of names) {
    if (maps.includes(name)) {
      const before = asMap(fields[name]);
      const after = asMap(nextFields[name]);
      const merged: Fields = { ...before };
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (sameValue(before[key], after[key])) continue;
        if (after[key] === undefined) delete merged[key];
        else merged[key] = after[key];
        fieldClock[name + '.' + key] = stamp;
        changed = true;
      }
      if (Object.keys(merged).length || nextFields[name] !== undefined) fields[name] = merged;
      else delete fields[name];
      continue;
    }
    if (sameValue(fields[name], nextFields[name])) continue;
    if (nextFields[name] === undefined) delete fields[name];
    else fields[name] = nextFields[name];
    fieldClock[name] = stamp;
    changed = true;
  }
  return changed ? { ...previous, fields, fieldClock } : null;
}

/** Löschvermerk. Die Felder bleiben erhalten, damit ein Konflikt den Datensatz wiederherstellen kann. */
export function deleteRecord(record: StoredRecord, stamp: HlcStamp): StoredRecord {
  return { ...record, deleted: true, deletedAt: stamp };
}
