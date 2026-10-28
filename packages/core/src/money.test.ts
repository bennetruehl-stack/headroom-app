import { describe, expect, it } from 'vitest';
import { basicIncomeView, medicalExamStatus, minimumWageAssessment, shortTermProfessionalRisk, taxRefundHint, type Job, type Profile, type Shift } from './index';

const teen: Profile = { status: 'Pupil', age: 16, birthDate: '2010-03-15', familyInsured: true, bafoeg: false };

describe('Mindestlohn unter 18', () => {
  it('gilt nicht unter 18 ohne Berufsausbildung', () => {
    const result = minimumWageAssessment(teen, { wage: 9 }, '2026-11-02');
    expect(result).toMatchObject({ applies: false, exemptReason: 'under18WithoutTraining', lawRef: '§ 22 Abs. 2 MiLoG' });
    expect(result.differenceToMinimum).toBeLessThan(0);
  });

  it('gilt mit abgeschlossener Ausbildung oder ab 18', () => {
    expect(minimumWageAssessment({ ...teen, completedVocationalTraining: true }, { wage: 9 }, '2026-11-02').applies).toBe(true);
    expect(minimumWageAssessment(teen, { wage: 9 }, '2028-03-15').applies).toBe(true);
  });
});

describe('Bürgergeld', () => {
  const jobs: Job[] = [{ id: 'j', title: 'Job', type: 'mini-job', wage: 10, startDate: '2026-01-01' }];
  const holidays = { schoolHolidays: [{ start: '2026-07-01', end: '2026-07-31' }] };
  const shifts: Shift[] = [
    { jobId: 'j', date: '2026-07-10', hours: 50 },
    { jobId: 'j', date: '2026-07-31', hours: 10 },
  ];

  it('rechnet Ferienjob-Einkommen ganz frei und gibt die Minijob-Grenze als Freibetrag an', () => {
    const view = basicIncomeView({ ...teen, ...holidays, familyReceivesBasicIncome: true }, jobs, [...shifts, { jobId: 'j', date: '2026-07-01', hours: 0 }], [], '2026-07');
    expect(view).toMatchObject({ applies: true, holidayIncome: 600, otherIncome: 0, allowance: 603 });
  });

  it('zeigt den Anteil über dem Freibetrag außerhalb der Ferien', () => {
    const view = basicIncomeView({ ...teen, familyReceivesBasicIncome: true }, jobs, [{ jobId: 'j', date: '2026-11-03', hours: 70 }], [], '2026-11');
    expect(view.otherIncome).toBe(700);
    expect(view.aboveAllowance).toBe(97);
  });

  it('gilt nur mit Schalter', () => {
    expect(basicIncomeView(teen, jobs, shifts, [], '2026-07').applies).toBe(false);
  });
});

describe('Steuererstattung', () => {
  const jobs: Job[] = [{ id: 'r', title: 'Aushilfe', type: 'regular', wage: 13, startDate: '2026-01-01', incomeTaxWithheld: true }];

  it('meldet eine wahrscheinliche Erstattung unter dem Grundfreibetrag', () => {
    const shifts: Shift[] = Array.from({ length: 10 }, (_, index) => ({ jobId: 'r', date: '2026-' + String(index + 1).padStart(2, '0') + '-05', hours: 40 }));
    const hint = taxRefundHint(jobs, shifts, [], 2026, '2026-10-28');
    expect(hint).toMatchObject({ likelyRefund: true, yearsBack: 4 });
    expect(hint!.projected).toBeCloseTo(520 * 12);
  });

  it('meldet nichts ohne abgezogene Lohnsteuer', () => {
    expect(taxRefundHint([{ ...jobs[0], incomeTaxWithheld: false }], [], [], 2026, '2026-10-28')).toBeNull();
  });
});

describe('Schulabgänger:innen und kurzfristige Beschäftigung', () => {
  const jobs: Job[] = [{ id: 's', title: 'Saisonjob', type: 'short-term', wage: 14, startDate: '2026-07-01' }];
  const shifts: Shift[] = [{ jobId: 's', date: '2026-08-03', hours: 60, days: 1 }];
  const leaver = (afterSchool: Profile['afterSchool']): Profile => ({ ...teen, status: 'School leaver', afterSchool });

  it('vor dem Studium nicht berufsmäßig', () => {
    expect(shortTermProfessionalRisk(leaver('study'), jobs, shifts, '2026-08', 2026)).toBeNull();
  });

  it('vor Ausbildung oder Freiwilligendienst berufsmäßig, sobald über der Geringfügigkeitsgrenze', () => {
    expect(shortTermProfessionalRisk(leaver('apprenticeship'), jobs, shifts, '2026-08', 2026)).toBe('schoolLeaverToTraining');
    expect(shortTermProfessionalRisk(leaver('voluntaryService'), jobs, shifts, '2026-08', 2026)).toBe('schoolLeaverToTraining');
    const small: Shift[] = [{ jobId: 's', date: '2026-08-03', hours: 20, days: 1 }];
    expect(shortTermProfessionalRisk(leaver('apprenticeship'), jobs, small, '2026-08', 2026)).toBeNull();
  });

  it('ohne Plan als Hinweis', () => {
    expect(shortTermProfessionalRisk(leaver(undefined), jobs, shifts, '2026-08', 2026)).toBe('schoolLeaverUndecided');
  });
});

describe('Erstuntersuchung (§ 32 JArbSchG)', () => {
  const base: Job = { id: 'k', title: 'Küche', type: 'regular', wage: 10, startDate: '2026-09-01' };

  it('ist für 15–17 vor Jobbeginn nötig und höchstens 14 Monate alt', () => {
    const status = medicalExamStatus({ ...teen, medicalExamDate: '2025-08-01' }, base)!;
    expect(status).toMatchObject({ required: true, examValid: true, earliestExamDate: '2025-07-01', lawRef: '§ 32 Abs. 1 JArbSchG' });
    expect(medicalExamStatus({ ...teen, medicalExamDate: '2025-06-30' }, base)!.examValid).toBe(false);
  });

  it('entfällt bei leichter Arbeit im Minijob oder bis 2 Monate', () => {
    expect(medicalExamStatus(teen, { ...base, type: 'mini-job', tags: ['lightWork'] })!.exemptReason).toBe('marginalLightWork');
    expect(medicalExamStatus(teen, { ...base, endDate: '2026-10-31', tags: ['lightWork'] })!.exemptReason).toBe('shortLightWork');
    expect(medicalExamStatus(teen, { ...base, endDate: '2026-11-15', tags: ['lightWork'] })!.required).toBe(true);
  });

  it('gilt nicht unter 15 oder ab 18', () => {
    expect(medicalExamStatus({ ...teen, birthDate: '2012-01-01' }, base)).toBeNull();
    expect(medicalExamStatus({ ...teen, birthDate: '2008-01-01' }, base)).toBeNull();
  });
});
