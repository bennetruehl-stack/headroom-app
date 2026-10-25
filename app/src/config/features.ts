// Optionale Demo-Funktionen. Sie sind nur über den Advanced-Modus erreichbar und standardmäßig aus.
export type FeatureName = 'jobBoard' | 'partnerRecommendations' | 'premium' | 'peerStats' | 'osmCompanyCheck';

export const featureNames: FeatureName[] = ['jobBoard', 'partnerRecommendations', 'premium', 'peerStats', 'osmCompanyCheck'];

export const defaultFeatures: Record<FeatureName, boolean> = {
  jobBoard: false,
  partnerRecommendations: false,
  premium: false,
  peerStats: false,
  osmCompanyCheck: false,
};

/** Was beim ersten Einschalten des Advanced-Modus aktiv wird: Jobbörse mit Partner-Jobbörsen und Partnerhinweise. */
export const advancedDefaults: Record<FeatureName, boolean> = {
  ...defaultFeatures,
  jobBoard: true,
  partnerRecommendations: true,
};

/** Nur bekannte Schlüssel mit Wahrheitswerten übernehmen (alte Flags wie „scheduleScan“ fallen weg). */
export function sanitizeFeatures(value: unknown): Record<FeatureName, boolean> {
  const result = { ...defaultFeatures };
  if (!value || typeof value !== 'object') return result;
  for (const name of featureNames) {
    const flag = (value as Record<string, unknown>)[name];
    if (typeof flag === 'boolean') result[name] = flag;
  }
  return result;
}

/** Ohne Advanced-Modus ist jede Demo-Funktion aus, egal wie die Einzel-Flags stehen. */
export function effectiveFeatures(advancedMode: boolean, flags: Record<FeatureName, boolean>): Record<FeatureName, boolean> {
  return advancedMode ? flags : { ...defaultFeatures };
}
