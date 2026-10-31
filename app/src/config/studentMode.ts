// Was im Schüler-Modus bei Beschäftigungsarten, Vorlagen und Grenzen ausgeblendet wird.
// Welche Funktionen aktiv sind, entscheidet die Feature-Registry im Core (packages/core/src/features).
// Der Modus selbst wird aus Alter und Status abgeleitet (isStudentMode im Core). Nach dem
// bestätigten Wechsel am 18. Geburtstag ist alles automatisch wieder sichtbar.
import { limits, type Job, type ProfileStatus } from '@headroom/core';
import type { JobPreset } from '@headroom/core/data/jobPresets';

export const studentModeHidden = {
  /** Beschäftigungsarten, die es neben der Schule nicht gibt. */
  employmentTypes: ['working student'] as Job['type'][],
  /** Grenzwerte-Seite: nur Grenzen zeigen, die für das Profil gelten. */
  hideInapplicableLimits: true,
} as const;

export function visibleEmploymentType(type: Job['type'], studentMode: boolean): boolean {
  return !studentMode || !studentModeHidden.employmentTypes.includes(type);
}

/** Vorlagen, die nur als Werkstudenten- oder reguläre Stelle vorkommen, passen nicht neben die Schule. */
export function visiblePreset(preset: JobPreset, studentMode: boolean): boolean {
  if (!studentMode) return true;
  return preset.typicalEmploymentTypes.some((type) => type !== 'regular' && !studentModeHidden.employmentTypes.includes(type));
}

/** BAföG-Schalter nur, wenn für den Status überhaupt eine BAföG-Grenze gilt (datengetrieben aus limits.ts). */
export function bafoegRelevant(status: ProfileStatus): boolean {
  return limits.some((limit) => limit.id === 'bafoegSideIncome' && limit.appliesTo.includes(status));
}

export function showLimitInStudentMode(applies: boolean, studentMode: boolean): boolean {
  return !studentMode || !studentModeHidden.hideInapplicableLimits || applies;
}

