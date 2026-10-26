import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { consentAgeRule, type Shift } from '@headroom/core';
import type { Screen } from './app/types';
import { AppFooter, AppHeader } from './components/AppChrome';
import { Navigation } from './components/Navigation';
import { ErrorBoundary } from './app/ErrorBoundary';
import { advancedDefaults, defaultFeatures, effectiveFeatures, type FeatureName } from './config/features';
import { PartnerPanel } from './features/advanced/PartnerPanel';
import { Dashboard } from './features/dashboard/Dashboard';
import { JobsPage } from './features/jobs/JobsPage';
import { LimitsPage } from './features/limits/LimitsPage';
import { MorePage } from './features/more/MorePage';
import { SettingsPage } from './features/more/SettingsPage';
import { Onboarding } from './features/onboarding/Onboarding';
import { ShiftCheckDialog } from './features/shifts/ShiftCheckDialog';
import { ShiftsPage } from './features/shifts/ShiftsPage';
import { t, type Language } from './i18n/translations';
import { getAdvancedMode, getFeatureFlags } from './lib/flags';
import { CalendarFeedError, fetchCalendarFeed, syncDue, syncFromIcs } from './lib/shiftImport';
import { clearLocalState, createDemoState, createLenaState, loadState, saveState, type AppState } from './lib/storage';

// Seltener genutzte Bereiche werden erst beim Öffnen geladen.
const JobBoardPage = lazy(() => import('./features/advanced/JobBoardPage').then((module) => ({ default: module.JobBoardPage })));
const PeerStatsPage = lazy(() => import('./features/advanced/PeerStatsPage').then((module) => ({ default: module.PeerStatsPage })));
const PremiumPage = lazy(() => import('./features/advanced/PremiumPage').then((module) => ({ default: module.PremiumPage })));
const DeveloperPage = lazy(() => import('./features/more/DeveloperPage').then((module) => ({ default: module.DeveloperPage })));
const TrendsPage = lazy(() => import('./features/more/TrendsPage').then((module) => ({ default: module.TrendsPage })));
const WageCheckPage = lazy(() => import('./features/more/WageCheckPage').then((module) => ({ default: module.WageCheckPage })));
const ImportPage = lazy(() => import('./import/ImportPage').then((module) => ({ default: module.ImportPage })));

function App() {
  const [data, setData] = useState<AppState>(() => createDemoState());
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Screen>('Onboarding');
  const [flags, setFeatures] = useState<Record<FeatureName, boolean>>({ ...defaultFeatures });
  const [advancedMode, setAdvancedMode] = useState(false);
  const [featureReady, setFeatureReady] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');
  // Komponenten sehen nur die wirksamen Flags: ohne Advanced-Modus ist jede Demo-Funktion aus.
  const features = effectiveFeatures(advancedMode, flags);
  const [checkOpen, setCheckOpen] = useState(false);
  const language = data.language;

  useEffect(() => {
    let cancelled = false;
    void loadState().then((stored) => {
      if (cancelled) return;
      setData(stored);
      setPage(stored.onboarded ? 'Dashboard' : 'Onboarding');
      setReady(true);
    });
    setFeatures(getFeatureFlags());
    setAdvancedMode(getAdvancedMode());
    setFeatureReady(true);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (ready) void saveState(data);
  }, [data, ready]);

  useEffect(() => {
    document.documentElement.lang = language === 'de' ? 'de' : 'en';
  }, [language]);

  useEffect(() => {
    if (!featureReady) return;
    try {
      localStorage.setItem('headroom-features', JSON.stringify(flags));
      localStorage.setItem('headroom-advanced', String(advancedMode));
    } catch {
      // Feature-flag persistence is optional for demos.
    }
  }, [flags, advancedMode, featureReady]);

  // Kalender-Abos beim Start abgleichen (höchstens alle sechs Stunden). Ohne lokalen Server bleibt alles, wie es ist.
  const syncStarted = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  useEffect(() => {
    if (!ready || syncStarted.current) return;
    syncStarted.current = true;
    const due = data.calendars.filter((calendar) => syncDue(calendar));
    if (!due.length) return;
    void (async () => {
      let added = 0;
      for (const calendar of due) {
        try {
          const text = await fetchCalendarFeed(calendar.url!);
          // Zählen mit dem aktuellen Stand; übernommen wird im Updater, damit parallele Änderungen nicht verloren gehen.
          added += syncFromIcs(text, calendar, dataRef.current).added;
          setData((current) => {
            const outcome = syncFromIcs(text, calendar, current);
            return {
              ...current,
              shifts: outcome.shifts,
              pendingImports: outcome.pending,
              calendars: current.calendars.map((item) => item.id === calendar.id ? { ...item, lastSync: new Date().toISOString(), lastError: undefined } : item),
            };
          });
        } catch (error) {
          const code = error instanceof CalendarFeedError ? error.code : 'unknown';
          setData((current) => ({
            ...current,
            calendars: current.calendars.map((item) => item.id === calendar.id ? { ...item, lastError: code } : item),
          }));
        }
      }
      if (added > 0) setSyncNotice(t(language, 'calendarAutoAdded', { count: added }));
    })();
  }, [ready]);

  const changeAdvanced = (value: boolean) => {
    setAdvancedMode(value);
    // Beim ersten Einschalten die Partner-Demo aktivieren, damit sofort etwas zu sehen ist.
    if (value && Object.values(flags).every((flag) => !flag)) setFeatures({ ...advancedDefaults });
  };

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [page]);

  // Stabile Updater: immer auf dem aktuellen Stand, nie auf einer veralteten Kopie.
  const update = useCallback((values: Partial<AppState>) =>
    setData((current) => ({ ...current, ...values })), []);

  const addOrReplaceShifts = useCallback((items: Shift[]) => {
    const replaceId = items[0]?.id;
    setData((current) => {
      const replaces = items.length === 1 && current.shifts.some((shift) => shift.id === replaceId);
      return {
        ...current,
        shifts: replaces
          ? current.shifts.map((shift) => shift.id === replaceId ? items[0] : shift)
          : [...current.shifts, ...items],
      };
    });
  }, []);

  const languageChanged = useCallback((value: Language) => update({ language: value }), [update]);
  const currentPage = page === 'Onboarding' && !data.onboarded
    ? 'Onboarding'
    : page;
  const content = (() => {
    switch (currentPage) {
      case 'Onboarding':
        return (
          <Onboarding
            profile={data.profile}
            language={language}
            onLanguage={languageChanged}
            onContinue={(profile) => {
              update({ profile, onboarded: true });
              setPage('Dashboard');
            }}
            onReadLimits={() => setPage('Limits')}
            onExample={(example) => {
              const fresh = example === 'lena' ? createLenaState() : createDemoState();
              setData({ ...fresh, language: data.language, darkMode: data.darkMode, onboarded: true });
              setPage('Dashboard');
            }}
          />
        );
      case 'Dashboard':
        return (
          <Dashboard
            data={data}
            language={language}
            onNavigate={setPage}
            onAddShift={addOrReplaceShifts}
            onShiftCheck={() => setCheckOpen(true)}
            features={features}
            syncNotice={syncNotice}
            onDismissSync={() => setSyncNotice('')}
          />
        );
      case 'Shifts':
        return <ShiftsPage data={data} language={language} onUpdate={(shifts) => update({ shifts })} onImport={() => setPage('Import')} />;
      case 'Import':
        return <ImportPage data={data} language={language} onUpdate={update} onDone={() => setPage('Shifts')} />;
      case 'Jobs':
        return <JobsPage data={data} language={language} features={features} onUpdate={(jobs) => update({ jobs, shifts: data.shifts.filter((shift) => jobs.some((job) => job.id === shift.jobId)) })} />;
      case 'Limits':
        return <LimitsPage language={language} profile={data.profile} />;
      case 'More':
        return <MorePage language={language} features={features} onNavigate={setPage} />;
      case 'Settings':
        return (
          <SettingsPage
            data={data}
            language={language}
            features={flags}
            advancedMode={advancedMode}
            onAdvanced={changeAdvanced}
            onUpdate={update}
            onFeatureUpdate={setFeatures}
            onNavigate={setPage}
            onReset={() => {
              if (data.peerToken) void fetch('/api/peer-opt-in/' + encodeURIComponent(data.peerToken), { method: 'DELETE' }).catch(() => undefined);
              const fresh = createDemoState();
              setData(fresh);
              setPage('Onboarding');
            }}
            onDelete={async () => {
              const fresh = createDemoState();
              fresh.profile = { status: 'Student', age: 0, familyInsured: false, bafoeg: false, hasMainJob: false, semesterPeriods: [] };
              fresh.jobs = [];
              fresh.shifts = [];
              fresh.dismissedRecommendations = [];
              fresh.peerOptIn = false;
              fresh.peerToken = undefined;
              fresh.isPremium = false;
              fresh.onboarded = false;
              if (data.peerToken) {
                try {
                  await fetch('/api/peer-opt-in/' + encodeURIComponent(data.peerToken), { method: 'DELETE' });
                } catch {
                  // Local data is cleared even when the optional demo server is unavailable.
                }
              }
              setFeatures({ ...defaultFeatures });
              setAdvancedMode(false);
              try {
                localStorage.removeItem('headroom-features');
                localStorage.removeItem('headroom-advanced');
              } catch {
                // Optional demo flags must not block local data deletion.
              }
              await clearLocalState();
              setData(fresh);
              setPage('Onboarding');
            }}
          />
        );
      case 'Trends':
        return <TrendsPage data={data} language={language} />;
      case 'WageCheck':
        return <WageCheckPage data={data} language={language} />;
      case 'Developer':
        return advancedMode
          ? <DeveloperPage language={language} features={flags} onChange={setFeatures} />
          : <MorePage language={language} features={features} onNavigate={setPage} />;
      case 'JobBoard':
        return features.jobBoard
          ? <JobBoardPage data={data} language={language} />
          : <MorePage language={language} features={features} onNavigate={setPage} />;
      case 'PeerStats':
        return features.peerStats
          ? <PeerStatsPage data={data} language={language} onUpdate={update} />
          : <MorePage language={language} features={features} onNavigate={setPage} />;
      case 'Premium':
        return features.premium
          ? <PremiumPage data={data} language={language} onUpdate={update} />
          : <MorePage language={language} features={features} onNavigate={setPage} />;
    }
  })();

  return (
    <div className={'app-frame' + (data.darkMode ? ' theme-dark' : '')}>
      <a className="skip-link" href="#main-content">{t(language, 'skip')}</a>
      <AppHeader
        language={language}
        onLanguage={languageChanged}
        onHome={() => setPage(data.onboarded ? 'Dashboard' : 'Onboarding')}
      />
      <main id="main-content" className="app-content">
        {!ready ? (
          <div className="loading-shell" role="status">{t(language, 'preparingApp')}</div>
        ) : (
          <ErrorBoundary language={language} resetKey={currentPage}>
            <Suspense fallback={<div className="loading-shell" role="status">{t(language, 'loadingView')}</div>}>
              {content}
              {currentPage === 'Dashboard' && data.profile.age >= consentAgeRule.minimumAge && features.partnerRecommendations && <div className="partner-wrap"><PartnerPanel data={data} language={language} onUpdate={update} /></div>}
            </Suspense>
          </ErrorBoundary>
        )}
        {!ready && <span className="sr-only">{t(language, 'infoOnly')}</span>}
      </main>
      {ready && data.onboarded && <Navigation language={language} current={page} onNavigate={setPage} />}
      <AppFooter language={language} />
      {checkOpen && <ShiftCheckDialog data={data} language={language} onClose={() => setCheckOpen(false)} />}
    </div>
  );
}

export default App;
