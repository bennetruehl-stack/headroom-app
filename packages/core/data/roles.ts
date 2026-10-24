// Zentrale Rollenzuordnung: Welche Grenzen und Hinweise stehen für welche Rolle
// oben (primär) und welche zurückhaltend (sekundär)? Die Profilfilter in
// activeLimits (Alter, Familienversicherung, BAföG, Hauptjob) gelten zusätzlich.
// Die Zuordnung entscheidet nur über primär oder sekundär, nicht über richtig oder falsch.
import type { ProfileStatus } from '../src/types';

/** Limit-IDs aus limits.ts plus reine Hinweiskarten (taxClassInfo). */
export type RoleItem =
  | 'miniJobMonthly'
  | 'familyInsurance'
  | 'bafoegSideIncome'
  | 'shortTermEmployment'
  | 'incomeTaxThreshold'
  | 'workingStudentHours'
  | 'miniJobAlongsideMainJob'
  | 'taxClassInfo'
  | 'youthWorkProtection';

export type RoleLayout = { primary: RoleItem[]; secondary: RoleItem[] };

export const roleLayouts: Record<ProfileStatus, RoleLayout> = {
  Student: {
    primary: ['miniJobMonthly', 'familyInsurance', 'bafoegSideIncome', 'shortTermEmployment'],
    secondary: ['incomeTaxThreshold', 'workingStudentHours'],
  },
  'Working student': {
    primary: ['workingStudentHours', 'miniJobMonthly', 'incomeTaxThreshold'],
    secondary: ['familyInsurance', 'bafoegSideIncome'],
  },
  'Mini-jobber': {
    primary: ['miniJobMonthly', 'shortTermEmployment'],
    secondary: ['incomeTaxThreshold'],
  },
  Employee: {
    primary: ['miniJobAlongsideMainJob', 'taxClassInfo'],
    secondary: ['miniJobMonthly'],
  },
  Pupil: {
    primary: ['miniJobMonthly', 'youthWorkProtection', 'familyInsurance'],
    secondary: ['incomeTaxThreshold'],
  },
};

export type RoleTier = 'primary' | 'secondary' | 'other';

export function roleTier(status: ProfileStatus, item: string): RoleTier {
  const layout = roleLayouts[status];
  if ((layout.primary as string[]).includes(item)) return 'primary';
  if ((layout.secondary as string[]).includes(item)) return 'secondary';
  return 'other';
}
