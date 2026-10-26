import { defaultFeatures, sanitizeFeatures, type FeatureName } from '../config/features';

export function getFeatureFlags(): Record<FeatureName, boolean> {
  try {
    const stored = localStorage.getItem('headroom-features');
    return stored ? sanitizeFeatures(JSON.parse(stored)) : { ...defaultFeatures };
  } catch {
    return { ...defaultFeatures };
  }
}

export function getAdvancedMode(): boolean {
  try {
    return localStorage.getItem('headroom-advanced') === 'true';
  } catch {
    return false;
  }
}
