import { describe, expect, it } from 'vitest';
import { consentText, monthlyReportText } from './parentDocs';
import { makeTextPdf } from './pdf';
import { createDemoState } from './storage';

const profile = { status: 'Pupil' as const, age: 15, birthDate: '2011-02-01', familyInsured: true, bafoeg: false };
const job = { id: 'b', title: 'Bäckerei', type: 'mini-job' as const, wage: 11.5, startDate: '2026-11-02', company: 'Brotzeit', city: 'Köln', tags: ['bakery' as const] };

describe('Eltern-PDFs', () => {
  it('füllt die Einverständniserklärung mit Profil- und Jobdaten vor', () => {
    const text = consentText(profile, job, [{ jobId: 'b', date: '2026-11-03', hours: 2, startTime: '15:00', endTime: '17:00' }], { job: true, hours: false, wage: true, commute: false }, 'de');
    expect(text).toContain('Geburtsdatum: 01.02.2011');
    expect(text).toContain('Arbeitgeber: Brotzeit');
    expect(text).toContain('Di 15:00–17:00');
    expect(text).toContain('[x] dem Job');
    expect(text).toContain('[ ] den Arbeitszeiten');
    expect(text).toContain('Unterschrift');
  });

  it('schreibt Umlaute und € als WinAnsi statt sie zu entfernen', () => {
    const pdf = makeTextPdf('Bäckerei für 11,50 € (§ 5)');
    expect(pdf).toContain('/Encoding /WinAnsiEncoding');
    expect(pdf).toContain('B\\344ckerei f\\374r 11,50 \\200 \\(\\247 5\\)');
    expect(/[^\x00-\x7f]/.test(pdf)).toBe(false);
  });

  it('enthält Stunden, Verdienst und Jugendschutz-Hinweise des Monats', () => {
    const state = { ...createDemoState(), profile, jobs: [job], payments: [], shifts: [{ id: 'x', jobId: 'b', date: '2026-11-03', hours: 3, startTime: '15:00', endTime: '18:00' }] };
    const text = monthlyReportText(state, '2026-11', 'de');
    expect(text).toContain('Monatsübersicht November 2026');
    expect(text).toContain('Bäckerei: 3 Std.');
    expect(text).toContain('Nicht erlaubt:');
    expect(text).toContain('§ 5 Abs. 3 JArbSchG');
  });
});
