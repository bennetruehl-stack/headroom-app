// Texte für die Eltern-PDFs. Die Werte kommen aus Profil, Jobs und Schichten; die Regeln aus dem Core.
import { checkYouthLabor, earnings, usableLimitValue, type Job, type ParentalConsentChecklist, type Profile, type Shift } from '@headroom/core';
import type { Language } from '../i18n/translations';
import { makeTextPdf } from './pdf';
import type { AppState } from './storage';

const line = '______________________________';

function date(value: string | undefined, language: Language): string {
  if (!value) return line;
  const [y, m, d] = value.split('-');
  return language === 'de' ? d + '.' + m + '.' + y : value;
}

function euro(value: number, language: Language): string {
  return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-GB', { style: 'currency', currency: 'EUR' }).format(value);
}

/** Wochentage und Uhrzeiten der geplanten Schichten, z. B. „Di 15:00–17:00, Do 15:00–17:00“. */
function typicalTimes(shifts: Shift[], job: Job, language: Language): string {
  const names = language === 'de' ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const seen = new Set<string>();
  for (const shift of shifts) {
    if (shift.jobId !== job.id || !shift.startTime || !shift.endTime) continue;
    const day = new Date(shift.date + 'T12:00:00Z').getUTCDay();
    seen.add(names[day] + ' ' + shift.startTime + '–' + shift.endTime);
    if (seen.size >= 6) break;
  }
  return seen.size ? [...seen].join(', ') : line;
}

export function consentText(profile: Profile, job: Job, shifts: Shift[], checklist: ParentalConsentChecklist | undefined, language: Language): string {
  const box = (checked: boolean | undefined) => (checked ? '[x]' : '[ ]');
  if (language === 'en') {
    return [
      'Parental consent to employment',
      '',
      'Name of the young person: ' + line,
      'Date of birth: ' + date(profile.birthDate, language),
      '',
      'Job: ' + job.title,
      'Employer: ' + (job.company || line),
      'Place of work: ' + (job.city || line),
      'Start: ' + date(job.startDate, language) + '    End: ' + (job.endDate ? date(job.endDate, language) : 'open-ended'),
      'Hourly wage: ' + euro(job.wage, language),
      'Planned working hours: ' + typicalTimes(shifts, job, language),
      'Way to work: ' + line,
      '',
      'We have discussed and agree to:',
      box(checklist?.job) + ' the job and the tasks',
      box(checklist?.hours) + ' the working hours',
      box(checklist?.wage) + ' the wage',
      box(checklist?.commute) + ' the way to and from work',
      '',
      'We know that special rules on working hours, breaks and night work apply under 18',
      '(German Youth Employment Protection Act, JArbSchG).',
      '',
      '',
      'Place, date: ' + line,
      '',
      '',
      line + '        ' + line,
      'Signature parent / guardian          Signature parent / guardian',
      '',
      'Template from Headroom. A note, not legal advice.',
    ].join('\n');
  }
  return [
    'Einverständniserklärung der Erziehungsberechtigten',
    '',
    'Name der/des Jugendlichen: ' + line,
    'Geburtsdatum: ' + date(profile.birthDate, language),
    '',
    'Job: ' + job.title,
    'Arbeitgeber: ' + (job.company || line),
    'Arbeitsort: ' + (job.city || line),
    'Beginn: ' + date(job.startDate, language) + '    Ende: ' + (job.endDate ? date(job.endDate, language) : 'unbefristet'),
    'Stundenlohn: ' + euro(job.wage, language),
    'Geplante Arbeitszeiten: ' + typicalTimes(shifts, job, language),
    'Arbeitsweg: ' + line,
    '',
    'Wir haben besprochen und sind einverstanden mit:',
    box(checklist?.job) + ' dem Job und den Aufgaben',
    box(checklist?.hours) + ' den Arbeitszeiten',
    box(checklist?.wage) + ' dem Lohn',
    box(checklist?.commute) + ' dem Arbeitsweg',
    '',
    'Uns ist bekannt, dass unter 18 besondere Regeln für Arbeitszeit, Pausen und',
    'Nachtarbeit gelten (Jugendarbeitsschutzgesetz, JArbSchG).',
    '',
    '',
    'Ort, Datum: ' + line,
    '',
    '',
    line + '        ' + line,
    'Unterschrift Erziehungsberechtigte:r      Unterschrift Erziehungsberechtigte:r',
    '',
    'Vorlage aus Headroom. Hinweis, keine Rechtsberatung.',
  ].join('\n');
}

export function monthlyReport(data: AppState, month: string, language: Language) {
  const shifts = data.shifts.filter((shift) => shift.date.startsWith(month));
  const perJob = data.jobs.map((job) => {
    const jobShifts = shifts.filter((shift) => shift.jobId === job.id);
    return {
      job,
      hours: jobShifts.reduce((sum, shift) => sum + Math.max(0, shift.hours), 0),
      amount: jobShifts.reduce((sum, shift) => sum + earnings(shift, job), 0)
        + data.payments.filter((payment) => payment.jobId === job.id && payment.date.startsWith(month)).reduce((sum, payment) => sum + payment.amount, 0),
    };
  }).filter((row) => row.hours > 0 || row.amount > 0);
  const violations = checkYouthLabor({ profile: data.profile, jobs: data.jobs, shifts: data.shifts, from: month + '-01', to: month + '-31' })
    .filter((item) => item.severity !== 'info');
  return {
    perJob,
    hours: perJob.reduce((sum, row) => sum + row.hours, 0),
    amount: perJob.reduce((sum, row) => sum + row.amount, 0),
    violations,
    miniCap: usableLimitValue('miniJobMonthly', Number(month.slice(0, 4))),
  };
}

export function monthlyReportText(data: AppState, month: string, language: Language): string {
  const report = monthlyReport(data, month, language);
  const de = language === 'de';
  const monthName = new Intl.DateTimeFormat(de ? 'de-DE' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + '-15T12:00:00Z'));
  const hours = (value: number) => (Math.round(value * 100) / 100).toLocaleString(de ? 'de-DE' : 'en-GB');
  return [
    (de ? 'Monatsübersicht ' : 'Monthly overview ') + monthName,
    '',
    (de ? 'Stunden gesamt: ' : 'Total hours: ') + hours(report.hours),
    (de ? 'Verdienst gesamt: ' : 'Total earnings: ') + euro(report.amount, language),
    ...(report.miniCap !== null ? [(de ? 'Minijob-Grenze im Monat: ' : 'Monthly mini-job cap: ') + euro(report.miniCap, language)] : []),
    '',
    de ? 'Nach Job:' : 'By job:',
    ...(report.perJob.length
      ? report.perJob.map((row) => '- ' + row.job.title + ': ' + hours(row.hours) + (de ? ' Std., ' : ' h, ') + euro(row.amount, language))
      : [de ? '- keine Schichten' : '- no shifts']),
    '',
    de ? 'Hinweise zum Jugendarbeitsschutz:' : 'Youth employment protection:',
    ...(report.violations.length
      ? report.violations.map((item) => '- ' + (item.severity === 'error' ? (de ? 'Nicht erlaubt: ' : 'Not allowed: ') : (de ? 'Prüfen: ' : 'Check: ')) + (de ? item.message : item.message_en) + ' (' + item.lawRef + ')')
      : [de ? '- keine' : '- none']),
    '',
    de ? 'Erstellt mit Headroom. Hinweise, keine Rechtsberatung.' : 'Made with Headroom. Notes, not legal advice.',
  ].join('\n');
}

export function downloadPdf(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([makeTextPdf(text)], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
