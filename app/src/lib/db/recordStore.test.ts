import { beforeEach, describe, expect, it } from 'vitest';
import { RECORD_SCHEMA_VERSION } from '@headroom/core';
import { createEmptyState, createLenaState, type AppState } from '../storage';
import { localStorageBackend, memoryBackend, RecordStore, type RecordBackend } from './recordStore';

const T = Date.UTC(2026, 10, 1, 12, 0, 0);

/** Ein gespeicherter Block aus Version 1 mit 2 Jobs, 30 Schichten, 1 Zahlung und 1 Kalender: 37 Datensätze mit Profil, Einstellungen und Gerätezustand. */
function legacyBlock(): AppState {
  const jobs = [
    { id: 'pub', title: 'Kneipe', type: 'mini-job' as const, wage: 13.9, startDate: '2026-01-01' },
    { id: 'cafe', title: 'Café', type: 'mini-job' as const, wage: 14, startDate: '2026-03-01', endDate: '2026-12-31' },
  ];
  const shifts = Array.from({ length: 30 }, (_, index) => ({
    id: 'shift-' + index,
    jobId: index % 2 ? 'pub' : 'cafe',
    date: '2026-10-' + String((index % 28) + 1).padStart(2, '0'),
    hours: 3 + (index % 3),
  }));
  return {
    ...createEmptyState(),
    profile: {
      status: 'Pupil', age: 17, birthDate: '2009-05-01', familyInsured: true, bafoeg: false, hasMainJob: false, semesterPeriods: [],
      handledTransitions: ['adult:2027'], parentalConsent: { pub: { job: true, hours: true, wage: true, commute: false } },
    },
    jobs,
    shifts,
    payments: [{ id: 'bonus', jobId: 'pub', date: '2026-10-31', amount: 50, kind: 'bonus' }],
    onboarded: true,
    language: 'en',
    darkMode: true,
    dismissedRecommendations: [2],
    peerToken: 'token',
    calendars: [{ id: 'cal', name: 'Arbeit', kind: 'url', url: 'https://example.org/geheim.ics' }],
    pendingImports: [{ date: '2026-11-03', hours: 4, source: 'calendar' }],
  };
}

function store(backend: RecordBackend, minutes = 0) {
  return new RecordStore(backend, () => T + minutes * 60_000, () => 'gerät-a');
}

describe('Übernahme aus Version 1', () => {
  it('legt je Job, Schicht und Zahlung einen Datensatz an, dazu Profil, Einstellungen und Gerätezustand', async () => {
    const backend = memoryBackend({ legacy: legacyBlock() });
    await store(backend).load();
    const kinds = backend.rows().map((row) => row.record.kind);
    expect(kinds.filter((kind) => kind === 'job')).toHaveLength(2);
    expect(kinds.filter((kind) => kind === 'shift')).toHaveLength(30);
    expect(kinds.filter((kind) => kind === 'payment')).toHaveLength(1);
    expect(kinds.filter((kind) => kind === 'profile' || kind === 'settings' || kind === 'deviceState')).toHaveLength(3);
    expect(backend.rows().every((row) => row.record.schemaVersion === RECORD_SCHEMA_VERSION)).toBe(true);
  });

  it('übernimmt jedes Feld ohne Verlust', async () => {
    const block = legacyBlock();
    const { state } = await store(memoryBackend({ legacy: block })).load();
    expect(state).toEqual(block);
  });

  it('behält den alten Block bis zum nächsten erfolgreichen Start', async () => {
    const backend = memoryBackend({ legacy: legacyBlock() });
    await store(backend).load();
    expect(backend.legacy()).not.toBeNull();
    await store(backend, 1).load();
    expect(backend.legacy()).toBeNull();
  });

  it('sortiert eine kaputte Schicht einzeln aus und bewahrt sie auf', async () => {
    const block = legacyBlock();
    block.shifts[4] = { ...block.shifts[4], date: 'kein Datum' };
    const backend = memoryBackend({ legacy: block });
    const { state, quarantine } = await store(backend).load();
    expect(state?.shifts).toHaveLength(29);
    expect(quarantine).toEqual([{ id: 'shift:shift-4', kind: 'shift', raw: block.shifts[4], reason: 'invalid' }]);
    // Der alte Block wird erst entfernt, wenn auch die aussortierte Schicht sicher aufbewahrt ist.
    await store(backend, 1).load();
    expect(backend.legacy()).toBeNull();
    expect(backend.quarantine()).toHaveLength(1);
  });

  it('sortiert eine Schicht ohne Job aus, die übrigen bleiben', async () => {
    const block = legacyBlock();
    block.shifts[0] = { ...block.shifts[0], jobId: 'gibt-es-nicht' };
    const { state, quarantine } = await store(memoryBackend({ legacy: block })).load();
    expect(state?.shifts).toHaveLength(29);
    expect(quarantine[0].reason).toBe('missingJob');
  });

  it('zeigt die Daten auch, wenn das Schreiben der Übernahme scheitert, und läuft beim nächsten Start erneut', async () => {
    const backend = memoryBackend({ legacy: legacyBlock(), failCommits: 1 });
    const first = await store(backend).load();
    expect(first.state?.shifts).toHaveLength(30);
    expect(backend.rows()).toHaveLength(0);
    expect(backend.legacy()).not.toBeNull();
    const { state } = await store(backend, 1).load();
    expect(backend.rows()).toHaveLength(37);
    expect(state?.shifts).toHaveLength(30);
    expect(backend.legacy()).not.toBeNull();
  });

  it('übernimmt Daten, die nur im Rückfallspeicher (localStorage) liegen', async () => {
    localStorage.clear();
    localStorage.setItem('headroom-data', JSON.stringify(legacyBlock()));
    const { state } = await store(localStorageBackend()).load();
    expect(state?.shifts).toHaveLength(30);
    expect(JSON.parse(localStorage.getItem('headroom-records')!).rows).toHaveLength(37);
  });

  it('startet leer, wenn es nichts zu übernehmen gibt', async () => {
    expect((await store(memoryBackend()).load()).state).toBeNull();
  });
});

describe('Speichern je Datensatz', () => {
  let backend: ReturnType<typeof memoryBackend>;
  let records: RecordStore;
  let state: AppState;

  beforeEach(async () => {
    backend = memoryBackend({ legacy: legacyBlock() });
    records = store(backend);
    state = (await records.load()).state!;
  });

  it('schreibt nur den geänderten Datensatz', async () => {
    const writes = backend.commits();
    await records.save({ ...state, shifts: state.shifts.map((shift) => shift.id === 'shift-3' ? { ...shift, hours: 8 } : shift) });
    expect(backend.commits()).toBe(writes + 1);
    expect(backend.lastCommit().map((row) => row.record.id)).toEqual(['shift:shift-3']);
  });

  it('schreibt nichts, wenn sich nichts geändert hat', async () => {
    const writes = backend.commits();
    await records.save({ ...state });
    expect(backend.commits()).toBe(writes);
  });

  it('legt beim Löschen eines Jobs Löschvermerke für den Job, seine Schichten und Zahlungen an', async () => {
    await records.save({
      ...state,
      jobs: state.jobs.filter((job) => job.id !== 'pub'),
      shifts: state.shifts.filter((shift) => shift.jobId !== 'pub'),
      payments: [],
    });
    const deleted = backend.lastCommit().filter((row) => row.record.deleted).map((row) => row.record.id);
    expect(deleted).toHaveLength(1 + 15 + 1);
    const reloaded = await store(backend, 5).load();
    expect(reloaded.state?.jobs.map((job) => job.id)).toEqual(['cafe']);
  });

  it('gibt einer Schicht ohne Kennung eine feste Kennung', async () => {
    const { id: _id, ...withoutId } = state.shifts[0];
    await records.save({ ...state, shifts: [...state.shifts, withoutId] });
    await records.save({ ...state, shifts: [...state.shifts, withoutId] });
    expect(backend.rows().filter((row) => row.record.kind === 'shift')).toHaveLength(31);
  });

  it('verändert einen Datensatz aus einem neueren App-Stand nicht', async () => {
    const row = backend.rows().find((item) => item.record.id === 'job:cafe')!;
    backend.replace({ ...row, record: { ...row.record, schemaVersion: RECORD_SCHEMA_VERSION + 1 } });
    const fresh = store(backend, 2);
    const loaded = (await fresh.load()).state!;
    await fresh.save({ ...loaded, jobs: loaded.jobs.map((job) => ({ ...job, title: 'geändert' })) });
    expect(backend.rows().find((item) => item.record.id === 'job:cafe')!.record.fields.title).toBe('Café');
    expect(backend.rows().find((item) => item.record.id === 'job:pub')!.record.fields.title).toBe('geändert');
  });
});

describe('Auf diesem Gerät löschen', () => {
  it('leert den Speicher ohne Löschvermerke und setzt das Beispielprofil zurück', async () => {
    const backend = memoryBackend();
    const records = store(backend);
    await records.load();
    await records.save(createLenaState());
    await records.clearDevice();
    await records.save(createEmptyState());
    expect(backend.rows().some((row) => row.record.deleted)).toBe(false);
    const { state } = await store(backend, 1).load();
    expect(state?.example).toBeUndefined();
    expect(state?.onboarded).toBe(false);
    expect(state?.jobs).toEqual([]);
  });

  it('verwirft aussortierte Datensätze nur auf Wunsch', async () => {
    const block = legacyBlock();
    block.shifts[0] = { ...block.shifts[0], hours: -1 };
    const backend = memoryBackend({ legacy: block });
    const records = store(backend);
    await records.load();
    expect(backend.quarantine()).toHaveLength(1);
    await records.discardQuarantine();
    expect(backend.quarantine()).toHaveLength(0);
    // Die verworfenen Einträge stecken auch im alten Block; der verschwindet mit.
    expect(backend.legacy()).toBeNull();
  });
});

describe('Ausfälle beim Speichern', () => {
  it('holt eine gescheiterte Übernahme mit dem nächsten Speichern nach', async () => {
    const backend = memoryBackend({ legacy: legacyBlock(), failCommits: 1 });
    const records = store(backend);
    const { state } = await records.load();
    await records.save({ ...state!, darkMode: false });
    expect(backend.rows()).toHaveLength(37);
    const reloaded = await store(backend, 5).load();
    expect(reloaded.state?.shifts).toHaveLength(30);
    expect(reloaded.state?.darkMode).toBe(false);
  });

  it('startet normal, auch wenn das Entfernen des alten Blocks scheitert', async () => {
    const backend = memoryBackend({ legacy: legacyBlock() });
    await store(backend).load();
    const failing: RecordBackend = { ...backend, removeLegacy: async () => { throw new Error('blockiert'); } };
    const { state } = await store(failing, 1).load();
    expect(state?.shifts).toHaveLength(30);
    expect(backend.legacy()).not.toBeNull();
  });

  it('entfernt nur die Quelle, die übernommen wurde, nicht später geschriebene Daten eines alten Tabs', async () => {
    const backend = memoryBackend({ legacy: legacyBlock() });
    await store(backend).load();
    const removed: string[] = [];
    const staleTab: RecordBackend = {
      ...backend,
      load: async () => ({ ...(await backend.load()), legacySource: 'localStorage' }),
      removeLegacy: async (source) => { removed.push(source); },
    };
    await store(staleTab, 1).load();
    expect(removed).toEqual([]);
    await store(backend, 2).load();
    expect(backend.legacy()).toBeNull();
  });

  it('schreibt bei schnell aufeinanderfolgenden Änderungen den letzten Stand', async () => {
    const backend = memoryBackend({ legacy: legacyBlock() });
    const records = store(backend);
    const { state } = await records.load();
    const writes = backend.commits();
    await Promise.all([1, 2, 3].map((hours) =>
      records.save({ ...state!, shifts: state!.shifts.map((shift) => shift.id === 'shift-0' ? { ...shift, hours } : shift) })));
    expect(backend.commits() - writes).toBeLessThanOrEqual(2);
    expect(backend.rows().find((row) => row.record.id === 'shift:shift-0')!.record.fields.hours).toBe(3);
  });
});
