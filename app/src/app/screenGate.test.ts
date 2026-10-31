import { defaultFeatures, resolveFeatures, type FeatureContext } from '@headroom/core';
import { describe, expect, it } from 'vitest';
import { createDemoState, createMiaState, type AppState } from '../lib/storage';
import { allowedScreen } from './screenGate';

const DAY = '2026-10-31';

function featuresFor(state: AppState, overrides: Partial<FeatureContext> = {}) {
  return resolveFeatures({ profile: state.profile, jobs: state.jobs, date: DAY, advancedMode: false, flags: { ...defaultFeatures }, isExample: Boolean(state.example), hasAccount: false, ...overrides });
}

describe('Routen sind gesperrt, nicht nur der Menüeintrag', () => {
  it('Standardprofil (Student 20) landet bei direktem Aufruf der Eltern-Seite auf der More-Seite', () => {
    expect(allowedScreen('Parents', featuresFor(createDemoState()))).toBe('More');
  });

  it('Mia (16) darf die Eltern-Seite öffnen', () => {
    expect(allowedScreen('Parents', featuresFor(createMiaState()))).toBe('Parents');
  });

  it('Demo-Seiten ohne Advanced-Modus führen zur More-Seite', () => {
    const features = featuresFor(createDemoState());
    expect(allowedScreen('JobBoard', features)).toBe('More');
    expect(allowedScreen('Premium', features)).toBe('More');
    expect(allowedScreen('Developer', features)).toBe('More');
  });

  it('Jobbörse mit Advanced-Modus offen, im Schüler-Modus nicht', () => {
    const flags = { ...defaultFeatures, jobBoard: true };
    expect(allowedScreen('JobBoard', featuresFor(createDemoState(), { advancedMode: true, flags }))).toBe('JobBoard');
    expect(allowedScreen('JobBoard', featuresFor(createMiaState(), { advancedMode: true, flags }))).toBe('More');
  });

  it('frei zugängliche Seiten bleiben offen', () => {
    const features = featuresFor(createDemoState());
    for (const screen of ['Dashboard', 'Shifts', 'Jobs', 'Limits', 'Settings', 'Trends', 'WageCheck', 'Import'] as const) {
      expect(allowedScreen(screen, features)).toBe(screen);
    }
  });
});
