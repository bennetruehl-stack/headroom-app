import type { ActiveFeatures, FeatureId } from '@headroom/core';
import type { Screen } from './types';

/** Bildschirme, die nur mit Freigabe aus der Feature-Registry erscheinen. */
const screenFeature: Partial<Record<Screen, FeatureId>> = {
  Parents: 'parents',
  Developer: 'developer',
  JobBoard: 'jobBoard',
  PeerStats: 'peerStats',
  Premium: 'premium',
  Trends: 'trends',
  WageCheck: 'wageCheck',
  Import: 'icsImport',
};

/** Jede Route ist gesperrt, nicht nur ihr Menüeintrag: ohne Freigabe erscheint die More-Seite. */
export function allowedScreen(requested: Screen, features: ActiveFeatures): Screen {
  const feature = screenFeature[requested];
  return feature && !features[feature] ? 'More' : requested;
}
