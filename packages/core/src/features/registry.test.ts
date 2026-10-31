/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Job, Profile } from '../types';
import { advancedDefaults, defaultFeatures } from './flags';
import { accountPossible, consentAgeReached, featureRegistry, resolveFeatures, type FeatureContext } from './registry';

const DAY = '2026-10-31';

const student: Profile = { status: 'Student', age: 20, familyInsured: true, bafoeg: false };
const pupil: Profile = { status: 'Pupil', age: 16, birthDate: '2010-06-01', familyInsured: true, bafoeg: false };
const miniJob: Job = { id: 'a', title: 'Café', type: 'mini-job', wage: 14, startDate: '2026-01-01' };
const shortTerm: Job = { id: 'b', title: 'Messe', type: 'short-term', wage: 15, startDate: '2026-03-01' };

function ctx(overrides: Partial<FeatureContext> = {}): FeatureContext {
  return { profile: student, jobs: [], date: DAY, advancedMode: false, flags: { ...defaultFeatures }, isExample: false, hasAccount: false, ...overrides };
}

describe('Einwilligungsalter 16', () => {
  it('rechnet mit dem Geburtsdatum am Stichtag', () => {
    expect(consentAgeReached({ ...student, age: 0, birthDate: '2010-11-01' }, DAY)).toBe(false);
    expect(consentAgeReached({ ...student, age: 0, birthDate: '2010-10-31' }, DAY)).toBe(true);
    expect(consentAgeReached({ ...student, age: 0, birthDate: '2010-10-30' }, DAY)).toBe(true);
  });

  it('nimmt ohne Geburtsdatum das angegebene Alter', () => {
    expect(consentAgeReached({ ...student, age: 15 }, DAY)).toBe(false);
    expect(consentAgeReached({ ...student, age: 16 }, DAY)).toBe(true);
  });
});

describe('Konto möglich', () => {
  it('ab 16 ohne Beispielprofil', () => {
    expect(accountPossible(ctx({ profile: { ...student, age: 0, birthDate: '2010-11-01' } }))).toBe(false);
    expect(accountPossible(ctx({ profile: { ...student, age: 0, birthDate: '2010-10-31' } }))).toBe(true);
    expect(accountPossible(ctx({ profile: { ...student, age: 15 } }))).toBe(false);
    expect(accountPossible(ctx({ profile: { ...student, age: 16 } }))).toBe(true);
  });

  it('nicht mit einem Beispielprofil wie Mia (16)', () => {
    expect(accountPossible(ctx({ profile: pupil, isExample: true }))).toBe(false);
  });
});

describe('Schüler-Modus in der Registry', () => {
  it('Eltern-Seite nur im Schüler-Modus', () => {
    expect(resolveFeatures(ctx({ profile: { ...pupil, birthDate: '2008-11-01', age: 17 } })).parents).toBe(true);
    // Genau 18, Status Schüler:in, Wechsel nicht bestätigt: Modus bleibt an.
    expect(resolveFeatures(ctx({ profile: { ...pupil, birthDate: '2008-10-31', age: 18 } })).parents).toBe(true);
    const confirmed = { ...pupil, birthDate: '2008-10-31', age: 18, handledTransitions: ['adult@2026-10-31'] };
    expect(resolveFeatures(ctx({ profile: confirmed })).parents).toBe(false);
    expect(resolveFeatures(ctx()).parents).toBe(false);
  });

  it('blendet Demo- und Partnerfunktionen aus, auch mit Advanced', () => {
    const active = resolveFeatures(ctx({ profile: pupil, advancedMode: true, flags: { ...defaultFeatures, jobBoard: true, partnerRecommendations: true, premium: true, peerStats: true, osmCompanyCheck: true } }));
    expect(active.jobBoard).toBe(false);
    expect(active.partnerRecommendations).toBe(false);
    expect(active.premium).toBe(false);
    expect(active.peerStats).toBe(false);
    expect(active.osmCompanyCheck).toBe(false);
  });
});

describe('Advanced-Funktionen', () => {
  it('sind ohne Advanced-Modus aus, egal wie die Flags stehen', () => {
    const active = resolveFeatures(ctx({ advancedMode: false, flags: { ...advancedDefaults, premium: true } }));
    expect(active.jobBoard).toBe(false);
    expect(active.premium).toBe(false);
    expect(active.developer).toBe(false);
  });

  it('folgen mit Advanced-Modus den einzelnen Flags', () => {
    const active = resolveFeatures(ctx({ advancedMode: true, flags: { ...defaultFeatures, jobBoard: true } }));
    expect(active.jobBoard).toBe(true);
    expect(active.premium).toBe(false);
    expect(active.developer).toBe(true);
  });

  it('rechnen mit dem Geburtsdatum: 18 laut Alter, aber 15 laut Geburtsdatum bleibt gesperrt', () => {
    const profile = { ...student, age: 18, birthDate: '2011-05-01' };
    expect(resolveFeatures(ctx({ profile, advancedMode: true, flags: { ...defaultFeatures, partnerRecommendations: true } })).partnerRecommendations).toBe(false);
  });
});

describe('Schutzfunktionen ohne Advanced-Modus', () => {
  it('Wochenkalender für alle, Schulzeit-Markierung nur im Schüler-Modus', () => {
    const adult = resolveFeatures(ctx());
    expect(adult.weekCalendar).toBe(true);
    expect(adult.schoolTimeMarking).toBe(false);
    const young = resolveFeatures(ctx({ profile: pupil }));
    expect(young.weekCalendar).toBe(true);
    expect(young.schoolTimeMarking).toBe(true);
  });

  it('Job-Kombinationen, sobald eine Kombination erkannt ist', () => {
    expect(resolveFeatures(ctx({ jobs: [miniJob] })).jobCombinations).toBe(false);
    expect(resolveFeatures(ctx({ jobs: [miniJob, shortTerm] })).jobCombinations).toBe(true);
  });
});

describe('Grenzen der Altersregeln (Stichtag 2026-10-31)', () => {
  const pupilBorn = (birthDate: string): Profile => ({ ...pupil, birthDate, isFullTimeSchoolObligated: true });

  it('Ferienjob-Zähler ab 15: knapp unter, genau auf, über der Grenze', () => {
    expect(resolveFeatures(ctx({ profile: pupilBorn('2011-11-01') })).holidayJobCounter).toBe(false);
    expect(resolveFeatures(ctx({ profile: pupilBorn('2011-10-31') })).holidayJobCounter).toBe(true);
    expect(resolveFeatures(ctx({ profile: pupilBorn('2010-10-31') })).holidayJobCounter).toBe(true);
  });

  it('Jugendarbeitsschutz und Job-Hinweise unter 18: knapp unter, genau auf, über der Grenze', () => {
    const born = (birthDate: string) => resolveFeatures(ctx({ profile: { ...student, age: 0, birthDate } }));
    expect(born('2008-11-01').youthLaborCheck).toBe(true);
    expect(born('2008-11-01').minorJobHints).toBe(true);
    expect(born('2008-10-31').youthLaborCheck).toBe(false);
    expect(born('2008-10-31').minorJobHints).toBe(false);
    expect(born('2007-10-31').youthLaborCheck).toBe(false);
  });

  it('Warnung für mehrere Minijobs ab zwei Minijobs', () => {
    const second: Job = { ...miniJob, id: 'c' };
    const third: Job = { ...miniJob, id: 'd' };
    expect(resolveFeatures(ctx({ jobs: [miniJob] })).multipleMiniJobs).toBe(false);
    expect(resolveFeatures(ctx({ jobs: [miniJob, second] })).multipleMiniJobs).toBe(true);
    expect(resolveFeatures(ctx({ jobs: [miniJob, second, third] })).multipleMiniJobs).toBe(true);
  });
});

describe('Job-Kombinationen zur Planung', () => {
  it('zeigt mögliche Kombinationen schon mit einem Job, die eigene Kombi erst mit zweien', () => {
    const one = resolveFeatures(ctx({ jobs: [miniJob] }));
    expect(one.combinationPlanning).toBe(true);
    expect(one.jobCombinations).toBe(false);
  });
});

describe('Status-abhängige Funktionen', () => {
  it('26-Wochen-Regel nur für Werkstudent:innen', () => {
    expect(resolveFeatures(ctx({ profile: { ...student, status: 'Working student' } })).workingStudentRules).toBe(true);
    expect(resolveFeatures(ctx({ profile: { ...student, status: 'Mini-jobber' } })).workingStudentRules).toBe(false);
  });
});

describe('Noch nicht gebaute Funktionen', () => {
  it('sind nie aktiv', () => {
    const active = resolveFeatures(ctx({ hasAccount: true, advancedMode: true, flags: { ...advancedDefaults } }));
    for (const entry of featureRegistry.filter((item) => !item.built)) expect(active[entry.id]).toBe(false);
  });
});

describe('Abgleich mit dem Funktionskatalog', () => {
  it('jede Funktion aus docs/Funktionskatalog.md steht in der Registry', () => {
    const catalog = readFileSync(new URL('../../../../docs/Funktionskatalog.md', import.meta.url), 'utf8');
    const ids = [...catalog.matchAll(/^\| (F\d{2}) \|/gm)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThanOrEqual(40);
    const registered = featureRegistry.map((entry) => entry.catalog).sort();
    expect(registered).toEqual([...new Set(ids)].sort());
  });
});
