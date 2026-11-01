import {
  createClock,
  deleteRecord,
  tick,
  updateRecord,
  upgradeRecord,
  type Clock,
  type QuarantinedRecord,
  type StoredRecord,
} from '@headroom/core';
import { id as newId } from '../format';
import type { AppState } from '../storage';
import { inputsToState, splitLegacyState, stateToInputs } from './migrateV1';

/** Ein gespeicherter Datensatz plus seine Stelle in der Liste (nur auf diesem Gerät). */
export type Row = { record: StoredRecord; position: number };

export type Meta = { node: string; clock: Clock; migratedV1: boolean };

export type Snapshot = { rows: Row[]; quarantine: QuarantinedRecord[]; meta: Meta | null; legacy: unknown };

export type Commit = { put: Row[]; quarantine?: QuarantinedRecord[]; meta: Meta };

/** `state` ist `null`, wenn auf diesem Gerät noch nichts gespeichert ist. */
export type LoadResult = { state: AppState | null; quarantine: QuarantinedRecord[] };

/** Je Kennung bleibt der letzte Eintrag, in der Reihenfolge des ersten Auftretens. */
export function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export interface RecordBackend {
  load(): Promise<Snapshot>;
  /** Schreibt alles in einem Schritt oder gar nicht. */
  commit(change: Commit): Promise<void>;
  removeLegacy(): Promise<void>;
  clearQuarantine(): Promise<void>;
  /** Entfernt alles auf diesem Gerät, auch den alten Block. */
  clearAll(): Promise<void>;
}

const DATABASE = 'headroom-local';
const LEGACY_STORE = 'app-state';
const LEGACY_KEY = 'main';
const LEGACY_FALLBACK_KEY = 'headroom-data';
const RECORDS_FALLBACK_KEY = 'headroom-records';
const RECORDS = 'records';
const QUARANTINE = 'quarantine';
const META = 'meta';
const META_KEY = 'main';

function readLegacyFallback(): unknown {
  try {
    const raw = localStorage.getItem(LEGACY_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function removeFallback(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage kann gesperrt sein.
  }
}

function applyCommit(target: { rows: Map<string, Row>; quarantine: Map<string, QuarantinedRecord> }, change: Commit) {
  for (const row of change.put) target.rows.set(row.record.id, row);
  for (const item of change.quarantine ?? []) target.quarantine.set(item.id, item);
}

/** Nur im Arbeitsspeicher, wenn ein Browser beide Speicher sperrt. Hilft auch in Tests. */
export function memoryBackend(initial: { legacy?: unknown; failCommits?: number } = {}) {
  const rows = new Map<string, Row>();
  const quarantine = new Map<string, QuarantinedRecord>();
  let meta: Meta | null = null;
  let legacy = initial.legacy ?? null;
  let failures = initial.failCommits ?? 0;
  let commits = 0;
  let last: Row[] = [];
  const backend: RecordBackend = {
    async load() {
      return { rows: [...rows.values()], quarantine: [...quarantine.values()], meta, legacy };
    },
    async commit(change) {
      if (failures > 0) {
        failures -= 1;
        throw new Error('commit failed');
      }
      applyCommit({ rows, quarantine }, change);
      meta = change.meta;
      commits += 1;
      last = change.put;
    },
    async removeLegacy() {
      legacy = null;
    },
    async clearQuarantine() {
      quarantine.clear();
    },
    async clearAll() {
      rows.clear();
      quarantine.clear();
      meta = null;
      legacy = null;
    },
  };
  return {
    ...backend,
    rows: () => [...rows.values()],
    quarantine: () => [...quarantine.values()],
    legacy: () => legacy,
    commits: () => commits,
    lastCommit: () => last,
    replace: (row: Row) => rows.set(row.record.id, row),
  };
}

/** Rückfall, wenn IndexedDB fehlt: alles als ein JSON-Wert in localStorage. */
export function localStorageBackend(): RecordBackend {
  type Stored = { rows: Row[]; quarantine: QuarantinedRecord[]; meta: Meta | null };
  const read = (): Stored => {
    const raw = localStorage.getItem(RECORDS_FALLBACK_KEY);
    return raw ? (JSON.parse(raw) as Stored) : { rows: [], quarantine: [], meta: null };
  };
  const write = (value: Stored) => localStorage.setItem(RECORDS_FALLBACK_KEY, JSON.stringify(value));
  return {
    async load() {
      return { ...read(), legacy: readLegacyFallback() };
    },
    async commit(change) {
      const current = read();
      const target = { rows: new Map(current.rows.map((row) => [row.record.id, row])), quarantine: new Map(current.quarantine.map((item) => [item.id, item])) };
      applyCommit(target, change);
      write({ rows: [...target.rows.values()], quarantine: [...target.quarantine.values()], meta: change.meta });
    },
    async removeLegacy() {
      removeFallback(LEGACY_FALLBACK_KEY);
    },
    async clearQuarantine() {
      write({ ...read(), quarantine: [] });
    },
    async clearAll() {
      removeFallback(RECORDS_FALLBACK_KEY);
      removeFallback(LEGACY_FALLBACK_KEY);
    },
  };
}

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error ?? new Error('IndexedDB request failed'));
  });
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

/** IndexedDB `headroom-local` Version 2: je Datensatz eine Zeile, der alte Block bleibt im Store `app-state`. */
export function indexedDbBackend(): RecordBackend {
  const open = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      if (!('indexedDB' in globalThis)) {
        reject(new Error('IndexedDB is not available'));
        return;
      }
      const opening = indexedDB.open(DATABASE, 2);
      opening.onupgradeneeded = () => {
        const db = opening.result;
        for (const name of [LEGACY_STORE, RECORDS, QUARANTINE, META]) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
        }
      };
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error ?? new Error('Could not open IndexedDB'));
    });
  const withDb = async <T>(work: (db: IDBDatabase) => Promise<T>): Promise<T> => {
    const db = await open();
    try {
      return await work(db);
    } finally {
      db.close();
    }
  };
  return {
    load: () =>
      withDb(async (db) => {
        const transaction = db.transaction([RECORDS, QUARANTINE, META, LEGACY_STORE], 'readonly');
        const [rows, quarantine, meta, legacy] = await Promise.all([
          request(transaction.objectStore(RECORDS).getAll() as IDBRequest<Row[]>),
          request(transaction.objectStore(QUARANTINE).getAll() as IDBRequest<QuarantinedRecord[]>),
          request(transaction.objectStore(META).get(META_KEY) as IDBRequest<Meta | undefined>),
          request(transaction.objectStore(LEGACY_STORE).get(LEGACY_KEY)),
        ]);
        return { rows, quarantine, meta: meta ?? null, legacy: legacy ?? readLegacyFallback() };
      }),
    commit: (change) =>
      withDb((db) => {
        const transaction = db.transaction([RECORDS, QUARANTINE, META], 'readwrite');
        for (const row of change.put) transaction.objectStore(RECORDS).put(row, row.record.id);
        for (const item of change.quarantine ?? []) transaction.objectStore(QUARANTINE).put(item, item.id);
        transaction.objectStore(META).put(change.meta, META_KEY);
        return done(transaction);
      }),
    removeLegacy: async () => {
      await withDb((db) => {
        const transaction = db.transaction(LEGACY_STORE, 'readwrite');
        transaction.objectStore(LEGACY_STORE).delete(LEGACY_KEY);
        return done(transaction);
      });
      removeFallback(LEGACY_FALLBACK_KEY);
    },
    clearQuarantine: () =>
      withDb((db) => {
        const transaction = db.transaction(QUARANTINE, 'readwrite');
        transaction.objectStore(QUARANTINE).clear();
        return done(transaction);
      }),
    clearAll: async () => {
      await withDb((db) => {
        const stores = [RECORDS, QUARANTINE, META, LEGACY_STORE];
        const transaction = db.transaction(stores, 'readwrite');
        for (const name of stores) transaction.objectStore(name).clear();
        return done(transaction);
      });
      removeFallback(LEGACY_FALLBACK_KEY);
      removeFallback(RECORDS_FALLBACK_KEY);
    },
  };
}

export class RecordStore {
  private rows = new Map<string, Row>();
  /** Datensätze aus einem neueren App-Stand: werden angezeigt, aber nie geschrieben. */
  private readOnly = new Set<string>();
  private meta: Meta | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private pendingState: AppState | undefined;
  private pendingSave: Promise<void> | undefined;

  constructor(
    private readonly backend: RecordBackend,
    private readonly now: () => number = () => Date.now(),
    private readonly newNode: () => string = newId,
  ) {}

  private freshMeta(): Meta {
    const node = this.newNode();
    return { node, clock: createClock(node), migratedV1: false };
  }

  private stamp(): string {
    const next = tick(this.meta!.clock, this.now());
    this.meta = { ...this.meta!, clock: next.clock };
    return next.stamp;
  }

  async load(): Promise<LoadResult> {
    const snapshot = await this.backend.load();
    this.meta = snapshot.meta ?? this.freshMeta();
    let rows = snapshot.rows;
    let quarantine = snapshot.quarantine;
    const legacy = snapshot.legacy === undefined ? null : snapshot.legacy;
    if (!this.meta.migratedV1) {
      const split = legacy === null ? null : splitLegacyState(legacy);
      const stamp = this.stamp();
      const put = (split?.inputs ?? []).map((input, position) => ({
        record: updateRecord(undefined, input.kind, input.id, input.fields, stamp)!,
        position,
      }));
      const meta = { ...this.meta, migratedV1: true };
      await this.backend.commit({ put, quarantine: split?.quarantine ?? [], meta });
      this.meta = meta;
      const replaced = new Set(put.map((row) => row.record.id));
      rows = [...rows.filter((row) => !replaced.has(row.record.id)), ...put];
      quarantine = uniqueById([...quarantine, ...(split?.quarantine ?? [])]);
    } else if (legacy !== null) {
      const split = splitLegacyState(legacy);
      const kept = new Set([...rows.map((row) => row.record.id), ...quarantine.map((item) => item.id)]);
      const complete = !split || [...split.inputs, ...split.quarantine].every((item) => kept.has(item.id));
      if (complete) await this.backend.removeLegacy();
    }

    this.rows = new Map();
    this.readOnly = new Set();
    for (const row of rows) {
      const upgraded = upgradeRecord(row.record);
      if (!upgraded.writable) this.readOnly.add(row.record.id);
      this.rows.set(row.record.id, { ...row, record: upgraded.record });
    }
    const alive = [...this.rows.values()].filter((row) => !row.record.deleted).sort((a, b) => a.position - b.position);
    return { state: alive.length ? inputsToState(alive.map((row) => row.record)) : null, quarantine };
  }

  /**
   * Speichert nur Datensätze, die sich geändert haben. Entfernte Einträge bekommen einen Löschvermerk.
   * Kommen mehrere Stände schnell hintereinander, wird nur der jeweils letzte geschrieben.
   */
  save(state: AppState): Promise<void> {
    const waiting = this.pendingState !== undefined;
    this.pendingState = state;
    if (waiting) return this.pendingSave!;
    this.pendingSave = this.enqueue(async () => {
      const latest = this.pendingState!;
      this.pendingState = undefined;
      await this.write(latest);
    });
    return this.pendingSave;
  }

  private async write(state: AppState): Promise<void> {
    if (!this.meta) this.meta = this.freshMeta();
    const before = this.meta;
    const stamp = this.stamp();
    const put: Row[] = [];
    const seen = new Set<string>();
    stateToInputs(state).forEach((input, position) => {
      seen.add(input.id);
      if (this.readOnly.has(input.id)) return;
      const previous = this.rows.get(input.id);
      const updated = updateRecord(previous?.record, input.kind, input.id, input.fields, stamp);
      if (updated || previous?.position !== position) put.push({ record: updated ?? previous!.record, position });
    });
    for (const [id, row] of this.rows) {
      if (!seen.has(id) && !row.record.deleted && !this.readOnly.has(id)) put.push({ ...row, record: deleteRecord(row.record, stamp) });
    }
    if (!put.length) {
      this.meta = before;
      return;
    }
    try {
      await this.backend.commit({ put, meta: this.meta });
    } catch (error) {
      this.meta = before;
      throw error;
    }
    for (const row of put) this.rows.set(row.record.id, row);
  }

  addQuarantine(items: QuarantinedRecord[]): Promise<void> {
    return this.enqueue(async () => {
      if (!items.length) return;
      if (!this.meta) this.meta = this.freshMeta();
      await this.backend.commit({ put: [], quarantine: items, meta: this.meta });
    });
  }

  discardQuarantine(): Promise<void> {
    return this.enqueue(() => this.backend.clearQuarantine());
  }

  /** „Auf diesem Gerät löschen“: alles entfernen, ohne Löschvermerke. */
  clearDevice(): Promise<void> {
    return this.enqueue(async () => {
      await this.backend.clearAll();
      this.rows = new Map();
      this.readOnly = new Set();
      this.meta = { ...this.freshMeta(), migratedV1: true };
    });
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(work, work);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
