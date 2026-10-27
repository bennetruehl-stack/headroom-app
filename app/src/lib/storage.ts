import type { Job, Profile, ProfileStatus, Shift, ShiftCandidate } from '@headroom/core';
import { latestKnownLimitValue } from '@headroom/core';
import type { Language } from '../i18n/translations';

export type AppState = {
  profile: Profile;
  jobs: Job[];
  shifts: Shift[];
  onboarded: boolean;
  language: Language;
  darkMode: boolean;
  isPremium: boolean;
  dismissedRecommendations: number[];
  peerOptIn: boolean;
  peerToken?: string;
  /** Gesetzt, wenn Beispieldaten geladen sind. Die App kennzeichnet das sichtbar. */
  example?: ExampleProfile;
  /** Verbundene Kalender (privater iCal-Link oder einmal importierte Datei). */
  calendars: CalendarSource[];
  /** Beim automatischen Abgleich gefundene Termine, die noch geprüft werden müssen. */
  pendingImports: ShiftCandidate[];
};

export type CalendarSource = {
  id: string;
  name: string;
  kind: 'url' | 'file';
  /** Privater iCal-Link. Wird nie exportiert. */
  url?: string;
  lastSync?: string;
  lastError?: string;
};

export type ExampleProfile = 'standard' | 'lena';

const DATABASE = 'headroom-local';
const STORE = 'app-state';
const KEY = 'main';
const FALLBACK_KEY = 'headroom-data';

function today(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

// Monatssummen der Demo-Minijobs für Januar bis November (beide Jobs zusammen).
// Leicht schwankend, immer unter der Monatsgrenze, damit Monat und Jahresprognose zusammenpassen.
const demoPastMonthTotals = [462, 498, 455, 510, 487, 530, 470, 495, 505, 480, 515];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Schichten von Januar bis zum Vormonat; Pub trägt 55 %, Restaurant 45 %. */
function demoPastShifts(year: string, currentMonth: number, minimumWage: number): Shift[] {
  const shifts: Shift[] = [];
  for (let month = 1; month < currentMonth; month += 1) {
    const total = demoPastMonthTotals[month - 1];
    const pub = Math.round(total * 0.55 * 100) / 100;
    const restaurant = total - pub;
    const prefix = year + '-' + pad(month) + '-';
    shifts.push(
      { id: 'demo-pub-' + month + '-a', jobId: 'demo-pub', date: prefix + '06', hours: pub / 2 / minimumWage },
      { id: 'demo-pub-' + month + '-b', jobId: 'demo-pub', date: prefix + '20', hours: pub / 2 / minimumWage },
      { id: 'demo-restaurant-' + month + '-a', jobId: 'demo-restaurant', date: prefix + '13', hours: restaurant / 2 / minimumWage },
      { id: 'demo-restaurant-' + month + '-b', jobId: 'demo-restaurant', date: prefix + '27', hours: restaurant / 2 / minimumWage },
    );
  }
  return shifts;
}

export function createDemoState(): AppState {
  const date = today();
  const year = date.slice(0, 4);
  const month = date.slice(5, 7);
  const minimumWage = (latestKnownLimitValue('minimumWage', Number(year)) ?? 0);
  return {
    profile: {
      status: 'Student',
      age: 20,
      familyInsured: true,
      bafoeg: false,
      hasMainJob: false,
      semesterPeriods: [],
    },
    jobs: [
      {
        id: 'demo-pub',
        title: 'Barkeeper:in',
        type: 'mini-job',
        wage: minimumWage,
        startDate: year + '-01-01',
        industry: '56',
        skillLevel: 1,
        company: 'Irish Pub',
        city: 'Frankfurt',
      },
      {
        id: 'demo-restaurant',
        title: 'Service / Kellner:in',
        type: 'mini-job',
        wage: minimumWage,
        startDate: year + '-01-01',
        industry: '56',
        skillLevel: 1,
        company: 'Restaurant',
        city: 'Frankfurt',
      },
      {
        id: 'demo-festival',
        title: 'Festival',
        type: 'short-term',
        wage: minimumWage,
        startDate: year + '-06-01',
        industry: '90–93',
        skillLevel: 1,
      },
    ],
    shifts: [
      ...demoPastShifts(year, Number(month), minimumWage),
      {
        id: 'demo-festival-shift',
        jobId: 'demo-festival',
        date: year + '-06-18',
        hours: 0,
        days: 15,
      },
      {
        id: 'demo-pub-shift',
        jobId: 'demo-pub',
        date: year + '-' + month + '-03',
        hours: 243.5 / minimumWage,
      },
      {
        id: 'demo-restaurant-shift',
        jobId: 'demo-restaurant',
        date: year + '-' + month + '-10',
        hours: 243.5 / minimumWage,
      },
    ],
    onboarded: false,
    language: 'de',
    darkMode: false,
    isPremium: false,
    dismissedRecommendations: [],
    peerOptIn: false,
    example: 'standard',
    calendars: [],
    pendingImports: [],
  };
}

/**
 * Lena, 20, Studentin: Kneipe ganzjährig 340 €/Monat, ab dem laufenden Monat
 * zusätzlich Café 280 €/Monat → 620 € und damit über 603 €. Dazu 15 Tage
 * Festival im Juli (kurzfristig). Spätere Monate des Jahres sind als geplant
 * eingetragen, damit die Jahresprognose der Geschichte entspricht.
 */
export function createLenaState(): AppState {
  const date = today();
  const year = date.slice(0, 4);
  const currentMonth = Number(date.slice(5, 7));
  const minimumWage = (latestKnownLimitValue('minimumWage', Number(year)) ?? 0);
  const pub = 340;
  const cafe = 280;
  const shifts: Shift[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const prefix = year + '-' + pad(month) + '-';
    const planned = month > currentMonth;
    shifts.push(
      { id: 'lena-pub-' + month + '-a', jobId: 'lena-pub', date: prefix + '04', hours: pub / 2 / minimumWage, planned },
      { id: 'lena-pub-' + month + '-b', jobId: 'lena-pub', date: prefix + '18', hours: pub / 2 / minimumWage, planned },
    );
    if (month >= currentMonth) {
      shifts.push(
        { id: 'lena-cafe-' + month + '-a', jobId: 'lena-cafe', date: prefix + '08', hours: cafe / 2 / minimumWage, planned },
        { id: 'lena-cafe-' + month + '-b', jobId: 'lena-cafe', date: prefix + '22', hours: cafe / 2 / minimumWage, planned },
      );
    }
  }
  shifts.push({ id: 'lena-festival', jobId: 'lena-festival', date: year + '-07-10', hours: 120, days: 15, planned: currentMonth < 7 });
  return {
    profile: {
      status: 'Student',
      age: 20,
      familyInsured: true,
      bafoeg: false,
      hasMainJob: false,
      semesterPeriods: [],
    },
    jobs: [
      {
        id: 'lena-pub',
        title: 'Kneipe',
        type: 'mini-job',
        wage: minimumWage,
        startDate: year + '-01-01',
        industry: '56',
        skillLevel: 1,
        company: 'Zum Anker',
        city: 'Köln',
      },
      {
        id: 'lena-cafe',
        title: 'Café',
        type: 'mini-job',
        wage: minimumWage,
        startDate: year + '-' + pad(currentMonth) + '-01',
        industry: '56',
        skillLevel: 1,
        company: 'Café Lindgrün',
        city: 'Köln',
      },
      {
        id: 'lena-festival',
        title: 'Festival',
        type: 'short-term',
        wage: minimumWage,
        startDate: year + '-07-01',
        endDate: year + '-07-31',
        industry: '90–93',
        skillLevel: 1,
      },
    ],
    shifts,
    onboarded: true,
    language: 'de',
    darkMode: false,
    isPremium: false,
    dismissedRecommendations: [],
    peerOptIn: false,
    example: 'lena',
    calendars: [],
    pendingImports: [],
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB'));
  });
}

function readFromIndexedDb(): Promise<AppState | null> {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
        request.onsuccess = () => {
          db.close();
          resolve((request.result as AppState | undefined) ?? null);
        };
        request.onerror = () => {
          db.close();
          reject(request.error ?? new Error('Could not read IndexedDB'));
        };
      }),
  );
}

function writeToIndexedDb(state: AppState): Promise<void> {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite');
        transaction.objectStore(STORE).put(state, KEY);
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error('Could not write IndexedDB'));
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
        };
      }),
  );
}

const profileStatuses: ProfileStatus[] = ['Student', 'Working student', 'Mini-jobber', 'Employee', 'Pupil'];
const employmentTypeValues: Job['type'][] = ['mini-job', 'short-term', 'working student', 'regular'];

export function normalizeState(value: unknown): AppState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<AppState>;
  const profile = candidate.profile as Profile | undefined;
  if (
    !profile ||
    !profileStatuses.includes(profile.status) ||
    !Number.isFinite(profile.age) || profile.age < 0 || profile.age > 120 ||
    typeof profile.familyInsured !== 'boolean' || typeof profile.bafoeg !== 'boolean' ||
    !Array.isArray(candidate.jobs) || !Array.isArray(candidate.shifts) ||
    (candidate.language !== 'de' && candidate.language !== 'en')
  ) return null;
  const jobs = candidate.jobs as Job[];
  if (!jobs.every((job) => job && typeof job.id === 'string' && typeof job.title === 'string' &&
    employmentTypeValues.includes(job.type) && Number.isFinite(job.wage) && job.wage >= 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(job.startDate))) return null;
  const jobIds = new Set(jobs.map((job) => job.id));
  const shifts = candidate.shifts as Shift[];
  if (!shifts.every((shift) => shift && jobIds.has(shift.jobId) && /^\d{4}-\d{2}-\d{2}$/.test(shift.date) &&
    Number.isFinite(shift.hours) && shift.hours >= 0)) return null;
  return {
    profile: { ...profile, semesterPeriods: Array.isArray(profile.semesterPeriods) ? profile.semesterPeriods : [] },
    jobs,
    shifts,
    onboarded: Boolean(candidate.onboarded),
    language: candidate.language,
    darkMode: Boolean(candidate.darkMode),
    isPremium: Boolean(candidate.isPremium),
    dismissedRecommendations: Array.isArray(candidate.dismissedRecommendations)
      ? candidate.dismissedRecommendations.filter((level): level is number => Number.isInteger(level) && level >= 1 && level <= 4)
      : [],
    peerOptIn: Boolean(candidate.peerOptIn),
    peerToken: typeof candidate.peerToken === 'string' ? candidate.peerToken : undefined,
    example: candidate.example === 'standard' || candidate.example === 'lena' ? candidate.example : undefined,
    calendars: Array.isArray(candidate.calendars)
      ? candidate.calendars.filter((item): item is CalendarSource =>
        Boolean(item) && typeof item.id === 'string' && typeof item.name === 'string' && (item.kind === 'url' || item.kind === 'file'))
      : [],
    pendingImports: Array.isArray(candidate.pendingImports)
      ? candidate.pendingImports.filter((item): item is ShiftCandidate =>
        Boolean(item) && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.hours) && (item.source === 'calendar' || item.source === 'photo'))
      : [],
  };
}

/** Für den JSON-Export: private Kalender-Links entfernen, sie sind wie ein Passwort. */
export function stateForExport(state: AppState): AppState {
  return { ...state, calendars: state.calendars.map(({ url: _url, ...calendar }) => calendar) };
}

export async function loadState(): Promise<AppState> {
  let state: AppState | null = null;
  try {
    state = normalizeState(await readFromIndexedDb());
  } catch {
    // Continue to the localStorage fallback and attempt migration.
  }
  if (state) return state;
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (raw) state = normalizeState(JSON.parse(raw));
  } catch {
    // Start from the demo state if local persistence is unavailable or invalid.
  }
  if (state) {
    await saveState(state);
    return state;
  }
  const fresh = createDemoState();
  await saveState(fresh);
  return fresh;
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await writeToIndexedDb(state);
  } catch {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
    } catch {
      // A browser may block both storage mechanisms; the app remains usable in memory.
    }
  }
}

export async function clearLocalState(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY);
      request.onsuccess = request.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Ignore unavailable IndexedDB and continue with the fallback store.
  }
  try {
    localStorage.removeItem(FALLBACK_KEY);
  } catch {
    // Ignore unavailable localStorage.
  }
}
