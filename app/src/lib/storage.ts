import type { Job, OneTimePayment, Profile, ProfileStatus, Shift, ShiftCandidate } from '@headroom/core';
import { isValidIsoDate, latestKnownLimitValue, ONE_TIME_PAYMENT_KINDS, PROFILE_STATUSES } from '@headroom/core';
import type { Language } from '../i18n/translations';

export type AppState = {
  profile: Profile;
  jobs: Job[];
  shifts: Shift[];
  /** Einmalzahlungen wie Bonus, Urlaubs- oder Weihnachtsgeld. Ältere Stände haben das Feld nicht. */
  payments: OneTimePayment[];
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

export type ExampleProfile = 'standard' | 'lena' | 'mia';

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
    payments: [],
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
    payments: [],
  };
}

function addDaysTo(date: string, days: number): string {
  const day = new Date(date + 'T12:00:00Z');
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

/** Alle Tage eines Monats mit dem Wochentag (1 = Montag … 7 = Sonntag). */
function monthDays(year: number, month: number, weekday: number): string[] {
  const result: string[] = [];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let day = 1; day <= last; day += 1) {
    const date = year + '-' + pad(month) + '-' + pad(day);
    const value = new Date(date + 'T12:00:00Z').getUTCDay();
    if ((value === 0 ? 7 : value) === weekday) result.push(date);
  }
  return result;
}

/**
 * Mia, 16, Schülerin in der 11. Klasse (Oberstufe, NRW) – Beispiel für den Schüler-Modus.
 * Die Vollzeitschulpflicht ist erfüllt, deshalb gelten die Jugendregeln (bis 8 Stunden, 6–20 Uhr),
 * nicht die Kinderregeln. Minijob in der Bäckerei (11 €/h, unter dem Mindestlohn: unter 18 erlaubt;
 * samstags früh ab 5:30 dank Bäckerei-Ausnahme ab 16), Nachhilfe und ein Ferienjob in der Eisdiele.
 * Im laufenden Monat endet eine Freitagsschicht bewusst erst um 21 Uhr (Nachtruhe ab 20 Uhr),
 * damit der Jugendschutz-Check etwas zeigt. Die Ferien sind Beispielwerte, keine amtlichen Termine.
 */
export function createMiaState(): AppState {
  const date = today();
  const year = Number(date.slice(0, 4));
  const currentMonth = Number(date.slice(5, 7));
  // 16 Jahre und gut vier Monate alt, egal wann die Demo läuft.
  const birth = new Date(date + 'T12:00:00Z');
  birth.setUTCFullYear(birth.getUTCFullYear() - 16);
  birth.setUTCMonth(birth.getUTCMonth() - 4);
  const birthDate = birth.toISOString().slice(0, 10);
  const summerStart = year + '-07-13';
  const summerEnd = year + '-08-25';
  const shifts: Shift[] = [];
  const add = (jobId: string, day: string, start: string, end: string, extra: Partial<Shift> = {}) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const pause = extra.breaks?.reduce((sum, item) => {
      const [bh, bm] = item.start.split(':').map(Number);
      const [ch, cm] = item.end.split(':').map(Number);
      return sum + (ch * 60 + cm - bh * 60 - bm);
    }, 0) ?? 0;
    shifts.push({
      id: 'mia-' + jobId + '-' + day,
      jobId,
      date: day,
      hours: (eh * 60 + em - sh * 60 - sm - pause) / 60,
      startTime: start,
      endTime: end,
      planned: day > date,
      ...extra,
    });
  };
  // Vormonat und laufender Monat: Nachhilfe dienstags, Bäckerei an zwei Samstagen.
  for (const offset of [-1, 0]) {
    const monthIndex = currentMonth + offset;
    const y = monthIndex < 1 ? year - 1 : year;
    const m = monthIndex < 1 ? 12 : monthIndex;
    if (y === year && m >= 7 && m <= 8) continue;
    for (const day of monthDays(y, m, 2)) add('mia-tutoring', day, '16:00', '17:30');
    monthDays(y, m, 6).slice(0, 2).forEach((day) => add('mia-bakery', day, '05:30', '10:00'));
  }
  // Bewusst nicht erlaubt: Freitag im laufenden Monat bis 21 Uhr (Nachtruhe ab 20 Uhr, keine Ausnahme).
  const friday = monthDays(year, currentMonth, 5)[1];
  if (friday) add('mia-bakery', friday, '17:00', '21:00');
  // Ferienjob in der Eisdiele: zwei Wochen werktags, mit Pause.
  for (let day = summerStart, count = 0; count < 10; day = addDaysTo(day, 1)) {
    const weekday = new Date(day + 'T12:00:00Z').getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    add('mia-icecream', day, '11:00', '16:30', { breaks: [{ start: '13:30', end: '14:00' }], days: 1 });
    count += 1;
  }
  return {
    profile: {
      status: 'Pupil',
      age: 16,
      birthDate,
      familyInsured: true,
      bafoeg: false,
      hasMainJob: false,
      semesterPeriods: [],
      // 11. Klasse: Vollzeitschulpflicht (in NRW 10 Schuljahre) ist erfüllt.
      isFullTimeSchoolObligated: false,
      bundesland: 'NW',
      schoolSchedule: [
        { weekday: 1, start: '08:00', end: '15:15' },
        { weekday: 2, start: '08:00', end: '15:15' },
        { weekday: 3, start: '08:00', end: '13:15' },
        { weekday: 4, start: '08:00', end: '15:15' },
        { weekday: 5, start: '08:00', end: '13:15' },
      ],
      schoolHolidays: [
        { start: year + '-03-30', end: year + '-04-11', name: 'Osterferien' },
        { start: summerStart, end: summerEnd, name: 'Sommerferien' },
        { start: year + '-10-17', end: year + '-10-31', name: 'Herbstferien' },
        { start: year + '-12-23', end: (year + 1) + '-01-06', name: 'Weihnachtsferien' },
      ],
      parentalConsent: {
        'mia-tutoring': { job: true, hours: true, wage: true, commute: true, signedOn: (year - 1) + '-09-01' },
        'mia-bakery': { job: true, hours: false, wage: true, commute: true },
      },
      afterSchool: 'study',
      graduationDate: (year + 2) + '-06-30',
    },
    jobs: [
      {
        id: 'mia-bakery',
        title: 'Bäckerei Kornfeld',
        type: 'mini-job',
        wage: 11,
        startDate: (year - 1) + '-09-01',
        industry: '47',
        skillLevel: 1,
        company: 'Bäckerei Kornfeld',
        city: 'Münster',
        presetId: 'preset-33',
        tags: ['bakery', 'retail'],
      },
      {
        id: 'mia-tutoring',
        title: 'Nachhilfe Mathe',
        type: 'mini-job',
        wage: 12,
        startDate: (year - 1) + '-09-01',
        industry: '85',
        skillLevel: 2,
        city: 'Münster',
        presetId: 'preset-14',
        tags: ['lightWork'],
      },
      {
        id: 'mia-icecream',
        title: 'Eisdiele Venezia',
        type: 'short-term',
        wage: 12.5,
        startDate: summerStart,
        endDate: summerEnd,
        industry: '56',
        skillLevel: 1,
        company: 'Eisdiele Venezia',
        city: 'Münster',
        tags: ['gastronomy'],
      },
    ],
    shifts,
    onboarded: true,
    language: 'de',
    darkMode: false,
    isPremium: false,
    dismissedRecommendations: [],
    peerOptIn: false,
    example: 'mia',
    calendars: [],
    pendingImports: [],
    payments: [],
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

const profileStatuses: readonly ProfileStatus[] = PROFILE_STATUSES;
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
    isValidIsoDate(job.startDate) && (!job.endDate || isValidIsoDate(job.endDate)))) return null;
  const jobIds = new Set(jobs.map((job) => job.id));
  const shifts = candidate.shifts as Shift[];
  if (!shifts.every((shift) => shift && jobIds.has(shift.jobId) && isValidIsoDate(shift.date) &&
    Number.isFinite(shift.hours) && shift.hours >= 0 && shift.hours <= 24 * 366)) return null;
  // Einmalzahlungen: ungültige Einträge werden verworfen statt den ganzen Stand abzulehnen.
  const payments = Array.isArray(candidate.payments)
    ? (candidate.payments as OneTimePayment[]).filter((payment) =>
      Boolean(payment) && typeof payment.id === 'string' && jobIds.has(payment.jobId) && isValidIsoDate(payment.date) &&
      Number.isFinite(payment.amount) && payment.amount > 0 && ONE_TIME_PAYMENT_KINDS.includes(payment.kind))
    : [];
  return {
    profile: { ...profile, semesterPeriods: Array.isArray(profile.semesterPeriods) ? profile.semesterPeriods : [] },
    jobs,
    shifts,
    payments,
    onboarded: Boolean(candidate.onboarded),
    language: candidate.language,
    darkMode: Boolean(candidate.darkMode),
    isPremium: Boolean(candidate.isPremium),
    dismissedRecommendations: Array.isArray(candidate.dismissedRecommendations)
      ? candidate.dismissedRecommendations.filter((level): level is number => Number.isInteger(level) && level >= 1 && level <= 4)
      : [],
    peerOptIn: Boolean(candidate.peerOptIn),
    peerToken: typeof candidate.peerToken === 'string' ? candidate.peerToken : undefined,
    example: candidate.example === 'standard' || candidate.example === 'lena' || candidate.example === 'mia' ? candidate.example : undefined,
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
