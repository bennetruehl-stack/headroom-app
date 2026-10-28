import { describe, expect, it } from 'vitest';
import { acceptTransition, dismissTransition, isStudentMode, pendingTransitions, youthLaborApplies, type Profile } from './index';

const pupil: Profile = { status: 'Pupil', age: 17, birthDate: '2008-11-05', familyInsured: true, bafoeg: false, afterSchool: 'study', graduationDate: '2027-06-30' };

describe('18. Geburtstag', () => {
  it('erscheint erst ab dem Geburtstag (Datum injiziert)', () => {
    expect(pendingTransitions(pupil, '2026-11-04')).toEqual([]);
    expect(pendingTransitions(pupil, '2026-11-05')).toEqual([{ id: 'adult@2026-11-05', kind: 'adult', date: '2026-11-05' }]);
  });

  it('beendet Jugendschutz automatisch, den Schüler-Modus erst nach Bestätigung', () => {
    expect(youthLaborApplies(pupil, '2026-11-05')).toBe(false);
    expect(isStudentMode(pupil, '2026-11-05')).toBe(true);
    const [transition] = pendingTransitions(pupil, '2026-11-05');
    const accepted = acceptTransition(pupil, transition, '2026-11-05');
    expect(accepted.age).toBe(18);
    expect(isStudentMode(accepted, '2026-11-05')).toBe(false);
    expect(pendingTransitions(accepted, '2026-11-06')).toEqual([]);
  });

  it('fragt nach Ablehnen nicht erneut und lässt den Modus an', () => {
    const [transition] = pendingTransitions(pupil, '2026-11-05');
    const dismissed = dismissTransition(pupil, transition);
    expect(pendingTransitions(dismissed, '2026-12-01')).toEqual([]);
    expect(isStudentMode(dismissed, '2026-12-01')).toBe(true);
  });

  it('behandelt den 29. Februar', () => {
    expect(pendingTransitions({ ...pupil, birthDate: '2008-02-29' }, '2026-03-01')[0]?.date).toBe('2026-03-01');
  });

  it('bietet sehr alte Übergänge nicht mehr an', () => {
    expect(pendingTransitions({ ...pupil, birthDate: '2000-01-01', graduationDate: undefined }, '2026-11-05')).toEqual([]);
  });
});

describe('Schulabschluss', () => {
  const adult = { ...pupil, birthDate: '2005-01-01' };

  it('schlägt Student:in oder Azubi vor, setzt aber nichts automatisch', () => {
    const study = pendingTransitions(adult, '2027-07-01');
    expect(study).toEqual([{ id: 'graduation@2027-06-30:Student', kind: 'graduation', date: '2027-06-30', suggestedStatus: 'Student' }]);
    expect(adult.status).toBe('Pupil');
    expect(pendingTransitions({ ...adult, afterSchool: 'apprenticeship' }, '2027-07-01')[0]).toMatchObject({ suggestedStatus: 'Apprentice' });
    expect(pendingTransitions({ ...adult, afterSchool: 'undecided' }, '2027-07-01')[0]).toMatchObject({ suggestedStatus: 'School leaver' });
    expect(pendingTransitions(adult, '2027-06-29')).toEqual([]);
  });

  it('übernimmt den Status erst nach Bestätigung', () => {
    const [transition] = pendingTransitions(adult, '2027-07-01');
    expect(acceptTransition(adult, transition, '2027-07-01').status).toBe('Student');
  });

  it('fragt nach Plan-Änderung erneut', () => {
    const [transition] = pendingTransitions(adult, '2027-07-01');
    const dismissed = dismissTransition(adult, transition);
    expect(pendingTransitions(dismissed, '2027-07-02')).toEqual([]);
    expect(pendingTransitions({ ...dismissed, afterSchool: 'apprenticeship' }, '2027-07-02')[0]).toMatchObject({ suggestedStatus: 'Apprentice' });
  });
});
