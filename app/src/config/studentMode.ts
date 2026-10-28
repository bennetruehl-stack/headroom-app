// Was im Schüler-Modus ausgeblendet wird. Eine Stelle für alles; Komponenten fragen nur hier.
// Der Modus selbst wird aus Alter und Status abgeleitet (isStudentMode im Core). Nach dem
// bestätigten Wechsel am 18. Geburtstag ist alles automatisch wieder sichtbar.
import { limits, type Job, type ProfileStatus } from '@headroom/core';
import type { JobPreset } from '@headroom/core/data/jobPresets';
import type { FeatureName } from './features';

export const studentModeHidden = {
  /**
   * Demo- und Partnerfunktionen ohne Nutzen für Schüler:innen:
   * - partnerRecommendations, premium: Werbung und Kaufangebote
   * - peerStats, osmCompanyCheck: Daten verlassen das Gerät
   * - jobBoard: Demo-Inserate werden nicht gegen den Jugendarbeitsschutz geprüft
   */
  features: ['jobBoard', 'partnerRecommendations', 'premium', 'peerStats', 'osmCompanyCheck'] as FeatureName[],
  /** Beschäftigungsarten, die es neben der Schule nicht gibt. */
  employmentTypes: ['working student'] as Job['type'][],
  /** Grenzwerte-Seite: nur Grenzen zeigen, die für das Profil gelten. */
  hideInapplicableLimits: true,
} as const;

/** Wirksame Feature-Flags: im Schüler-Modus sind die ausgeblendeten Funktionen aus. */
export function studentModeFeatures(features: Record<FeatureName, boolean>, studentMode: boolean): Record<FeatureName, boolean> {
  if (!studentMode) return features;
  const result = { ...features };
  for (const name of studentModeHidden.features) result[name] = false;
  return result;
}

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

