import { compareStamps, type HlcStamp } from './hlc';
import { mapFields, RECORD_SCHEMA_VERSION, setFields, type StoredRecord } from './schema';

export type RecordConflict =
  /** Ein Gerät hat den Datensatz gelöscht, ein anderes hat ihn danach geändert. */
  | { type: 'editedAfterDelete'; recordId: string }
  /** Eine Schicht oder Zahlung lebt noch, ihr Job wurde aber gelöscht. */
  | { type: 'orphanedByDeletedJob'; recordId: string; jobId: string };

const newest = (stamps: (HlcStamp | undefined)[]) =>
  stamps.reduce<HlcStamp | undefined>((best, stamp) => (compareStamps(stamp, best) > 0 ? stamp : best), undefined);

const asMap = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** Führt die Felder zweier Stände zusammen: Je Feld gewinnt die jüngere Zeitmarke. */
function mergeFields(a: StoredRecord, b: StoredRecord): Pick<StoredRecord, 'fields' | 'fieldClock'> {
  const sets = setFields[a.kind] ?? [];
  const maps = mapFields[a.kind] ?? [];
  const fields: Record<string, unknown> = {};
  const fieldClock: Record<string, HlcStamp> = {};
  const topLevel = (key: string) => (maps.some((name) => key.startsWith(name + '.')) ? key.slice(0, key.indexOf('.')) : key);
  const names = new Set([...Object.keys(a.fields), ...Object.keys(b.fields), ...Object.keys(a.fieldClock), ...Object.keys(b.fieldClock)].map(topLevel));
  for (const name of names) {
    if (sets.includes(name)) {
      const union = new Set([...((a.fields[name] as unknown[]) ?? []), ...((b.fields[name] as unknown[]) ?? [])]);
      if (a.fields[name] !== undefined || b.fields[name] !== undefined) fields[name] = [...union];
      const stamp = newest([a.fieldClock[name], b.fieldClock[name]]);
      if (stamp) fieldClock[name] = stamp;
      continue;
    }
    if (maps.includes(name)) {
      const left = asMap(a.fields[name]);
      const right = asMap(b.fields[name]);
      const prefix = name + '.';
      const keys = new Set([
        ...Object.keys(left), ...Object.keys(right),
        ...[...Object.keys(a.fieldClock), ...Object.keys(b.fieldClock)].filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length)),
      ]);
      const merged: Record<string, unknown> = {};
      for (const key of keys) {
        const fromB = compareStamps(b.fieldClock[prefix + key], a.fieldClock[prefix + key]) > 0;
        const value = fromB ? right[key] : left[key];
        if (value !== undefined) merged[key] = value;
        const stamp = fromB ? b.fieldClock[prefix + key] : a.fieldClock[prefix + key];
        if (stamp) fieldClock[prefix + key] = stamp;
      }
      if (a.fields[name] !== undefined || b.fields[name] !== undefined) fields[name] = merged;
      continue;
    }
    const order = compareStamps(b.fieldClock[name], a.fieldClock[name]);
    const source = order > 0 || (order === 0 && a.fields[name] === undefined) ? b : a;
    if (source.fields[name] !== undefined) fields[name] = source.fields[name];
    if (source.fieldClock[name]) fieldClock[name] = source.fieldClock[name];
  }
  return { fields, fieldClock };
}

/**
 * Führt den lokalen und einen empfangenen Stand desselben Datensatzes zusammen.
 * Ein Löschvermerk gewinnt nur gegen ältere Änderungen. Wurde nach dem Löschen noch geändert,
 * bleibt der Datensatz erhalten und es wird ein Konflikt gemeldet.
 */
export function mergeRecord(local: StoredRecord, remote: StoredRecord): { record: StoredRecord; conflict?: RecordConflict } {
  if (remote.schemaVersion > RECORD_SCHEMA_VERSION) return { record: remote };
  if (local.schemaVersion > RECORD_SCHEMA_VERSION) return { record: local };
  const merged: StoredRecord = {
    ...local,
    ...mergeFields(local, remote),
    schemaVersion: Math.max(local.schemaVersion, remote.schemaVersion),
    deleted: false,
  };
  delete merged.deletedAt;
  if (!local.deleted && !remote.deleted) return { record: merged };
  const deletedAt = newest([local.deleted ? local.deletedAt : undefined, remote.deleted ? remote.deletedAt : undefined]);
  if (local.deleted && remote.deleted) return { record: { ...merged, deleted: true, deletedAt } };
  const alive = local.deleted ? remote : local;
  if (compareStamps(newest(Object.values(alive.fieldClock)), deletedAt) > 0) {
    return { record: merged, conflict: { type: 'editedAfterDelete', recordId: local.id } };
  }
  return { record: { ...merged, deleted: true, deletedAt } };
}
