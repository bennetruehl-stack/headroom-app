import { describe, expect, it } from 'vitest';
import { annualMiniProjection, monthTotal } from '@headroom/core';
import { createBackup, createDemoState, stateForExport } from './storage';
import { parseBackup } from './db/migrateV1';

describe('demo state', () => {
  const state = createDemoState();
  const today = new Date();
  const year = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const monthKey = year + '-' + String(currentMonth).padStart(2, '0');

  it('keeps the pitch value of 487 EUR in the current month', () => {
    expect(monthTotal(state.shifts, state.jobs, monthKey, ['mini-job'])).toBeCloseTo(487, 1);
  });

  it('runs the mini-jobs since January so month and year tell the same story', () => {
    const months = new Set(
      state.shifts
        .filter((shift) => shift.jobId !== 'demo-festival' && shift.date.startsWith(String(year)))
        .map((shift) => shift.date.slice(0, 7)),
    );
    expect(months.size).toBe(currentMonth);

    const projected = annualMiniProjection(state.shifts, state.jobs, year, currentMonth);
    // Rund zwölf typische Monate um die 487 EUR, aber unter der Jahresgrenze.
    expect(projected).toBeGreaterThan(487 * 11);
    expect(projected).toBeLessThan(7_236);
  });
});

describe('state migration', () => {
  it('adds empty calendar fields to older saved states and drops invalid entries', async () => {
    const old = createDemoState() as Partial<ReturnType<typeof createDemoState>>;
    delete old.calendars;
    delete old.pendingImports;
    const migrated = parseBackup(old)?.state;
    expect(migrated?.calendars).toEqual([]);
    expect(migrated?.pendingImports).toEqual([]);

    const imported = parseBackup({
      ...createDemoState(),
      calendars: [{ id: 'c', name: 'Arbeit', kind: 'url', url: 'https://calendar.google.com/secret.ics' }, { id: 1 }],
      pendingImports: [{ date: '2026-10-20', hours: 4, source: 'calendar' }, { date: 'x', hours: 1, source: 'calendar' }],
    });
    const withCalendar = imported!.state;
    expect(withCalendar.calendars).toHaveLength(1);
    // Der ungültige Kalender wird aussortiert und aufbewahrt, nicht verworfen.
    expect(imported!.quarantine).toEqual([{ id: 'calendarSource:#1', kind: 'calendarSource', raw: { id: 1 }, reason: 'invalid' }]);
    expect(withCalendar.pendingImports).toHaveLength(1);
    expect(stateForExport(withCalendar).calendars[0]).toEqual({ id: 'c', name: 'Arbeit', kind: 'url' });
  });
});

describe('Beispielprofil Mia, 16', () => {
  it('ist ein gültiger Stand im Schüler-Modus mit Jugendschutz-Meldungen', async () => {
    const { createMiaState } = await import('./storage');
    const { ageOn, checkYouthLabor, isStudentMode } = await import('@headroom/core');
    const mia = createMiaState();
    const today = new Date().toISOString().slice(0, 10);
    expect(parseBackup(JSON.parse(JSON.stringify(mia)))?.state.example).toBe('mia');
    expect(ageOn(mia.profile, today)).toBe(16);
    expect(isStudentMode(mia.profile, today)).toBe(true);
    const month = today.slice(0, 7);
    const errors = checkYouthLabor({ profile: mia.profile, jobs: mia.jobs, shifts: mia.shifts, from: month + '-01', to: month + '-31' })
      .filter((item) => item.severity === 'error');
    // Grenzen passend zu 16: kein Mindestlohn, keine Steuergrenze, dafür Jugendschutz und kurzfristig.
    const { activeLimits, referenceHourlyWage } = await import('@headroom/core');
    const year = Number(today.slice(0, 4));
    const ids = activeLimits(mia.profile, year).map((limit) => limit.id);
    expect(ids).not.toContain('minimumWage');
    expect(ids).not.toContain('incomeTaxThreshold');
    expect(ids).toEqual(expect.arrayContaining(['miniJobMonthly', 'familyInsurance', 'youthWorkProtection', 'shortTermEmployment']));
    expect(referenceHourlyWage(mia.profile, mia.jobs, year)).toBe(11.5);
    // 16 und Oberstufe: Jugendregeln, keine Kinderregeln. Die Freitagsschicht bis 21 Uhr fällt auf.
    const ruleIds = errors.map((item) => item.ruleId);
    expect(ruleIds).toContain('nightRest');
    expect(ruleIds.filter((id) => id.startsWith('child'))).toEqual([]);
  });
});

describe('Sicherungsdatei', () => {
  it('enthält aussortierte Einträge, aber keine privaten Kalender-Links', () => {
    const state = { ...createDemoState(), calendars: [{ id: 'c', name: 'Arbeit', kind: 'url' as const, url: 'https://example.org/geheim.ics' }] };
    const quarantine = [{ id: 'shift:kaputt', kind: 'shift' as const, raw: { hours: -1 }, reason: 'invalid' as const }];
    const backup = createBackup(state, quarantine, { advancedMode: false });
    expect(backup.quarantine).toEqual(quarantine);
    expect(JSON.stringify(backup)).not.toContain('geheim.ics');
  });
});
