// Jugendarbeitsschutz-Prüfung. Reine Funktion: Profil + Jobs + Schichten + Zeitraum → Meldungen.
// Wochen-, Ruhezeit- und Wochenendregeln betreffen mehrere Schichten. Deshalb wird immer der ganze
// Kontext (volle Wochen und Monate um den Zeitraum) betrachtet; gemeldet werden nur Verstöße, die
// mindestens eine Schicht im Zeitraum betreffen.
import type { Job, Profile, Shift } from '../../types';
import { jobTagFindings, tagsForJob } from '../jobTags';
import {
  BREAK_RULES,
  CHILD_AGE_LIMIT,
  CHILD_MAX_HOURS_PER_DAY,
  CHILD_MAX_HOURS_PER_DAY_AGRICULTURE,
  CHILD_WORK_WINDOW,
  HOLIDAY_JOB_MAX_DAYS,
  MAX_WORKDAYS_PER_WEEK,
  MIN_EMPLOYMENT_AGE,
  MIN_FREE_SATURDAYS_PER_MONTH,
  MIN_FREE_SUNDAYS_PER_MONTH,
  MIN_REST_BETWEEN_DAYS_HOURS,
  NIGHT_EXCEPTIONS,
  SATURDAY_EXCEPTION_TAGS,
  SUNDAY_EXCEPTION_TAGS,
  YOUTH_EXTENDED_HOURS_PER_DAY,
  YOUTH_MAX_HOURS_PER_DAY,
  YOUTH_MAX_HOURS_PER_WEEK,
  YOUTH_NIGHT_REST,
  type LegalConstant,
} from '../legalConstants';
import { youthRuleExplanations, type YouthRuleId } from './explanations';
import { ageOn, fullTimeSchoolObligated, isSchoolHoliday, schoolCollision, toMinutes, weekdayOf, youthGroup, type YouthGroup } from './profile';

export type RuleSeverity = 'error' | 'warning' | 'info';

export type RuleViolation = {
  ruleId: YouthRuleId;
  severity: RuleSeverity;
  /** Kurzer Satz in Du-Ansprache (Deutsch). */
  message: string;
  message_en: string;
  /** Rechtsgrundlage, z. B. „§ 14 Abs. 1 JArbSchG“. */
  lawRef: string;
  /** Link auf den Gesetzestext. */
  url: string;
  /** Betroffene Schichten (gleiche Kennung wie `shiftId`). */
  shiftIds: string[];
  /** Tag oder Wochenbeginn, auf den sich die Meldung bezieht. */
  date?: string;
};

export type YouthLaborInput = {
  profile: Profile;
  jobs: Job[];
  shifts: Shift[];
  /** Zeitraum, für den gemeldet wird (beide Tage einschließlich). */
  from: string;
  to: string;
};

/** Stabile Kennung einer Schicht, gleich wie im Wochenkalender. */
export function shiftId(shift: Shift): string {
  return shift.id ?? shift.jobId + shift.date;
}

// ── Datum ────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
function dayNumber(date: string): number {
  return Math.round(Date.parse(date + 'T00:00:00Z') / DAY_MS);
}
function fromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}
export function addDaysIso(date: string, days: number): string {
  return fromDayNumber(dayNumber(date) + days);
}
export function mondayOfIso(date: string): string {
  return addDaysIso(date, 1 - weekdayOf(date));
}
function lastDayOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Prüfzeitraum für eine Schicht: der ganze Monat plus die angeschnittenen Wochen. */
export function youthCheckRange(date: string): { from: string; to: string } {
  const month = date.slice(0, 7);
  const first = month + '-01';
  const last = lastDayOfMonth(month);
  return { from: mondayOfIso(first), to: addDaysIso(mondayOfIso(last), 6) };
}

// ── Schichten aufbereiten ────────────────────────────────────────────────────

type WorkDay = {
  id: string;
  shift: Shift;
  job?: Job;
  date: string;
  hours: number;
  /** Absolute Minuten (Tag × 1440 + Uhrzeit), nur mit Start und Ende. */
  start?: number;
  end?: number;
};

function expand(shifts: Shift[], jobs: Job[]): WorkDay[] {
  const result: WorkDay[] = [];
  for (const shift of shifts) {
    const job = jobs.find((entry) => entry.id === shift.jobId);
    const id = shiftId(shift);
    const days = Math.max(1, Math.floor(shift.days ?? 1));
    // Mehrtägige Blöcke (z. B. 15 Tage Festival) werden gleichmäßig auf die Tage verteilt.
    if (days > 1) {
      for (let index = 0; index < days; index += 1) {
        result.push({ id, shift, job, date: addDaysIso(shift.date, index), hours: Math.max(0, shift.hours) / days });
      }
      continue;
    }
    const entry: WorkDay = { id, shift, job, date: shift.date, hours: Math.max(0, shift.hours) };
    if (shift.startTime && shift.endTime) {
      const base = dayNumber(shift.date) * 1440;
      const start = base + toMinutes(shift.startTime);
      let end = base + toMinutes(shift.endTime);
      if (end <= start) end += 1440;
      entry.start = start;
      entry.end = end;
    }
    result.push(entry);
  }
  return result;
}

const fmt = (hours: number) => (Math.round(hours * 100) / 100).toString().replace('.', ',');
const fmtEn = (hours: number) => (Math.round(hours * 100) / 100).toString();
const clock = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};

// ── Hauptfunktion ────────────────────────────────────────────────────────────

export function checkYouthLabor({ profile, jobs, shifts, from, to }: YouthLaborInput): RuleViolation[] {
  const context = { from: mondayOfIso(from.slice(0, 7) + '-01'), to: addDaysIso(mondayOfIso(lastDayOfMonth(to.slice(0, 7))), 6) };
  const days = expand(shifts, jobs)
    .filter((day) => day.date >= context.from && day.date <= context.to && day.hours > 0)
    .filter((day) => youthGroup(profile, day.date) !== 'none');
  if (!days.length) return [];

  const violations: RuleViolation[] = [];
  const inRange = (date: string) => date >= from && date <= to;
  const add = (
    ruleId: YouthRuleId,
    severity: RuleSeverity,
    rule: Pick<LegalConstant<unknown>, 'lawRef' | 'url'>,
    affected: WorkDay[],
    message: string,
    message_en: string,
    date?: string,
  ) => {
    if (!affected.some((day) => inRange(day.date))) return;
    violations.push({ ruleId, severity, message, message_en, lawRef: rule.lawRef, url: rule.url, shiftIds: [...new Set(affected.map((day) => day.id))], date });
  };

  const byDate = new Map<string, WorkDay[]>();
  for (const day of days) byDate.set(day.date, [...(byDate.get(day.date) ?? []), day]);
  const groupOf = (date: string): YouthGroup => youthGroup(profile, date);

  // Unter 13
  const tooYoung = days.filter((day) => groupOf(day.date) === 'forbidden');
  if (tooYoung.length) {
    add('underMinimumAge', 'error', MIN_EMPLOYMENT_AGE, tooYoung,
      'Unter 13 darfst du grundsätzlich noch nicht arbeiten.', 'Under 13 you are generally not allowed to work yet.');
  }
  const allowed = days.filter((day) => groupOf(day.date) !== 'forbidden');

  // Hinweise zu fehlenden Angaben
  const schooling = fullTimeSchoolObligated(profile);
  if (schooling.assumed) {
    add('schoolObligationAssumed', 'info', { lawRef: '§ 2 Abs. 3 JArbSchG', url: 'https://www.gesetze-im-internet.de/jarbschg/__2.html' }, allowed,
      'Trag in deinem Profil ein, ob du noch vollzeitschulpflichtig bist. Bis dahin rechnet Headroom mit „ja“.',
      'Add in your profile whether you still have to attend school full time. Until then Headroom assumes “yes”.');
  }
  if (schooling.value && !(profile.schoolHolidays ?? []).length && allowed.some((day) => ageOn(profile, day.date) >= 15)) {
    add('holidaysMissing', 'info', { lawRef: '§ 5 Abs. 4 JArbSchG', url: 'https://www.gesetze-im-internet.de/jarbschg/__5.html' }, allowed,
      'Trag deine Schulferien ein. In den Ferien gelten andere Regeln.', 'Add your school holidays. Different rules apply then.');
  }
  const withoutTimes = allowed.filter((day) => day.start === undefined && (day.shift.days ?? 1) <= 1);
  if (withoutTimes.length) {
    add('timesMissing', 'info', YOUTH_NIGHT_REST, withoutTimes,
      'Bei einigen Schichten fehlen Start und Ende. Trag sie ein, damit Headroom alle Regeln prüfen kann.',
      'Some shifts have no start and end time. Add them so Headroom can check every rule.');
  }

  // Leichte Arbeit und Einwilligung (Kinderregeln)
  const childDays = allowed.filter((day) => groupOf(day.date) === 'child');
  for (const job of jobs) {
    const jobDays = childDays.filter((day) => day.job?.id === job.id);
    if (!jobDays.length) continue;
    const consent = profile.parentalConsent?.[job.id];
    if (!consent?.signedOn && !(consent?.job && consent.hours && consent.wage && consent.commute)) {
      add('parentalConsentMissing', 'warning', { lawRef: '§ 5 Abs. 3 JArbSchG', url: CHILD_MAX_HOURS_PER_DAY.url }, jobDays,
        'Für „' + job.title + '“ brauchst du die Einwilligung deiner Eltern.',
        'You need your parents’ consent for “' + job.title + '”.');
    }
    if (!tagsForJob(job).includes('lightWork')) {
      add('lightWorkOnly', 'info', { lawRef: '§ 5 Abs. 3 JArbSchG, § 2 KindArbSchV', url: 'https://www.gesetze-im-internet.de/kindarbschv/__2.html' }, jobDays,
        'Erlaubt ist nur leichte Arbeit. Prüf, ob „' + job.title + '“ dazu passt.',
        'Only light work is allowed. Check whether “' + job.title + '” qualifies.');
    }
  }

  // Tagesregeln
  for (const [date, entries] of byDate) {
    const group = groupOf(date);
    if (group === 'forbidden' || group === 'none') continue;
    const total = entries.reduce((sum, day) => sum + day.hours, 0);
    const age = ageOn(profile, date);
    // Ab 15 gelten die Kinderregeln nur wegen der Vollzeitschulpflicht. Das sagt die Meldung dazu.
    const why = age >= CHILD_AGE_LIMIT.value
      ? { de: 'Weil du noch vollzeitschulpflichtig bist, gelten außerhalb der Ferien die Kinderregeln. ', en: 'Because you still have to attend school full time, the child rules apply outside the holidays. ' }
      : { de: '', en: '' };
    if (group === 'child') {
      const agriculture = entries.every((day) => tagsForJob(day.job).includes('agriculture'));
      const cap = agriculture ? CHILD_MAX_HOURS_PER_DAY_AGRICULTURE : CHILD_MAX_HOURS_PER_DAY;
      if (total > cap.value) {
        add('childDailyHours', 'error', cap, entries,
          why.de + 'Am ' + dayLabel(date) + ' sind es ' + fmt(total) + ' Stunden. Erlaubt sind höchstens ' + cap.value + '.',
          why.en + 'On ' + date + ' it’s ' + fmtEn(total) + ' hours. At most ' + cap.value + ' are allowed.', date);
      }
      const windowStart = toMinutes(CHILD_WORK_WINDOW.value.from);
      const windowEnd = toMinutes(CHILD_WORK_WINDOW.value.to);
      for (const day of entries) {
        if (day.start === undefined || day.end === undefined) continue;
        const base = dayNumber(date) * 1440;
        if (day.start < base + windowStart || day.end > base + windowEnd) {
          add('childTimeWindow', 'error', CHILD_WORK_WINDOW, [day],
            why.de + 'Deine Schicht am ' + dayLabel(date) + ' liegt außerhalb von 8 bis 18 Uhr.',
            why.en + 'Your shift on ' + date + ' is outside 8 am to 6 pm.', date);
        }
      }
    } else {
      const week = weekHours(byDate, mondayOfIso(date));
      if (total > YOUTH_EXTENDED_HOURS_PER_DAY.value || (total > YOUTH_MAX_HOURS_PER_DAY.value && week > YOUTH_MAX_HOURS_PER_WEEK.value)) {
        const rule = total > YOUTH_EXTENDED_HOURS_PER_DAY.value ? YOUTH_EXTENDED_HOURS_PER_DAY : YOUTH_MAX_HOURS_PER_DAY;
        add('dailyHours', 'error', rule, entries,
          'Am ' + dayLabel(date) + ' sind es ' + fmt(total) + ' Stunden. Erlaubt sind 8, an einzelnen Tagen 8,5, wenn die Woche dafür kürzer ist.',
          'On ' + date + ' it’s ' + fmtEn(total) + ' hours. 8 are allowed, 8.5 on single days if the week is shorter.', date);
      }
      for (const day of entries) checkNight(day, age, add);
      for (const day of entries) checkBreaks(day, add);
    }
    // Schule (Stundenplan)
    for (const day of entries) {
      const collision = schoolCollision(profile, day.shift);
      if (collision === 'during') {
        add('duringSchool', group === 'child' ? 'error' : 'warning', { lawRef: '§ 5 Abs. 3 JArbSchG', url: CHILD_MAX_HOURS_PER_DAY.url }, [day],
          'Deine Schicht am ' + dayLabel(date) + ' fällt in deine Unterrichtszeit.',
          'Your shift on ' + date + ' overlaps your school hours.', date);
      } else if (collision === 'before' && group === 'child') {
        add('beforeSchool', 'error', { lawRef: '§ 5 Abs. 3 JArbSchG', url: CHILD_MAX_HOURS_PER_DAY.url }, [day],
          why.de + 'Am ' + dayLabel(date) + ' arbeitest du vor dem Unterricht. Das ist nicht erlaubt.',
          why.en + 'On ' + date + ' you work before school. That isn’t allowed.', date);
      }
    }
    // Wochenende (§§ 16, 17 gelten über § 5 Abs. 3 auch für Kinder)
    const weekday = weekdayOf(date);
    if (weekday === 6 || weekday === 7) {
      const saturday = weekday === 6;
      const allowedTags: readonly string[] = saturday ? SATURDAY_EXCEPTION_TAGS.value : SUNDAY_EXCEPTION_TAGS.value;
      const rule = saturday ? SATURDAY_EXCEPTION_TAGS : SUNDAY_EXCEPTION_TAGS;
      for (const day of entries) {
        const exception = tagsForJob(day.job).some((tag) => allowedTags.includes(tag));
        if (exception) {
          add(saturday ? 'saturdayException' : 'sundayException', 'warning', rule, [day],
            (saturday ? 'Samstags' : 'Sonntags') + ' ist in deiner Branche erlaubt. Du musst dafür an einem anderen Tag dieser Woche frei haben.',
            'Working on ' + (saturday ? 'Saturdays' : 'Sundays') + ' is allowed in your industry. You need another day off this week.', date);
        } else {
          add(saturday ? 'saturdayWork' : 'sundayWork', 'error', rule, [day],
            (saturday ? 'Samstags' : 'Sonntags') + ' darfst du in diesem Job nicht arbeiten.',
            'You may not work on ' + (saturday ? 'Saturdays' : 'Sundays') + ' in this job.', date);
        }
      }
    }
  }

  // Wochenregeln
  const weeks = new Map<string, WorkDay[]>();
  for (const day of allowed) weeks.set(mondayOfIso(day.date), [...(weeks.get(mondayOfIso(day.date)) ?? []), day]);
  for (const [monday, entries] of weeks) {
    const workdays = new Set(entries.map((day) => day.date)).size;
    if (workdays > MAX_WORKDAYS_PER_WEEK.value) {
      add('workdaysPerWeek', 'error', MAX_WORKDAYS_PER_WEEK, entries,
        'In der Woche ab ' + dayLabel(monday) + ' arbeitest du an ' + workdays + ' Tagen. Erlaubt sind höchstens 5.',
        'In the week of ' + monday + ' you work on ' + workdays + ' days. At most 5 are allowed.', monday);
    }
    const youthEntries = entries.filter((day) => groupOf(day.date) === 'youth' || groupOf(day.date) === 'holidayYouth');
    const hours = youthEntries.reduce((sum, day) => sum + day.hours, 0);
    if (hours > YOUTH_MAX_HOURS_PER_WEEK.value) {
      add('weeklyHours', 'error', YOUTH_MAX_HOURS_PER_WEEK, youthEntries,
        'In der Woche ab ' + dayLabel(monday) + ' sind es ' + fmt(hours) + ' Stunden. Erlaubt sind höchstens 40.',
        'In the week of ' + monday + ' it’s ' + fmtEn(hours) + ' hours. At most 40 are allowed.', monday);
    }
  }

  // 12 Stunden frei zwischen zwei Arbeitstagen
  const timed = allowed.filter((day) => day.start !== undefined).sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  for (let index = 1; index < timed.length; index += 1) {
    const previous = timed[index - 1];
    const next = timed[index];
    if (previous.date === next.date) continue;
    const gap = ((next.start ?? 0) - (previous.end ?? 0)) / 60;
    if (gap < MIN_REST_BETWEEN_DAYS_HOURS.value) {
      add('restBetweenDays', 'error', MIN_REST_BETWEEN_DAYS_HOURS, [previous, next],
        'Zwischen ' + dayLabel(previous.date) + ' und ' + dayLabel(next.date) + ' hast du nur ' + fmt(Math.max(0, gap)) + ' Stunden frei. Nötig sind 12.',
        'Between ' + previous.date + ' and ' + next.date + ' you only have ' + fmtEn(Math.max(0, gap)) + ' hours off. 12 are required.', next.date);
    }
  }

  // Freie Samstage und Sonntage im Monat
  const months = new Set(allowed.map((day) => day.date.slice(0, 7)));
  for (const month of months) {
    const monthDays = allowed.filter((day) => day.date.startsWith(month));
    for (const weekday of [6, 7] as const) {
      const dates = datesInMonth(month).filter((date) => weekdayOf(date) === weekday);
      const worked = dates.filter((date) => monthDays.some((day) => day.date === date));
      const free = dates.length - worked.length;
      const rule = weekday === 6 ? MIN_FREE_SATURDAYS_PER_MONTH : MIN_FREE_SUNDAYS_PER_MONTH;
      if (worked.length && free < rule.value) {
        const affected = monthDays.filter((day) => worked.includes(day.date));
        add(weekday === 6 ? 'freeSaturdays' : 'freeSundays', weekday === 6 ? 'warning' : 'error', rule, affected,
          weekday === 6
            ? 'Im ' + monthLabel(month) + ' bleiben nur ' + free + ' Samstage frei. Mindestens 2 sollen frei bleiben.'
            : 'Im ' + monthLabel(month) + ' bleiben nur ' + free + ' Sonntage frei. Mindestens 2 müssen frei bleiben.',
          weekday === 6
            ? 'Only ' + free + ' Saturdays stay free in ' + month + '. At least 2 should.'
            : 'Only ' + free + ' Sundays stay free in ' + month + '. At least 2 must.', month + '-01');
      }
    }
  }

  // Ferienjob-Grenze
  for (const year of new Set(allowed.map((day) => Number(day.date.slice(0, 4))))) {
    const usage = holidayJobDays(profile, shifts, jobs, year);
    if (usage.applies && usage.used > usage.limit) {
      const holidayDays = allowed.filter((day) => day.date.startsWith(String(year)) && groupOf(day.date) === 'holidayYouth');
      add('holidayJobLimit', 'error', HOLIDAY_JOB_MAX_DAYS, holidayDays,
        'Du hast ' + usage.used + ' Ferien-Arbeitstage in ' + year + '. Erlaubt sind höchstens 4 Wochen (20 Tage).',
        'You have ' + usage.used + ' holiday workdays in ' + year + '. At most 4 weeks (20 days) are allowed.');
    }
  }

  // Job-Merkmale (Akkord, gefährlich, Bar, Alkohol)
  for (const job of jobs) {
    const jobDays = allowed.filter((day) => day.job?.id === job.id);
    if (!jobDays.length) continue;
    for (const rule of jobTagFindings(job, Math.min(...jobDays.map((day) => ageOn(profile, day.date))))) {
      add(rule.ruleId, rule.severity, rule, jobDays, rule.message, rule.message_en);
    }
  }

  const order: Record<RuleSeverity, number> = { error: 0, warning: 1, info: 2 };
  return violations.sort((a, b) => order[a.severity] - order[b.severity] || (a.date ?? '').localeCompare(b.date ?? ''));

  function checkNight(day: WorkDay, age: number, report: typeof add) {
    if (day.start === undefined || day.end === undefined) return;
    const base = dayNumber(day.date) * 1440;
    const baseStart = toMinutes(YOUTH_NIGHT_REST.value.to);
    const baseEnd = toMinutes(YOUTH_NIGHT_REST.value.from);
    const tags = tagsForJob(day.job);
    const windows: { start: number; end: number; exception: boolean }[] = [{ start: baseStart, end: baseEnd, exception: false }];
    for (const exception of NIGHT_EXCEPTIONS.value) {
      if (age < exception.minAge || !tags.includes(exception.tag)) continue;
      const start = exception.earliestStart ? toMinutes(exception.earliestStart) : baseStart;
      const end = exception.latestEnd ? toMinutes(exception.latestEnd) : baseEnd;
      if (exception.eitherOr) {
        windows.push({ start, end: baseEnd, exception: true }, { start: baseStart, end, exception: true });
      } else {
        windows.push({ start, end, exception: true });
      }
    }
    const fits = windows.filter((window) => day.start! >= base + window.start && day.end! <= base + window.end);
    if (!fits.length) {
      report('nightRest', 'error', YOUTH_NIGHT_REST, [day],
        'Deine Schicht am ' + dayLabel(day.date) + ' (' + clock(day.start) + '–' + clock(day.end) + ') fällt in die Nachtruhe.',
        'Your shift on ' + day.date + ' (' + clock(day.start) + '–' + clock(day.end) + ') falls into the night rest.', day.date);
    } else if (fits.every((window) => window.exception)) {
      report('nightException', 'info', NIGHT_EXCEPTIONS, [day],
        'Am ' + dayLabel(day.date) + ' gilt für dich eine Branchenausnahme von der Nachtruhe.',
        'On ' + day.date + ' an industry exception to the night rest applies to you.', day.date);
    }
  }

  function checkBreaks(day: WorkDay, report: typeof add) {
    const rules = BREAK_RULES.value;
    if (day.hours <= rules.shortThresholdHours) return;
    const required = day.hours > rules.longThresholdHours ? rules.longBreakMinutes : rules.shortBreakMinutes;
    const breaks = (day.shift.breaks ?? [])
      .filter((item) => item.start && item.end)
      .map((item) => {
        const base = dayNumber(day.date) * 1440;
        let start = base + toMinutes(item.start);
        let end = base + toMinutes(item.end);
        if (day.start !== undefined && start < day.start) { start += 1440; end += 1440; }
        if (end <= start) end += 1440;
        return { start, end };
      })
      .filter((item) => item.end - item.start >= rules.minBlockMinutes)
      .sort((a, b) => a.start - b.start);
    if (!breaks.length) {
      report('breaksMissing', 'warning', BREAK_RULES, [day],
        'Am ' + dayLabel(day.date) + ' arbeitest du ' + fmt(day.hours) + ' Stunden. Du brauchst mindestens ' + required + ' Minuten Pause – trag sie ein.',
        'On ' + day.date + ' you work ' + fmtEn(day.hours) + ' hours. You need at least ' + required + ' minutes of breaks – add them.', day.date);
      return;
    }
    const total = breaks.reduce((sum, item) => sum + item.end - item.start, 0);
    if (total < required) {
      report('breakTooShort', 'error', BREAK_RULES, [day],
        'Am ' + dayLabel(day.date) + ' sind es nur ' + total + ' Minuten Pause. Nötig sind ' + required + '.',
        'On ' + day.date + ' there are only ' + total + ' minutes of breaks. ' + required + ' are required.', day.date);
    }
    if (day.start !== undefined && day.end !== undefined) {
      let cursor = day.start;
      let longest = 0;
      for (const item of breaks) {
        longest = Math.max(longest, item.start - cursor);
        cursor = Math.max(cursor, item.end);
      }
      longest = Math.max(longest, day.end - cursor);
      if (longest > rules.maxContinuousHours * 60) {
        report('continuousWork', 'error', BREAK_RULES, [day],
          'Am ' + dayLabel(day.date) + ' arbeitest du ' + fmt(longest / 60) + ' Stunden am Stück. Höchstens 4,5 sind erlaubt.',
          'On ' + day.date + ' you work ' + fmtEn(longest / 60) + ' hours in a row. At most 4.5 are allowed.', day.date);
      }
    }
  }
}

function weekHours(byDate: Map<string, WorkDay[]>, monday: string): number {
  let total = 0;
  for (let index = 0; index < 7; index += 1) {
    total += (byDate.get(addDaysIso(monday, index)) ?? []).reduce((sum, day) => sum + day.hours, 0);
  }
  return total;
}

function datesInMonth(month: string): string[] {
  const last = Number(lastDayOfMonth(month).slice(8));
  return Array.from({ length: last }, (_, index) => month + '-' + String(index + 1).padStart(2, '0'));
}

function dayLabel(date: string): string {
  return date.slice(8, 10) + '.' + date.slice(5, 7) + '.';
}

const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
function monthLabel(month: string): string {
  return monthNames[Number(month.slice(5, 7)) - 1] ?? month;
}

/**
 * Ferienjob-Zähler (§ 5 Abs. 4): Arbeitstage in den Schulferien im Kalenderjahr.
 * Gilt nur für vollzeitschulpflichtige Jugendliche ab 15 (Gruppe „holidayYouth“).
 */
export function holidayJobDays(profile: Profile, shifts: Shift[], jobs: Job[], year: number) {
  const limit = HOLIDAY_JOB_MAX_DAYS.value;
  const dates = new Set(
    expand(shifts, jobs)
      .filter((day) => day.date.startsWith(String(year)) && day.hours > 0)
      .filter((day) => isSchoolHoliday(profile, day.date) && youthGroup(profile, day.date) === 'holidayYouth')
      .map((day) => day.date),
  );
  const applies = fullTimeSchoolObligated(profile).value
    && [year + '-01-01', year + '-12-31'].some((date) => ageOn(profile, date) >= 15 && ageOn(profile, date) < 18);
  return { applies, used: dates.size, limit, remaining: Math.max(0, limit - dates.size), ratio: dates.size / limit, lawRef: HOLIDAY_JOB_MAX_DAYS.lawRef, url: HOLIDAY_JOB_MAX_DAYS.url };
}

/** Erklärung zu einer Meldung in der gewünschten Sprache. */
export function explainViolation(violation: Pick<RuleViolation, 'ruleId'>, language: 'de' | 'en') {
  const entry = youthRuleExplanations[violation.ruleId];
  return language === 'de' ? { title: entry.title, text: entry.text } : { title: entry.title_en, text: entry.text_en };
}
