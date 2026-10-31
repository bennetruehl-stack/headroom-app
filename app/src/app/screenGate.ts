import type { ActiveFeatures, FeatureId } from '@headroom/core';
import type { Screen } from './types';

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

export function allowedScreen(requested: Screen, features: ActiveFeatures): Screen {
  const feature = screenFeature[requested];
  return feature && !features[feature] ? 'More' : requested;
}
