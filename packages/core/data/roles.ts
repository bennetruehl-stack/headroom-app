// Zentrale Rollenzuordnung: Welche Grenzen und Hinweise stehen für welche Rolle
// oben (primär) und welche zurückhaltend (sekundär)? Die Profilfilter in
// activeLimits (Alter, Familienversicherung, BAföG, Hauptjob) gelten zusätzlich.
// Die Zuordnung entscheidet nur über primär oder sekundär, nicht über richtig oder falsch.
import type { ProfileStatus } from '../src/types';

/** Limit-IDs aus limits.ts plus reine Hinweiskarten (taxClassInfo) und Zähler (holidayJobDays). */
export type RoleItem =
  | 'miniJobMonthly'
  | 'familyInsurance'
  | 'bafoegSideIncome'
  | 'shortTermEmployment'
  | 'incomeTaxThreshold'
  | 'workingStudentHours'
  | 'workingStudent26Weeks'
  | 'miniJobAlongsideMainJob'
  | 'taxClassInfo'
  | 'youthWorkProtection'
  /** Ferienjob-Zähler (§ 5 Abs. 4 JArbSchG), keine Limit-ID. */
  | 'holidayJobDays';

export type RoleLayout = { primary: RoleItem[]; secondary: RoleItem[] };

export const roleLayouts: Record<ProfileStatus, RoleLayout> = {
  Student: {
    primary: ['miniJobMonthly', 'familyInsurance', 'bafoegSideIncome', 'shortTermEmployment'],
    secondary: ['incomeTaxThreshold', 'workingStudentHours'],
  },
  'Working student': {
    primary: ['workingStudentHours', 'workingStudent26Weeks', 'miniJobMonthly', 'incomeTaxThreshold'],
    secondary: ['familyInsurance', 'bafoegSideIncome', 'shortTermEmployment'],
  },
  'Mini-jobber': {
    primary: ['miniJobMonthly', 'shortTermEmployment'],
    secondary: ['incomeTaxThreshold'],
  },
  Employee: {
    primary: ['miniJobAlongsideMainJob', 'taxClassInfo'],
    secondary: ['miniJobMonthly', 'shortTermEmployment'],
  },
  Pupil: {
    primary: ['miniJobMonthly', 'youthWorkProtection', 'holidayJobDays', 'familyInsurance'],
    // Kurzfristig nur mit kurzfristigem Job (z. B. Ferienjob), siehe roleRows.
    secondary: ['shortTermEmployment', 'incomeTaxThreshold'],
  },
  'School leaver': {
    primary: ['miniJobMonthly', 'shortTermEmployment', 'youthWorkProtection', 'familyInsurance'],
    secondary: ['incomeTaxThreshold'],
  },
  Apprentice: {
    primary: ['miniJobMonthly', 'youthWorkProtection', 'incomeTaxThreshold'],
    secondary: [],
  },
};

export type RoleTier = 'primary' | 'secondary' | 'other';

export function roleTier(status: ProfileStatus, item: string): RoleTier {
  const layout = roleLayouts[status];
  if ((layout.primary as string[]).includes(item)) return 'primary';
  if ((layout.secondary as string[]).includes(item)) return 'secondary';
  return 'other';
}
