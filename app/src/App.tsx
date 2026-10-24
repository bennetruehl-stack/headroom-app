import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  activeLimits,
  annualIncomeProjection,
  annualProjectionBreakdown,
  annualMiniProjection,
  companyPlausibility,
  employeeMiniJobStatus,
  isInLecturePeriod,
  hoursInWeek,
  limitValue,
  monthlyIncomeForLimit,
  monthlySummary,
  peerMedian,
  peerWagePosition,
  recommendationLevel,
  shortDays,
  shiftCheck,
  wageBelowMinimum,
  workingHoursCheck,
  consentAgeRule,
  earnings,
  limitsForYear,
  statusFor,
  type Job,
  type Limit,
  type Profile,
  type ProfileStatus,
  type Shift,
} from '@headroom/core';
import { jobPresets } from '@headroom/core/data/jobPresets';
import { references } from '@headroom/core/data/references';
import { demoListings, demoPartners, demoPeerRows } from './mock/data';
import { defaultFeatures, type FeatureName } from './config/features';
import { t, type Language, type MessageKey } from './i18n/translations';
import {
  clearLocalState,
  createDemoState,
  loadState,
  normalizeState,
  saveState,
  type AppState,
} from './lib/storage';

type Screen =
  | 'Onboarding'
  | 'Dashboard'
  | 'Shifts'
  | 'Jobs'
  | 'Limits'
  | 'More'
  | 'Settings'
  | 'Trends'
  | 'WageCheck'
  | 'Developer'
  | 'JobBoard'
  | 'PeerStats'
  | 'Premium'
  | 'Scan';

const profileChoices: { value: ProfileStatus; key: MessageKey }[] = [
  { value: 'Student', key: 'profileStudent' },
  { value: 'Working student', key: 'profileWorking' },
  { value: 'Mini-jobber', key: 'profileMini' },
  { value: 'Employee', key: 'profileEmployee' },
  { value: 'Pupil', key: 'profilePupil' },
];

const employmentTypes: { value: Job['type']; key: MessageKey }[] = [
  { value: 'mini-job', key: 'typeMini' },
  { value: 'short-term', key: 'typeShort' },
  { value: 'working student', key: 'typeWorking' },
  { value: 'regular', key: 'typeRegular' },
];

const featureLabels: Record<FeatureName, MessageKey> = {
  scheduleScan: 'featureSchedule',
  jobBoard: 'featureBoard',
  partnerRecommendations: 'featurePartners',
  premium: 'featurePremium',
  peerStats: 'featurePeers',
  osmCompanyCheck: 'featureOsm',
};

function localToday(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

let lastOsmLookupAt = 0;

function id(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}

function money(value: number, language: Language): string {
  return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function preciseMoney(value: number, language: Language): string {
  return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function dateText(value: string, language: Language): string {
  const date = new Date(value + 'T12:00:00');
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function statusKey(value: 'Safe' | 'Close' | 'Over'): MessageKey {
  if (value === 'Safe') return 'safe';
  if (value === 'Close') return 'close';
  return 'over';
}

function limitName(limit: Limit, language: Language): string {
  return language === 'en' ? limit.name_en ?? limit.name : limit.name;
}

// Interne Prüfnotizen (limit.reviewNote) werden hier bewusst nie verwendet.
function limitConsequence(limit: Limit, language: Language): string {
  const text = language === 'en' ? limit.consequence_en ?? limit.consequence : limit.consequence;
  return text || t(language, 'valuePending');
}

function limitSourceName(limit: Limit, language: Language): string {
  return limit.sourceName || t(language, 'sourcePending');
}

function companyErrorMessage(code: string | undefined, language: Language): string {
  if (code === 'tooShort') return t(language, 'companyTooShort');
  if (code === 'digitsOnly') return t(language, 'companyDigits');
  return t(language, 'companyMash');
}

function getAgeBoundary(limit: Limit | undefined): number | null {
  const boundary = limit?.condition?.match(/age\s*<\s*(\d+)/i)?.[1];
  return boundary ? Number(boundary) : null;
}

function withLocalDate(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function hoursFromTimes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  let minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
}

function getFeatureFlags(): Record<FeatureName, boolean> {
  try {
    const stored = localStorage.getItem('headroom-features');
    return stored
      ? { ...defaultFeatures, ...JSON.parse(stored) }
      : { ...defaultFeatures };
  } catch {
    return { ...defaultFeatures };
  }
}

function AppHeader({
  language,
  onHome,
  onLanguage,
}: {
  language: Language;
  onHome: () => void;
  onLanguage: (language: Language) => void;
}) {
  return (
    <header className="app-header">
      <button className="brand-mark" type="button" onClick={onHome} aria-label={t(language, 'brand')}>
        <span className="brand-symbol" aria-hidden="true">h<span>·</span></span>
        <span className="brand-word">{t(language, 'brand')}</span>
      </button>
      <label className="language-select">
        <span className="sr-only">{t(language, 'chooseLanguage')}</span>
        <select value={language} onChange={(event) => onLanguage(event.target.value as Language)}>
          <option value="de">{t(language, 'languageGerman')}</option>
          <option value="en">{t(language, 'languageEnglish')}</option>
        </select>
      </label>
    </header>
  );
}

function AppFooter({ language }: { language: Language }) {
  return <footer className="app-footer">{t(language, 'infoOnly')}</footer>;
}

function StatusBadge({
  status,
  language,
}: {
  status: 'Safe' | 'Close' | 'Over';
  language: Language;
}) {
  return (
    <span className={'status-badge status-' + status.toLowerCase()}>
      <span className="status-dot" aria-hidden="true" />
      {t(language, statusKey(status))}
    </span>
  );
}

function ProgressBar({
  ratio,
  label,
}: {
  ratio: number;
  label: string;
}) {
  return (
    <div
      className="progress-track"
      data-level={statusFor(ratio).toLowerCase()}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.max(0, Math.min(100, Math.round(ratio * 100)))}
    >
      <span style={{ width: Math.max(0, Math.min(100, ratio * 100)) + '%' }} />
    </div>
  );
}

function SourceStamp({ limit, language }: { limit: Limit; language: Language }) {
  return (
    <small className="source-stamp">
      {t(language, 'source')}: {limit.sourceUrl
        ? <a href={limit.sourceUrl} target="_blank" rel="noreferrer">{limitSourceName(limit, language)}</a>
        : limitSourceName(limit, language)}
      {' · '}{t(language, 'asOf', { date: dateText(limit.asOf, language) })}
    </small>
  );
}

function RadioChoice({
  checked,
  title,
  onClick,
}: {
  checked: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      className={'radio-choice' + (checked ? ' is-selected' : '')}
      type="button"
      aria-pressed={checked}
      onClick={onClick}
    >
      <span className="radio-indicator" aria-hidden="true" />
      <span>{title}</span>
    </button>
  );
}

function Onboarding({
  profile,
  language,
  onLanguage,
  onContinue,
  onReadLimits,
}: {
  profile: Profile;
  language: Language;
  onLanguage: (language: Language) => void;
  onContinue: (profile: Profile) => void;
  onReadLimits: () => void;
}) {
  const [draft, setDraft] = useState<Profile>(profile);
  const update = (values: Partial<Profile>) => setDraft((current) => ({ ...current, ...values }));
  const currentPeriod = draft.semesterPeriods?.[0] ?? { start: '', end: '' };
  const setSemester = (key: 'start' | 'end', value: string) =>
    update({
      semesterPeriods: [
        { ...currentPeriod, [key]: value },
        ...(draft.semesterPeriods ?? []).slice(1),
      ],
    });

  return (
    <section className="onboarding page-enter" aria-labelledby="onboarding-title">
      <div className="onboarding-intro">
        <p className="eyebrow">{t(language, 'onboardingKicker')}</p>
        <h1 id="onboarding-title">{t(language, 'onboardingTitle')}</h1>
        <p>{t(language, 'onboardingIntro')}</p>
      </div>

      <div className="surface onboarding-panel">
        <h2>{t(language, 'onboardingProfile')}</h2>
        <div className="choice-grid">
          {profileChoices.map((choice) => (
            <RadioChoice
              key={choice.value}
              checked={draft.status === choice.value}
              title={t(language, choice.key)}
              onClick={() => update({ status: choice.value })}
            />
          ))}
        </div>

        <div className="form-grid onboarding-fields">
          <label className="field">
            <span>{t(language, 'age')}</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="120"
              value={draft.age}
              onChange={(event) => update({ age: Math.max(0, Number(event.target.value)) })}
            />
          </label>

          {(draft.status === 'Student' ||
            draft.status === 'Working student' ||
            draft.status === 'Mini-jobber' ||
            draft.status === 'Pupil') && (
            <fieldset className="toggle-field">
              <legend>{t(language, 'familyInsured')}</legend>
              <div className="segmented">
                <button
                  type="button"
                  aria-pressed={draft.familyInsured}
                  className={draft.familyInsured ? 'selected' : ''}
                  onClick={() => update({ familyInsured: true })}
                >
                  {t(language, 'yes')}
                </button>
                <button
                  type="button"
                  aria-pressed={!draft.familyInsured}
                  className={!draft.familyInsured ? 'selected' : ''}
                  onClick={() => update({ familyInsured: false })}
                >
                  {t(language, 'no')}
                </button>
              </div>
            </fieldset>
          )}

          {(draft.status === 'Student' ||
            draft.status === 'Working student' ||
            draft.status === 'Pupil') && (
            <fieldset className="toggle-field">
              <legend>{t(language, 'bafoeg')}</legend>
              <div className="segmented">
                <button
                  type="button"
                  aria-pressed={draft.bafoeg}
                  className={draft.bafoeg ? 'selected' : ''}
                  onClick={() => update({ bafoeg: true })}
                >
                  {t(language, 'yes')}
                </button>
                <button
                  type="button"
                  aria-pressed={!draft.bafoeg}
                  className={!draft.bafoeg ? 'selected' : ''}
                  onClick={() => update({ bafoeg: false })}
                >
                  {t(language, 'no')}
                </button>
              </div>
            </fieldset>
          )}

          {draft.status === 'Working student' && (
            <fieldset className="wide-fieldset">
              <legend>{t(language, 'lecturePeriod')}</legend>
              <div className="form-grid two-columns">
                <label className="field">
                  <span>{t(language, 'lectureStart')}</span>
                  <input
                    type="date"
                    value={currentPeriod.start}
                    onChange={(event) => setSemester('start', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{t(language, 'lectureEnd')}</span>
                  <input
                    type="date"
                    value={currentPeriod.end}
                    onChange={(event) => setSemester('end', event.target.value)}
                  />
                </label>
              </div>
            </fieldset>
          )}

          {draft.status === 'Employee' && (
            <fieldset className="toggle-field">
              <legend>{t(language, 'mainJob')}</legend>
              <div className="segmented">
                <button
                  type="button"
                  aria-pressed={draft.hasMainJob !== false}
                  className={draft.hasMainJob !== false ? 'selected' : ''}
                  onClick={() => update({ hasMainJob: true })}
                >
                  {t(language, 'yes')}
                </button>
                <button
                  type="button"
                  aria-pressed={draft.hasMainJob === false}
                  className={draft.hasMainJob === false ? 'selected' : ''}
                  onClick={() => update({ hasMainJob: false })}
                >
                  {t(language, 'no')}
                </button>
              </div>
            </fieldset>
          )}
        </div>

        {draft.age < consentAgeRule.minimumAge && (
          <p className="notice notice-neutral">{t(language, 'optInsBlocked')}</p>
        )}

        <button className="button button-primary button-wide" type="button" onClick={() => onContinue(draft)}>
          {t(language, 'start')}
          <span aria-hidden="true">↗</span>
        </button>
        <button className="text-button" type="button" onClick={onReadLimits}>
          {t(language, 'readLimits')}
        </button>
      </div>
    </section>
  );
}

function calculateAnnualProjection(
  shifts: Shift[],
  jobs: Job[],
  year: number,
  types: Job['type'][],
): number {
  const now = localToday();
  const month = Number(now.slice(0, 4)) === year ? Number(now.slice(5, 7)) : 12;
  return annualIncomeProjection(shifts, jobs, year, types, month);
}

function monthlyAmountForLimit(
  limit: Limit,
  profile: Profile,
  jobs: Job[],
  shifts: Shift[],
  month: string,
  year: number,
): { total: number; cap: number } | null {
  if (!limit.value || !limit.verified) return null;
  let total = monthlyIncomeForLimit(shifts, jobs, limit.id, month);
  let cap = limit.value;
  if (limit.id === 'familyInsurance') {
    const hasNonMiniIncome = shifts.some((shift) => {
      if (!shift.date.startsWith(month)) return false;
      const job = jobs.find((entry) => entry.id === shift.jobId);
      return job && job.type !== 'mini-job' && shift.hours > 0;
    });
    const onlyMiniJobs = !hasNonMiniIncome;
    if (onlyMiniJobs) cap = limitValue('miniJobMonthly', year);
    else {
      total = shifts.reduce((sum, shift) => {
        if (!shift.date.startsWith(month)) return sum;
        const job = jobs.find((entry) => entry.id === shift.jobId);
        if (!job) return sum;
        return sum + Math.max(0, shift.hours) * job.wage + Math.max(0, shift.surchargeAmount ?? 0);
      }, 0);
    }
  }
  return { total, cap };
}

function Dashboard({
  data,
  language,
  onNavigate,
  onAddShift,
  onShiftCheck,
  features,
}: {
  data: AppState;
  language: Language;
  onNavigate: (screen: Screen) => void;
  onAddShift: (shifts: Shift[]) => void;
  onShiftCheck: () => void;
  features: Record<FeatureName, boolean>;
}) {
  const today = localToday();
  const month = today.slice(0, 7);
  const year = Number(today.slice(0, 4));
  const yearLimits = activeLimits(data.profile, year);
  const monthlyLimits = yearLimits.filter((limit) => limit.period === 'month');
  const monthlySummaries = monthlyLimits.map((limit) => {
    const value = monthlyAmountForLimit(limit, data.profile, data.jobs, data.shifts, month, year);
    return { limit, value };
  });
  const measured = monthlySummaries
    .filter((item): item is { limit: Limit; value: { total: number; cap: number } } => item.value !== null)
    .map((item) => ({
      ...item,
      ratio: item.value.cap > 0 ? item.value.total / item.value.cap : 0,
    }));
  const strictest = measured.reduce<(typeof measured)[number] | null>(
    (chosen, item) => (!chosen || item.ratio > chosen.ratio ? item : chosen),
    null,
  );

  const miniMonthly = monthlyIncomeForLimit(data.shifts, data.jobs, 'miniJobMonthly', month);
  const monthSummary = strictest
    ? monthlySummary(strictest.value.total, strictest.value.cap, limitValue('minimumWage', year))
    : monthlySummary(miniMonthly, limitValue('miniJobMonthly', year), limitValue('minimumWage', year));
  const annualMiniBreakdown = annualProjectionBreakdown(
    data.shifts,
    data.jobs,
    year,
    ['mini-job'],
    Number(today.slice(5, 7)),
  );
  const annualMini = annualMiniBreakdown.projected;
  const yearlyMiniCap = limitValue('miniJobYearly', year);
  const annualRegular = calculateAnnualProjection(data.shifts, data.jobs, year, [
    'regular',
    'working student',
  ]);
  const taxLimit = limitValue('incomeTaxThreshold', year);
  const shortTermShifts = data.shifts.filter(
    (shift) => data.jobs.find((job) => job.id === shift.jobId)?.type === 'short-term',
  );
  const daysUsed = shortDays(shortTermShifts, year);
  const familyLimit = limitsForYear(year).find((limit) => limit.id === 'familyInsurance');
  const familyAge = getAgeBoundary(familyLimit);
  const hasNonMiniIncome = data.shifts.some((shift) => {
    if (!shift.date.startsWith(month)) return false;
    const job = data.jobs.find((entry) => entry.id === shift.jobId);
    return Boolean(job && job.type !== 'mini-job' && shift.hours > 0);
  });
  const pureMiniJobs = !hasNonMiniIncome;
  const familyCap = pureMiniJobs ? limitValue('miniJobMonthly', year) : familyLimit?.value ?? 0;
  const familyMonthTotal = data.shifts.reduce((sum, shift) => {
    if (!shift.date.startsWith(month)) return sum;
    const job = data.jobs.find((entry) => entry.id === shift.jobId);
    return sum + (job ? Math.max(0, shift.hours) * job.wage : 0);
  }, 0);

  return (
    <div className="page-enter">
      <section className="page-heading dashboard-heading">
        <div>
        <p className="eyebrow">{t(language, 'welcomeKicker')}</p>
          <h1>{t(language, 'welcomeTitle')}</h1>
        </div>
        <time className="date-stamp" dateTime={today}>{dateText(today, language)}</time>
      </section>

      <DashboardMetrics
        data={data}
        language={language}
        month={month}
        year={year}
        strictest={strictest}
        monthSummary={monthSummary}
        monthlySummaries={monthlySummaries}
        annualMini={annualMini}
        annualMiniBreakdown={annualMiniBreakdown}
        yearlyMiniCap={yearlyMiniCap}
        annualRegular={annualRegular}
        taxLimit={taxLimit}
        daysUsed={daysUsed}
        features={features}
        onShiftCheck={onShiftCheck}
        onAddShift={onAddShift}
        onNavigate={onNavigate}
        familyAge={familyAge}
        familyCap={familyCap}
        familyMonthTotal={familyMonthTotal}
      />
    </div>
  );
}

function DashboardMetrics({
  data,
  language,
  month,
  year,
  strictest,
  monthSummary,
  monthlySummaries,
  annualMini,
  annualMiniBreakdown,
  yearlyMiniCap,
  annualRegular,
  taxLimit,
  daysUsed,
  onShiftCheck,
  onAddShift,
  onNavigate,
  familyAge,
  familyCap,
  familyMonthTotal,
}: {
  data: AppState;
  language: Language;
  month: string;
  year: number;
  strictest: { limit: Limit; value: { total: number; cap: number }; ratio: number } | null;
  monthSummary: ReturnType<typeof monthlySummary>;
  monthlySummaries: { limit: Limit; value: { total: number; cap: number } | null }[];
  annualMini: number;
  annualMiniBreakdown: ReturnType<typeof annualProjectionBreakdown>;
  yearlyMiniCap: number;
  annualRegular: number;
  taxLimit: number;
  daysUsed: number;
  features: Record<FeatureName, boolean>;
  onShiftCheck: () => void;
  onAddShift: (shifts: Shift[]) => void;
  onNavigate: (screen: Screen) => void;
  familyAge: number | null;
  familyCap: number;
  familyMonthTotal: number;
}) {
  const [period, setPeriod] = useState<'month' | 'year' | 'season'>('month');
  const [showShiftForm, setShowShiftForm] = useState(false);
  const monthLimitText = strictest ? limitName(strictest.limit, language) : t(language, 'miniJobCap');
  const miniMonthCap = limitValue('miniJobMonthly', year);
  const annualMiniRecord = limitsForYear(year).find((limit) => limit.id === 'miniJobYearly');
  const taxLimitRecord = limitsForYear(year).find((limit) => limit.id === 'incomeTaxThreshold');
  const shortTermRecord = limitsForYear(year).find((limit) => limit.id === 'shortTermEmployment');
  const monthOverYearSafe =
    miniMonthCap > 0 &&
    monthlyIncomeForLimit(data.shifts, data.jobs, 'miniJobMonthly', month) > miniMonthCap &&
    annualMini <= yearlyMiniCap;

  return (
    <>
      <div className="segmented dashboard-tabs" aria-label={t(language, 'currentMonth')}>
        {(['month', 'year', 'season'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={period === tab ? 'selected' : ''}
            aria-pressed={period === tab}
            onClick={() => setPeriod(tab)}
          >
            {t(language, tab)}
          </button>
        ))}
      </div>

      {period === 'month' && (
        <>
          <section className="surface hero-metric">
            <div className="metric-topline">
              <div>
                <p className="metric-label">{monthLimitText} · {t(language, 'currentMonth')}</p>
                <p className="metric-caption">{t(language, 'leftThisMonth')}</p>
              </div>
              <StatusBadge status={monthSummary.status} language={language} />
            </div>
            <div className="metric-number">{money(monthSummary.remaining, language)}</div>
            <div className="metric-caption">{t(language, 'hoursApprox', { hours: Math.round(monthSummary.hours) })}</div>
            <ProgressBar ratio={monthSummary.ratio} label={t(language, 'progress')} />
            <div className="metric-foot">
              <span>{t(language, 'usedOf', { used: money(monthSummary.total, language), limit: money(strictest?.value.cap ?? miniMonthCap, language) })}</span>
              {strictest
                ? <SourceStamp limit={strictest.limit} language={language} />
                : (() => {
                    const sourceLimit = limitsForYear(year).find((limit) => limit.id === 'miniJobMonthly');
                    return sourceLimit ? <SourceStamp limit={sourceLimit} language={language} /> : null;
                  })()}
            </div>
          </section>

          {monthOverYearSafe && (
            <div className="notice notice-lime">
              {t(language, 'monthOverYearSafe', { cap: miniMonthCap })}
            </div>
          )}

          <section className="content-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t(language, 'progress')}</p>
                <h2>{t(language, 'monthlyLimits')}</h2>
              </div>
              <span className="small-count">{monthlySummaries.length.toString().padStart(2, '0')}</span>
            </div>
            {monthlySummaries.length === 0 && <p className="muted">{t(language, 'noLimits')}</p>}
            <div className="limit-progress-list">
              {monthlySummaries.map(({ limit, value }) => {
                const ratio = value && value.cap ? value.total / value.cap : 0;
                return (
                  <article className="limit-progress-item" key={limit.id}>
                    <div className="limit-row">
                      <div>
                        <strong>{limitName(limit, language)}</strong>
                        <SourceStamp limit={limit} language={language} />
                      </div>
                      {limit.verified && value ? (
                        <span className="limit-amount">{money(value.total, language)} <i>/ {money(value.cap, language)}</i></span>
                      ) : (
                        <span className="pill-unverified">{t(language, 'unverified')}</span>
                      )}
                    </div>
                    {limit.verified && value && (
                      <ProgressBar ratio={ratio} label={limitName(limit, language)} />
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <button className="button button-dark button-wide shift-check-cta" type="button" onClick={onShiftCheck}>
            <span>{t(language, 'shiftCheck')}</span><span aria-hidden="true">↗</span>
          </button>
        </>
      )}

      {period === 'year' && (
        <section className="surface year-panel">
          <div className="metric-topline">
            <div>
              <p className="eyebrow">{year}</p>
              <h2>{t(language, 'annualMiniJobs')}</h2>
            </div>
            <StatusBadge
              status={yearlyMiniCap > 0 ? monthlySummary(annualMini, yearlyMiniCap).status : 'Safe'}
              language={language}
            />
          </div>
          <div className="metric-number">{money(annualMini, language)}</div>
          <p className="metric-caption">{t(language, 'projection')} · {t(language, 'annualLimit')}: {money(yearlyMiniCap, language)}</p>
          {annualMiniRecord && <SourceStamp limit={annualMiniRecord} language={language} />}
          <ProgressBar ratio={yearlyMiniCap > 0 ? annualMini / yearlyMiniCap : 0} label={t(language, 'annualMiniJobs')} />
          <details className="method-details">
            <summary>{t(language, 'projectionMethod').split('.')[0]}</summary>
            <p>{t(language, 'projectionMethod')}</p>
          </details>
          <div className="tax-reference">
            <div>
              <strong>{t(language, 'approximateTaxThreshold')}</strong>
              <p>{t(language, 'taxThresholdNote')}</p>
              {taxLimitRecord && <SourceStamp limit={taxLimitRecord} language={language} />}
            </div>
            <span className="tax-reference-value">{taxLimitRecord?.value === null || !taxLimitRecord ? '–' : money(taxLimit, language)}{taxLimitRecord && !taxLimitRecord.verified && <span className="pill-unverified">{t(language, 'unverified')}</span>}</span>
          </div>
          <div className="annual-breakdown">
            <div><span>{t(language, 'actualSoFar')}</span><strong>{money(annualMiniBreakdown.actual, language)}</strong></div>
            <div><span>{t(language, 'planned')}</span><strong>{money(annualMiniBreakdown.planned, language)}</strong></div>
            <div><span>{t(language, 'projectedEstimate')}</span><strong>{money(annualMiniBreakdown.averagePastMonth * annualMiniBreakdown.remainingMonths, language)}</strong></div>
          </div>
          {annualRegular > 0 && (
            <p className="notice notice-neutral">
                {t(language, 'annualRegularWages')}: {money(annualRegular, language)}
            </p>
          )}
        </section>
      )}

      {period === 'season' && (
        <section className="surface season-panel">
          <p className="eyebrow">{year}</p>
          <h2>{t(language, 'seasonDays')}</h2>
          <div className="metric-number season-number">
            {daysUsed}<span> / {limitValue('shortTermEmployment', year)}</span>
          </div>
          <p className="metric-caption">
            {t(language, 'daysOf', { used: daysUsed, limit: limitValue('shortTermEmployment', year) })}
          </p>
          <ProgressBar
            ratio={daysUsed / Math.max(1, limitValue('shortTermEmployment', year))}
            label={t(language, 'seasonDays')}
          />
          {shortTermRecord && <SourceStamp limit={shortTermRecord} language={language} />}
          {daysUsed > limitValue('shortTermEmployment', year) && (
            <StatusBadge status="Over" language={language} />
          )}
        </section>
      )}

      <section className="content-section jobs-overview">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t(language, 'yourJobs')}</p>
            <h2>{data.jobs.length.toString().padStart(2, '0')}</h2>
          </div>
          <button className="text-button" type="button" onClick={() => onNavigate('Jobs')}>
            {t(language, 'manageJobs')} <span aria-hidden="true">↗</span>
          </button>
        </div>
        {data.jobs.length === 0 ? (
          <div className="empty-panel">{t(language, 'noJobs')}</div>
        ) : (
          data.jobs.map((job) => (
            <article className="job-summary" key={job.id}>
              <span className="job-bullet" aria-hidden="true" />
              <div className="job-summary-main">
                <strong>{job.title}</strong>
                <small>{job.company || employmentLabel(job.type, language)}{job.city ? ' · ' + job.city : ''}</small>
              </div>
              <span>{preciseMoney(job.wage, language)}<small>/{t(language, 'hourShort')}</small></span>
            </article>
          ))
        )}
      </section>

      <div className="action-row">
        <button className="button button-primary" type="button" onClick={() => setShowShiftForm((value) => !value)}>
          {t(language, 'logShift')} <span aria-hidden="true">+</span>
        </button>
        <button className="button button-quiet" type="button" onClick={() => onNavigate('Limits')}>
          {t(language, 'limits')} <span aria-hidden="true">↗</span>
        </button>
      </div>

      {showShiftForm && (
        <section className="surface form-surface">
          <div className="section-heading">
            <div><p className="eyebrow">{t(language, 'quickEntry')}</p><h2>{t(language, 'logShift')}</h2></div>
            <button className="icon-button" type="button" aria-label={t(language, 'closeDialog')} onClick={() => setShowShiftForm(false)}>×</button>
          </div>
          <ShiftForm
            jobs={data.jobs}
            language={language}
            onCancel={() => setShowShiftForm(false)}
            onSave={(items) => { onAddShift(items); setShowShiftForm(false); }}
          />
        </section>
      )}

      <InformationCards
        data={data}
        language={language}
        familyAge={familyAge}
        familyCap={familyCap}
        familyMonthTotal={familyMonthTotal}
      />
    </>
  );
}

function employmentLabel(type: Job['type'], language: Language): string {
  const entry = employmentTypes.find((item) => item.value === type);
  return entry ? t(language, entry.key) : type;
}

function InformationCards({
  data,
  language,
  familyAge,
  familyCap,
  familyMonthTotal,
}: {
  data: AppState;
  language: Language;
  familyAge: number | null;
  familyCap: number;
  familyMonthTotal: number;
}) {
  const regularJobCount = data.jobs.filter((job) => job.type === 'regular').length;
  const showTaxInfo = regularJobCount > 1;
  const showFamilyInfo =
    data.profile.familyInsured &&
    (familyAge !== null && data.profile.age >= familyAge ||
      familyCap > 0 && familyMonthTotal > familyCap);
  const youthLimit = limitsForYear(Number(localToday().slice(0, 4))).find((limit) => limit.id === 'youthWorkProtection');
  const youthAge = getAgeBoundary(youthLimit);
  const showYouthInfo = data.profile.status === 'Pupil' && youthAge !== null && data.profile.age < youthAge;
  return (
    <section className="info-card-list">
      {showTaxInfo && (
        <article className="notice notice-neutral">
          <span className="info-mark" aria-hidden="true">i</span>
          <p>{t(language, 'taxClassInfo')} <a href="https://www.elster.de/" target="_blank" rel="noreferrer">ELSTER</a></p>
        </article>
      )}
      {showFamilyInfo && (
        <article className="notice notice-neutral">
          <span className="info-mark" aria-hidden="true">i</span>
          <p>{t(language, 'familyInfo')}</p>
        </article>
      )}
      {showYouthInfo && youthLimit && (
        <article className="notice notice-amber">
          <span className="info-mark" aria-hidden="true">i</span>
          <div>
            <strong>{language === 'de' ? youthLimit.name : youthLimit.name_en}</strong>
            <p>{limitConsequence(youthLimit, language)}</p>
            <span className="pill-unverified">{t(language, 'unverified')}</span>
          </div>
        </article>
      )}
      <article className="notice notice-neutral">
        <span className="info-mark" aria-hidden="true">i</span>
        <div><strong>{t(language, 'employmentInfoTitle')}</strong><p>{t(language, 'employmentInfo')}</p></div>
      </article>
    </section>
  );
}

function ShiftForm({
  jobs,
  language,
  initial,
  onSave,
  onCancel,
}: {
  jobs: Job[];
  language: Language;
  initial?: Shift;
  onSave: (shifts: Shift[]) => void;
  onCancel?: () => void;
}) {
  const [jobId, setJobId] = useState(initial?.jobId ?? jobs[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? localToday());
  const [hours, setHours] = useState(initial?.hours ? String(initial.hours) : '');
  const [start, setStart] = useState(initial?.startTime ?? '');
  const [end, setEnd] = useState(initial?.endTime ?? '');
  const [planned, setPlanned] = useState(Boolean(initial?.planned));
  const [weekly, setWeekly] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setJobId(initial?.jobId ?? jobs[0]?.id ?? '');
    setDate(initial?.date ?? localToday());
    setHours(initial?.hours ? String(initial.hours) : '');
    setStart(initial?.startTime ?? '');
    setEnd(initial?.endTime ?? '');
    setPlanned(Boolean(initial?.planned));
  }, [initial, jobs]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const job = jobs.find((item) => item.id === jobId);
    if (!job) {
      setError(t(language, 'noJob'));
      return;
    }
    const duration = start && end ? hoursFromTimes(start, end) : Number(hours);
    if (!date || !Number.isFinite(duration) || duration <= 0) {
      setError(t(language, 'shiftValidation'));
      return;
    }
    const surchargeAmount = duration * job.wage * Math.max(0, job.surcharges ?? 0) / 100;
    const result: Shift[] = [];
    const count = weekly && !initial ? 12 : 1;
    const firstDate = new Date(date + 'T12:00:00');
    for (let index = 0; index < count; index += 1) {
      const shiftDate = new Date(firstDate);
      shiftDate.setDate(firstDate.getDate() + index * 7);
      const dated = withLocalDate(shiftDate);
      if (job.endDate && dated > job.endDate) break;
      result.push({
        id: initial?.id ?? id(),
        jobId,
        date: dated,
        hours: duration,
        startTime: start || undefined,
        endTime: end || undefined,
        planned,
        days: job.type === 'short-term' ? 1 : undefined,
        surchargeAmount,
        tips: job.tipsEnabled ? job.tips ?? 0 : undefined,
        recurring: weekly ? 'weekly' : undefined,
      });
    }
    setError('');
    onSave(result);
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <label className="field">
        <span>{t(language, 'selectJob')}</span>
        <select value={jobId} onChange={(event) => setJobId(event.target.value)} required>
          {jobs.map((job) => <option value={job.id} key={job.id}>{job.title}</option>)}
        </select>
      </label>
      <label className="field">
        <span>{t(language, 'shiftDate')}</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
      </label>
      <div className="form-grid two-columns">
        <label className="field">
          <span>{t(language, 'startTime')}</span>
          <input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label className="field">
          <span>{t(language, 'endTime')}</span>
          <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>{t(language, 'hoursWorked')}</span>
        <input
          type="number"
          min="0.25"
          max="24"
          step="0.25"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          aria-describedby="shift-hours-hint"
          required={!start || !end}
        />
        <small id="shift-hours-hint">{t(language, 'exactTimeHint')}</small>
      </label>
      <label className="check-row">
        <input type="checkbox" checked={planned} onChange={(event) => setPlanned(event.target.checked)} />
        <span>{t(language, 'plannedShift')}</span>
      </label>
      {!initial && (
        <label className="check-row">
          <input type="checkbox" checked={weekly} onChange={(event) => setWeekly(event.target.checked)} />
          <span>{t(language, 'repeatWeekly')}</span>
        </label>
      )}
      {weekly && <p className="field-hint">{t(language, 'repeatHint')}</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="button button-primary" type="submit">{initial ? t(language, 'save') : t(language, 'addShift')}</button>
        {onCancel && <button className="button button-quiet" type="button" onClick={onCancel}>{t(language, 'cancel')}</button>}
      </div>
    </form>
  );
}

function ShiftsPage({
  data,
  language,
  onUpdate,
}: {
  data: AppState;
  language: Language;
  onUpdate: (shifts: Shift[]) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const ordered = [...data.shifts].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'logKicker')} title={t(language, 'shiftList')} />
      {ordered.length === 0 && <div className="empty-panel">{t(language, 'emptyState')}</div>}
      <div className="stack-list">
        {ordered.map((shift) => {
          const job = data.jobs.find((item) => item.id === shift.jobId);
          const shiftId = shift.id ?? shift.jobId + shift.date;
          const amount = job ? shift.hours * job.wage + (shift.surchargeAmount ?? 0) : 0;
          return (
            <article className="surface shift-card" key={shiftId}>
              <div className="shift-card-heading">
                <div>
                  <p className="eyebrow">{dateText(shift.date, language)}</p>
                  <h2>{job?.title ?? t(language, 'noJob')}</h2>
                </div>
                <strong>{money(amount, language)}</strong>
              </div>
              <div className="shift-metadata">
                <span>{shift.hours.toLocaleString(language === 'de' ? 'de-DE' : 'en-GB')} {t(language, 'hourShort')}</span>
                {shift.startTime && shift.endTime && <span>{shift.startTime}–{shift.endTime}</span>}
                {shift.planned && <span className="pill-subtle">{t(language, 'planned')}</span>}
                {(shift.days ?? 0) > 1 && <span>{shift.days} {t(language, 'workdayCount')}</span>}
              </div>
              {editing === shiftId ? (
                <ShiftForm
                  jobs={data.jobs}
                  language={language}
                  initial={{ ...shift, id: shiftId }}
                  onCancel={() => setEditing(null)}
                  onSave={(values) => {
                    onUpdate(data.shifts.map((item) => (item.id ?? item.jobId + item.date) === shiftId ? values[0] : item));
                    setEditing(null);
                  }}
                />
              ) : (
                <div className="card-actions">
                  <button className="text-button" type="button" onClick={() => setEditing(shiftId)}>{t(language, 'edit')}</button>
                  <button
                    className="text-button danger-text"
                    type="button"
                    onClick={() => {
                      if (window.confirm(t(language, 'confirmDelete'))) {
                        onUpdate(data.shifts.filter((item) => (item.id ?? item.jobId + item.date) !== shiftId));
                      }
                    }}
                  >
                    {t(language, 'delete')}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PageHeading({ kicker, title, trailing }: { kicker: string; title: string; trailing?: ReactNode }) {
  return (
    <div className="page-heading">
      <div><p className="eyebrow">{kicker}</p><h1>{title}</h1></div>
      {trailing}
    </div>
  );
}

function JobForm({
  language,
  initial,
  jobs,
  onSave,
  onCancel,
}: {
  language: Language;
  initial?: Job;
  jobs: Job[];
  onSave: (job: Job) => void;
  onCancel: () => void;
}) {
  const presetForInitial = jobPresets.find((preset) => preset.title_de === initial?.title || preset.title_en === initial?.title);
  const [query, setQuery] = useState('');
  const [presetId, setPresetId] = useState(presetForInitial?.id ?? jobPresets[0]?.id ?? '');
  const preset = jobPresets.find((item) => item.id === presetId);
  const [title, setTitle] = useState(initial?.title ?? (language === 'de' ? preset?.title_de ?? '' : preset?.title_en ?? ''));
  const [type, setType] = useState<Job['type']>(initial?.type ?? 'mini-job');
  const [wage, setWage] = useState(String(initial?.wage ?? limitValue('minimumWage')));
  const [startDate, setStartDate] = useState(initial?.startDate ?? localToday());
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [industry, setIndustry] = useState(initial?.industry ?? preset?.industry.wzDivision ?? '');
  const [skillLevel, setSkillLevel] = useState<Job['skillLevel']>(initial?.skillLevel ?? preset?.skillLevel ?? 1);
  const [surcharges, setSurcharges] = useState(String((initial?.surcharges ?? 0) * 100));
  const [tipsEnabled, setTipsEnabled] = useState(Boolean(initial?.tipsEnabled));
  const [tips, setTips] = useState(String(initial?.tips ?? ''));
  const [expectedWage, setExpectedWage] = useState(String(initial?.expectedWage ?? ''));
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    if (!preset || initial) return;
    setTitle(language === 'de' ? preset.title_de : preset.title_en);
    setIndustry(preset.industry.wzDivision);
    setSkillLevel(preset.skillLevel);
    setType(preset.typicalEmploymentTypes[0] ?? 'mini-job');
  }, [presetId, language]);

  const matches = jobPresets.filter((item) => {
    const haystack = [item.title_de, item.title_en, item.area, item.area_en].join(' ').toLocaleLowerCase();
    return haystack.includes(query.toLocaleLowerCase());
  });

  const validate = (event: FormEvent) => {
    event.preventDefault();
    const checked = companyPlausibility(company, jobs.map((job) => job.company ?? '').filter(Boolean));
    if (!checked.ok) {
      setError(companyErrorMessage(checked.errorCode, language));
      return;
    }
    if (!title.trim() || Number(wage) <= 0 || !startDate) {
      setError(t(language, 'jobValidation'));
      return;
    }
    setError('');
    setSuggestion(checked.suggestion ? t(language, 'companySuggestion', { name: checked.suggestion }) : '');
    onSave({
      id: initial?.id ?? id(),
      title: title.trim(),
      type,
      wage: Number(wage),
      startDate,
      endDate: endDate || undefined,
      industry: industry.trim() || undefined,
      skillLevel,
      company: checked.normalized || undefined,
      city: city.trim() || undefined,
      surcharges: Math.max(0, Number(surcharges) || 0) / 100,
      tipsEnabled,
      tips: tipsEnabled ? Math.max(0, Number(tips) || 0) : undefined,
      expectedWage: expectedWage ? Math.max(0, Number(expectedWage)) : undefined,
    });
  };

  return (
    <form className="form-grid" onSubmit={validate}>
      {!initial && (
        <label className="field">
          <span>{t(language, 'searchPreset')}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      )}
      <label className="field">
        <span>{t(language, 'jobTitle')}</span>
        {!initial && (
          <select value={presetId} onChange={(event) => setPresetId(event.target.value)}>
            {matches.map((item) => (
              <option value={item.id} key={item.id}>
                {(language === 'de' ? item.area : item.area_en) + ' · ' + (language === 'de' ? item.title_de : item.title_en)}
              </option>
            ))}
          </select>
        )}
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>

      <label className="field">
        <span>{t(language, 'employmentType')}</span>
        <select value={type} onChange={(event) => setType(event.target.value as Job['type'])}>
          {employmentTypes.map((item) => <option value={item.value} key={item.value}>{t(language, item.key)}</option>)}
        </select>
      </label>

      <div className="form-grid two-columns">
        <label className="field">
          <span>{t(language, 'hourlyWage')}</span>
          <input type="number" min="0.01" step="0.01" value={wage} onChange={(event) => setWage(event.target.value)} required />
        </label>
        <label className="field">
          <span>{t(language, 'expectedWage')}</span>
          <input type="number" min="0" step="0.01" value={expectedWage} onChange={(event) => setExpectedWage(event.target.value)} />
        </label>
      </div>

      <div className="form-grid two-columns">
        <label className="field">
          <span>{t(language, 'startDate')}</span>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </label>
        <label className="field">
          <span>{t(language, 'endDate')}</span>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
      </div>

      <label className="field">
        <span>{t(language, 'companyName')}</span>
        <input value={company} onChange={(event) => {
          setCompany(event.target.value);
          setSuggestion('');
          const result = companyPlausibility(event.target.value, jobs.map((job) => job.company ?? '').filter(Boolean));
          setError(result.ok ? '' : companyErrorMessage(result.errorCode, language));
          if (result.suggestion) setSuggestion(t(language, 'companySuggestion', { name: result.suggestion }));
        }} />
        <small>{t(language, 'companyLocal')}</small>
        {suggestion && <small className="inline-suggestion">{suggestion}</small>}
      </label>
      <label className="field">
        <span>{t(language, 'city')}</span>
        <input value={city} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" />
      </label>

      <div className="form-grid two-columns">
        <label className="field">
          <span>{t(language, 'industry')}</span>
          <input value={industry} onChange={(event) => setIndustry(event.target.value)} />
        </label>
        <label className="field">
          <span>{t(language, 'skillLevel')}</span>
          <select value={skillLevel} onChange={(event) => setSkillLevel(Number(event.target.value) as Job['skillLevel'])}>
            <option value="1">1 · {t(language, 'helperLevel')}</option>
            <option value="2">2 · {t(language, 'skilledLevel')}</option>
            <option value="3">3 · {t(language, 'specialistLevel')}</option>
            <option value="4">4 · {t(language, 'expertLevel')}</option>
          </select>
        </label>
      </div>

      <div className="form-grid two-columns">
        <label className="field">
          <span>{t(language, 'surcharges')}</span>
          <input type="number" min="0" step="1" value={surcharges} onChange={(event) => setSurcharges(event.target.value)} />
        </label>
        <label className="field">
          <span>{t(language, 'tips')}</span>
          <span className="inline-check">
            <input type="checkbox" checked={tipsEnabled} onChange={(event) => setTipsEnabled(event.target.checked)} />
            {t(language, 'yes')}
          </span>
          {tipsEnabled && <input type="number" min="0" step="0.01" value={tips} onChange={(event) => setTips(event.target.value)} />}
        </label>
      </div>
      <p className="field-hint wide-hint">{t(language, 'tipsInfo')}</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="button button-primary" type="submit">{initial ? t(language, 'updateJob') : t(language, 'createJob')}</button>
        <button className="button button-quiet" type="button" onClick={onCancel}>{t(language, 'cancel')}</button>
      </div>
    </form>
  );
}

function JobsPage({
  data,
  language,
  features,
  onUpdate,
}: {
  data: AppState;
  language: Language;
  features: Record<FeatureName, boolean>;
  onUpdate: (jobs: Job[]) => void;
}) {
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [osmLookup, setOsmLookup] = useState<Record<string, { status: 'loading' | 'found' | 'empty' | 'error'; result?: string }>>({});
  const activeEdit = data.jobs.find((job) => job.id === editing);
  const today = localToday();
  const miniJobs = data.jobs.filter((job) => job.type === 'mini-job' && job.startDate <= today && (!job.endDate || job.endDate >= today)).length;
  const employeeRule = data.profile.status === 'Employee' && data.profile.hasMainJob !== false
    ? employeeMiniJobStatus(miniJobs)
    : null;

  const checkCompanyInOsm = async (job: Job) => {
    if (!job.company || !job.city || data.profile.age < consentAgeRule.minimumAge) return;
    setOsmLookup((current) => ({ ...current, [job.id]: { status: 'loading' } }));
    try {
      const delay = Math.max(0, 1_000 - (Date.now() - lastOsmLookupAt));
      if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
      lastOsmLookupAt = Date.now();
      const query = new URLSearchParams({
        q: `${job.company}, ${job.city}, Deutschland`,
        format: 'jsonv2',
        limit: '1',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${query.toString()}`);
      if (!response.ok) throw new Error('OpenStreetMap lookup failed');
      const matches = await response.json() as { display_name?: string }[];
      setOsmLookup((current) => ({
        ...current,
        [job.id]: matches[0]?.display_name
          ? { status: 'found', result: matches[0].display_name }
          : { status: 'empty' },
      }));
    } catch {
      setOsmLookup((current) => ({ ...current, [job.id]: { status: 'error' } }));
    }
  };

  return (
    <section className="page-enter">
      <PageHeading
        kicker={t(language, 'jobsKicker')}
        title={t(language, 'jobs')}
        trailing={<button className="button button-primary" type="button" onClick={() => setEditing('new')}>{t(language, 'createJob')} <span aria-hidden="true">+</span></button>}
      />

      {employeeRule?.over && (
        <div className="notice notice-amber">
          {t(language, 'profileJobRule')}
        </div>
      )}

      {editing && (
        <section className="surface form-surface">
          <div className="section-heading">
            <div><p className="eyebrow">{t(language, editing === 'new' ? 'newEntryKicker' : 'editEntryKicker')}</p><h2>{editing === 'new' ? t(language, 'createJob') : t(language, 'updateJob')}</h2></div>
            <button className="icon-button" type="button" aria-label={t(language, 'closeDialog')} onClick={() => setEditing(null)}>×</button>
          </div>
          <JobForm
            language={language}
            initial={activeEdit}
            jobs={data.jobs}
            onCancel={() => setEditing(null)}
            onSave={(job) => {
              onUpdate(editing === 'new'
                ? [...data.jobs, job]
                : data.jobs.map((item) => item.id === job.id ? job : item));
              setEditing(null);
            }}
          />
        </section>
      )}

      {data.jobs.length === 0 && !editing && <div className="empty-panel">{t(language, 'noJobs')}</div>}
      <div className="stack-list">
        {data.jobs.map((job) => {
          const jobShifts = data.shifts.filter((shift) => shift.jobId === job.id);
          return (
            <article className="surface job-card" key={job.id}>
              <div className="job-card-top">
                <div className="job-avatar" aria-hidden="true">{job.title.slice(0, 1).toUpperCase()}</div>
                <div className="job-card-heading">
                  <p className="eyebrow">{employmentLabel(job.type, language)}</p>
                  <h2>{job.title}</h2>
                  <p>{job.company ?? t(language, 'companyLocal')}{job.city ? ' · ' + job.city : ''}</p>
                </div>
                <div className="job-wage">{preciseMoney(job.wage, language)}<small>/h</small></div>
              </div>
              <div className="job-card-meta">
                <span>{t(language, 'industry')} · {job.industry || '–'}</span>
                <span>{jobShifts.length} {t(language, 'shiftCount')}</span>
              </div>
              {job.tipsEnabled && <p className="field-hint">{t(language, 'tipsInfo')}</p>}
              {features.osmCompanyCheck && job.company && job.city && (
                <details className="osm-lookup">
                  <summary>{t(language, 'osmTitle')}</summary>
                  <p>{t(language, 'osmExplain')}</p>
                  <p className="muted">{t(language, 'companyLookupTodo')}</p>
                  {data.profile.age < consentAgeRule.minimumAge ? (
                    <p className="notice notice-amber">{t(language, 'optInsBlocked')}</p>
                  ) : (
                    <button className="button button-quiet" type="button" disabled={osmLookup[job.id]?.status === 'loading'} onClick={() => void checkCompanyInOsm(job)}>
                      {osmLookup[job.id]?.status === 'loading' ? t(language, 'osmLoading') : t(language, 'osmCheck')}
                    </button>
                  )}
                  {osmLookup[job.id]?.status === 'found' && <p className="notice notice-neutral">{t(language, 'osmFound', { name: osmLookup[job.id].result ?? '' })} · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a></p>}
                  {osmLookup[job.id]?.status === 'empty' && <p className="notice notice-neutral">{t(language, 'osmNoMatch')}</p>}
                  {osmLookup[job.id]?.status === 'error' && <p role="alert" className="notice notice-amber">{t(language, 'osmError')}</p>}
                </details>
              )}
              <div className="card-actions">
                <button className="text-button" type="button" onClick={() => setEditing(job.id)}>{t(language, 'edit')}</button>
                <button className="text-button danger-text" type="button" onClick={() => {
                  if (window.confirm(t(language, 'confirmDelete'))) {
                    onUpdate(data.jobs.filter((item) => item.id !== job.id));
                  }
                }}>{t(language, 'delete')}</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function LimitsPage({ language, profile }: { language: Language; profile: Profile }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const active = activeLimits(profile, year);
  const list = limitsForYear(year);
  const all = useMemo(() => {
    const ids = new Set<string>();
    return list.filter((item) => {
      const key = item.id + '-' + item.validFrom;
      if (ids.has(key)) return false;
      ids.add(key);
      return true;
    });
  }, [list]);
  const yearOptions = [2026, 2027];
  const shown = all.length ? all : [];

  return (
    <section className="page-enter">
      <PageHeading
        kicker={t(language, 'sourceKicker')}
        title={t(language, 'limits')}
        trailing={
          <label className="year-picker">
            <span className="sr-only">{t(language, 'limitYear')}</span>
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {yearOptions.map((value) => <option value={value} key={value}>{value}</option>)}
            </select>
          </label>
        }
      />
      <p className="page-intro">{t(language, 'valuesSummary')}</p>
      <div className="stack-list">
        {shown.map((limit) => (
          <article className="surface limit-card" key={limit.id + limit.validFrom}>
            <div className="limit-card-top">
              <div>
                <p className="eyebrow">{limit.unit} · {periodLabel(limit.period, language)}</p>
                <h2>{limitName(limit, language)}</h2>
              </div>
              <div className="limit-value-stack">
                <strong className="limit-card-value">{limit.value === null ? '–' : new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-GB').format(limit.value)}</strong>
                {!limit.verified && <span className="pill-unverified">{t(language, 'unverified')}</span>}
              </div>
            </div>
            <p>{limitConsequence(limit, language)}</p>
            {!active.some((item) => item.id === limit.id) && (
              <p className="condition-note">{t(language, 'notApplicable')}</p>
            )}
            {limit.condition && <p className="condition-note">{t(language, 'conditionsApply')}</p>}
            <div className="source-row">
              <span>{limit.sourceName || t(language, 'source')}<small>{t(language, 'asOf', { date: dateText(limit.asOf, language) })}</small></span>
              {limit.sourceUrl ? (
                <a href={limit.sourceUrl} target="_blank" rel="noreferrer" aria-label={t(language, 'officialSource') + ': ' + limitSourceName(limit, language)}>↗</a>
              ) : (
                <span className="pill-unverified">{t(language, 'sourcePending')}</span>
              )}
            </div>
          </article>
        ))}
      </div>
      <section className="content-section">
        <p className="eyebrow">{t(language, 'references')}</p>
        <div className="reference-list">
          {references.map((reference) => (
            <a href={reference.url} key={reference.id} target="_blank" rel="noreferrer">
              <span>{reference.name}</span><span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </section>
    </section>
  );
}

function periodLabel(period: Limit['period'], language: Language): string {
  const keys: Record<Limit['period'], MessageKey> = {
    month: 'periodMonth', year: 'periodYear', week: 'periodWeek',
    day: 'periodDay', season: 'periodSeason', hour: 'periodHour',
  };
  return t(language, keys[period]);
}

function MorePage({
  language,
  features,
  onNavigate,
}: {
  language: Language;
  features: Record<FeatureName, boolean>;
  onNavigate: (screen: Screen) => void;
}) {
  const entries: { screen: Screen; title: MessageKey; description: MessageKey; visible?: boolean }[] = [
    { screen: 'Trends', title: 'trends', description: 'descTrends' },
    { screen: 'WageCheck', title: 'wageCheck', description: 'descWage' },
    { screen: 'Settings', title: 'settings', description: 'descSettings' },
    { screen: 'JobBoard', title: 'jobBoardTitle', description: 'descJobBoard', visible: features.jobBoard },
    { screen: 'PeerStats', title: 'peerTitle', description: 'descPeer', visible: features.peerStats },
    { screen: 'Premium', title: 'premiumTitle', description: 'descPremium', visible: features.premium },
    { screen: 'Scan', title: 'scanTitle', description: 'descScan', visible: features.scheduleScan && features.premium },
  ];
  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'controlKicker')} title={t(language, 'more')} />
      <div className="more-list">
        {entries.filter((entry) => entry.visible !== false).map((entry) => (
          <button className="more-link surface" key={entry.screen} type="button" onClick={() => onNavigate(entry.screen)}>
          <span><strong>{t(language, entry.title)}</strong><small>{t(language, entry.description)}</small></span>
            <span className="more-arrow" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SettingsPage({
  data,
  language,
  features,
  onUpdate,
  onFeatureUpdate,
  onNavigate,
  onReset,
  onDelete,
}: {
  data: AppState;
  language: Language;
  features: Record<FeatureName, boolean>;
  onUpdate: (values: Partial<AppState>) => void;
  onFeatureUpdate: (values: Record<FeatureName, boolean>) => void;
  onNavigate: (screen: Screen) => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { state?: unknown; featureFlags?: unknown };
      const imported = normalizeState(parsed?.state ?? parsed);
      if (!imported) throw new Error('Invalid backup');
      onUpdate({ ...imported, onboarded: true });
      if (parsed.featureFlags && typeof parsed.featureFlags === 'object') {
        const flags = parsed.featureFlags as Partial<Record<FeatureName, unknown>>;
        const validFlags = { ...defaultFeatures };
        for (const key of Object.keys(validFlags) as FeatureName[]) {
          if (typeof flags[key] === 'boolean') validFlags[key] = flags[key] as boolean;
        }
        onFeatureUpdate(validFlags);
      }
      window.alert(t(language, 'importSuccess'));
    } catch {
      window.alert(t(language, 'importError'));
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ version: 1, state: data, featureFlags: features }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'headroom-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'controlKicker')} title={t(language, 'settingsTitle')} />
      <div className="surface settings-card">
        <p className="muted">{t(language, 'localData')}</p>
        <label className="field">
          <span>{t(language, 'profileStatus')}</span>
          <select
            value={data.profile.status}
            onChange={(event) => {
              const status = event.target.value as ProfileStatus;
              onUpdate({
                profile: {
                  ...data.profile,
                  status,
                  hasMainJob: status === 'Employee' ? data.profile.hasMainJob ?? true : data.profile.hasMainJob,
                },
              });
            }}
          >
            {profileChoices.map((choice) => <option value={choice.value} key={choice.value}>{t(language, choice.key)}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t(language, 'age')}</span>
          <input type="number" min="0" max="120" value={data.profile.age} onChange={(event) => onUpdate({ profile: { ...data.profile, age: Number(event.target.value) } })} />
        </label>
        <label className="check-row">
          <input type="checkbox" checked={data.profile.familyInsured} onChange={(event) => onUpdate({ profile: { ...data.profile, familyInsured: event.target.checked } })} />
          <span>{t(language, 'familyInsured')}</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={data.profile.bafoeg} onChange={(event) => onUpdate({ profile: { ...data.profile, bafoeg: event.target.checked } })} />
          <span>{t(language, 'bafoeg')}</span>
        </label>
        {data.profile.status === 'Working student' && (
          <div className="form-grid two-columns">
            <label className="field"><span>{t(language, 'lectureStart')}</span><input type="date" value={data.profile.semesterPeriods?.[0]?.start ?? ''} onChange={(event) => onUpdate({ profile: { ...data.profile, semesterPeriods: [{ start: event.target.value, end: data.profile.semesterPeriods?.[0]?.end ?? '' }] } })} /></label>
            <label className="field"><span>{t(language, 'lectureEnd')}</span><input type="date" value={data.profile.semesterPeriods?.[0]?.end ?? ''} onChange={(event) => onUpdate({ profile: { ...data.profile, semesterPeriods: [{ start: data.profile.semesterPeriods?.[0]?.start ?? '', end: event.target.value }] } })} /></label>
          </div>
        )}
        <label className="check-row">
          <input type="checkbox" checked={data.darkMode} onChange={(event) => onUpdate({ darkMode: event.target.checked })} />
          <span>{t(language, 'darkMode')}</span>
        </label>
        <div className="settings-actions">
          <button className="button button-quiet" type="button" onClick={exportData}>{t(language, 'export')}</button>
          <label className="button button-quiet file-button">
            {t(language, 'import')}
            <input type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0])} />
          </label>
          <button className="button button-quiet" type="button" onClick={() => onNavigate('Trends')}>{t(language, 'trends')}</button>
          <details className="developer-disclosure">
            <summary>{t(language, 'developer')}</summary>
            <p className="muted">{t(language, 'developerIntro')}</p>
            <button className="button button-quiet" type="button" onClick={() => onNavigate('Developer')}>{t(language, 'openDeveloper')}</button>
          </details>
          <button className="button button-quiet" type="button" onClick={() => onReset()}>{t(language, 'resetDemo')}</button>
          <button className="button button-danger" type="button" onClick={() => {
            if (window.confirm(t(language, 'confirmDeleteAll'))) onDelete();
          }}>{t(language, 'deleteAll')}</button>
        </div>
      </div>
    </section>
  );
}

function DeveloperPage({
  language,
  features,
  onChange,
}: {
  language: Language;
  features: Record<FeatureName, boolean>;
  onChange: (features: Record<FeatureName, boolean>) => void;
}) {
  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'demoKicker')} title={t(language, 'developer')} />
      <p className="page-intro">{t(language, 'developerIntro')}</p>
      <section className="surface settings-card">
        <div className="section-heading">
          <h2>{t(language, 'flags')}</h2>
          <button className="text-button" type="button" onClick={() => onChange({ ...defaultFeatures })}>{t(language, 'resetFlags')}</button>
        </div>
        {Object.entries(features).map(([name, value]) => (
          <label className="flag-row" key={name}>
            <span><strong>{t(language, featureLabels[name as FeatureName])}</strong><small>{name}</small></span>
            <input
              type="checkbox"
              checked={value}
              onChange={(event) => onChange({ ...features, [name]: event.target.checked })}
            />
          </label>
        ))}
      </section>
    </section>
  );
}

function TrendsPage({
  data,
  language,
}: {
  data: AppState;
  language: Language;
}) {
  const today = localToday();
  const year = today.slice(0, 4);
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Number(year), new Date().getMonth() - 5 + index, 1);
    const key = withLocalDate(date).slice(0, 7);
    const amount = data.shifts.reduce((sum, shift) => {
      if (!shift.date.startsWith(key)) return sum;
      const job = data.jobs.find((item) => item.id === shift.jobId);
      return sum + (job ? shift.hours * job.wage + (shift.surchargeAmount ?? 0) : 0);
    }, 0);
    return { key, amount, label: new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', { month: 'short' }).format(date) };
  });
  const maximum = Math.max(...monthly.map((item) => item.amount), 1);
  const totalHours = data.jobs.map((job) => ({
    job,
    hours: data.shifts.filter((shift) => shift.jobId === job.id).reduce((sum, shift) => sum + shift.hours, 0),
  }));
  const byIndustry = data.jobs.map((job) => ({
    job,
    amount: data.shifts.filter((shift) => shift.jobId === job.id).reduce((sum, shift) => sum + shift.hours * job.wage + (shift.surchargeAmount ?? 0), 0),
  }));
  const shortTerm = shortDays(
    data.shifts.filter((shift) => data.jobs.find((job) => job.id === shift.jobId)?.type === 'short-term'),
    Number(year),
  );
  const hasData = data.shifts.length > 0;

  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'personalKicker')} title={t(language, 'trendsTitle')} />
      {!hasData && <div className="empty-panel">{t(language, 'noTrendData')}</div>}
      <section className="surface chart-card">
        <h2>{t(language, 'monthlyEarnings')}</h2>
        <div className="bar-chart" role="img" aria-label={t(language, 'monthlyEarnings')}>
          {monthly.map((item) => (
            <div className="chart-column" key={item.key}>
              <span className="chart-value">{item.amount ? money(item.amount, language) : ''}</span>
              <div className="chart-bar-track"><span style={{ height: Math.max(item.amount ? 6 : 0, item.amount / maximum * 100) + '%' }} /></div>
              <small>{item.label}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="surface chart-card">
        <h2>{t(language, 'hoursByJob')}</h2>
        {totalHours.map(({ job, hours }) => (
          <div className="data-row" key={job.id}><span>{job.title}</span><strong>{hours.toFixed(1)} {t(language, 'hourShort')}</strong></div>
        ))}
      </section>
      <section className="surface chart-card">
        <h2>{t(language, 'earningsByIndustry')}</h2>
        {byIndustry.map(({ job, amount }) => (
          <div className="data-row" key={job.id}><span>{job.industry || job.title}</span><strong>{money(amount, language)}</strong></div>
        ))}
      </section>
      <section className="surface chart-card">
        <h2>{t(language, 'shortDaysUsed')}</h2>
        <div className="data-row"><span>{year}</span><strong>{shortTerm} / {limitValue('shortTermEmployment', Number(year))}</strong></div>
      </section>
    </section>
  );
}

function WageCheckPage({
  data,
  language,
}: {
  data: AppState;
  language: Language;
}) {
  const wageLimit = limitValue('minimumWage');
  const minimumWageRecord = limitsForYear(new Date().getFullYear()).find((limit) => limit.id === 'minimumWage');
  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'referenceKicker')} title={t(language, 'wageCheckTitle')} />
      <section className="stack-list">
        {data.jobs.map((job) => (
          <article className="surface wage-card" key={job.id}>
            <div className="metric-topline"><h2>{job.title}</h2><strong>{preciseMoney(job.wage, language)} / h</strong></div>
            {wageBelowMinimum(job.wage, wageLimit) && (
              <p className="notice notice-amber">{t(language, 'wageBelow')} {t(language, 'source')}: {money(wageLimit, language)}/h.</p>
            )}
            {minimumWageRecord && <SourceStamp limit={minimumWageRecord} language={language} />}
          </article>
        ))}
      </section>
      <article className="surface chart-card">
        <h2>{t(language, 'wageCheck')}</h2>
        <p>{t(language, 'entgeltatlasNote')}</p>
        <a className="button button-quiet" href="https://web.arbeitsagentur.de/entgeltatlas/" target="_blank" rel="noreferrer">Entgeltatlas ↗</a>
      </article>
    </section>
  );
}

function ShiftCheckDialog({
  data,
  language,
  onClose,
}: {
  data: AppState;
  language: Language;
  onClose: () => void;
}) {
  const [jobId, setJobId] = useState(data.jobs[0]?.id ?? '');
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(localToday());
  const job = data.jobs.find((item) => item.id === jobId);
  const year = Number(date.slice(0, 4));
  const month = date.slice(0, 7);
  const duration = Number(hours || 0);
  const amount = job ? duration * job.wage * (1 + Math.max(0, job.surcharges ?? 0)) : 0;
  const miniTotal = monthlyIncomeForLimit(data.shifts, data.jobs, 'miniJobMonthly', month);
  const miniCap = limitValue('miniJobMonthly', year);
  const isMini = job?.type === 'mini-job';
  const result = isMini ? shiftCheck(miniTotal, amount, miniCap) : null;
  const lecture = data.profile.status === 'Working student' && isInLecturePeriod(date, data.profile);
  const existingWeeklyHours = hoursInWeek(data.shifts, date);
  const weeklyResult = data.profile.status === 'Working student'
    ? workingHoursCheck(existingWeeklyHours + duration, lecture)
    : null;
  const hasLectureDates = (data.profile.semesterPeriods ?? []).some((period) => period.start && period.end);
  const annualMiniRecord = limitsForYear(year).find((limit) => limit.id === 'miniJobYearly');
  const annualMiniCap = annualMiniRecord?.value ?? 0;
  const projectedShift: Shift = {
    jobId,
    date,
    hours: duration,
    planned: true,
    surchargeAmount: job ? duration * job.wage * Math.max(0, job.surcharges ?? 0) : 0,
  };
  const annualMiniAfter = isMini
    ? annualMiniProjection([...data.shifts, projectedShift], data.jobs, year, Number(localToday().slice(5, 7)))
    : 0;
  const annualMiniOver = Math.max(0, annualMiniAfter - annualMiniCap);
  const shortDaysWithShift = shortDays([
    ...data.shifts.filter((shift) => data.jobs.find((entry) => entry.id === shift.jobId)?.type === 'short-term'),
    { jobId, date, hours: 1, days: job?.type === 'short-term' ? 1 : undefined },
  ], year);
  const familyLimit = activeLimits(data.profile, year).find((limit) => limit.id === 'familyInsurance');
  const currentFamilyAmount = data.shifts.reduce((sum, shift) => {
    if (!shift.date.startsWith(month)) return sum;
    const entry = data.jobs.find((candidate) => candidate.id === shift.jobId);
    return sum + (entry ? earnings(shift, entry) : 0);
  }, 0);
  const hasNonMiniIncome = data.shifts.some((shift) => {
    if (!shift.date.startsWith(month)) return false;
    const entry = data.jobs.find((candidate) => candidate.id === shift.jobId);
    return Boolean(entry && entry.type !== 'mini-job' && shift.hours > 0);
  });
  const familyCap = familyLimit && job
    ? job.type === 'mini-job' && !hasNonMiniIncome
      ? miniCap
      : familyLimit.value ?? 0
    : 0;
  const familyResult = familyLimit?.verified && familyLimit.value !== null && job
    ? shiftCheck(
        currentFamilyAmount,
        amount,
        familyCap,
      )
    : null;
  const weeklyLimitRecord = activeLimits(data.profile, year).find((limit) => limit.id === 'workingStudentHours');
  const miniMonthRecord = limitsForYear(year).find((limit) => limit.id === 'miniJobMonthly');
  const shortTermRecord = limitsForYear(year).find((limit) => limit.id === 'shortTermEmployment');
  const unverifiedActiveLimits = activeLimits(data.profile, year).filter((limit) => !limit.verified);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog surface" role="dialog" aria-modal="true" aria-labelledby="shift-dialog-title">
        <div className="section-heading">
          <div><p className="eyebrow">{t(language, 'shiftCheck')}</p><h2 id="shift-dialog-title">{t(language, 'whatIfTitle')}</h2></div>
          <button className="icon-button" type="button" aria-label={t(language, 'closeDialog')} onClick={onClose}>×</button>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>{t(language, 'selectJob')}</span>
            <select value={jobId} onChange={(event) => setJobId(event.target.value)}>
              {data.jobs.map((entry) => <option value={entry.id} key={entry.id}>{entry.title}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t(language, 'shiftDate')}</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="field">
            <span>{t(language, 'hoursWorked')}</span>
            <input type="number" min="0" step="0.25" value={hours} onChange={(event) => setHours(event.target.value)} />
          </label>
        </div>
        {job && (
          <div className="what-if-results">
            <div className="what-if-total"><span>{t(language, 'shiftEarnings')}</span><strong>{money(amount, language)}</strong></div>
            {isMini && result && (
              <div className={'result-line ' + (result.over ? 'result-over' : 'result-safe')}>
                <strong>{miniMonthRecord ? limitName(miniMonthRecord, language) : t(language, 'miniJobCap')}</strong>
                <span>{result.over > 0
                  ? t(language, 'crossesLimit', { limit: money(miniCap, language), amount: money(result.over, language) })
                  : t(language, 'remainsUnder', { limit: money(miniCap, language), amount: money(Math.max(0, miniCap - result.projected), language) })}</span>
                {miniMonthRecord && <SourceStamp limit={miniMonthRecord} language={language} />}
              </div>
            )}
            {isMini && annualMiniRecord && (
              <div className={'result-line ' + (annualMiniOver ? 'result-over' : 'result-safe')}>
                <strong>{limitName(annualMiniRecord, language)}</strong>
                <span>{annualMiniOver
                  ? t(language, 'crossesLimit', { limit: money(annualMiniCap, language), amount: money(annualMiniOver, language) })
                  : t(language, 'remainsUnder', { limit: money(annualMiniCap, language), amount: money(Math.max(0, annualMiniCap - annualMiniAfter), language) })}</span>
                <SourceStamp limit={annualMiniRecord} language={language} />
              </div>
            )}
            {familyResult && (
              <div className={'result-line ' + (familyResult.over ? 'result-over' : 'result-safe')}>
                <strong>{t(language, 'sourceFamily')}</strong>
                <span>{familyResult.over > 0
                  ? t(language, 'crossesLimit', { limit: money(familyCap, language), amount: money(familyResult.over, language) })
                  : t(language, 'remainsUnder', { limit: money(familyCap, language), amount: money(familyResult.remaining, language) })}</span>
                {familyLimit && <SourceStamp limit={familyLimit} language={language} />}
              </div>
            )}
            {weeklyResult && (
              <div className={'result-line ' + (weeklyResult.over ? 'result-over' : 'result-safe')}>
                <strong>{t(language, 'sourceWorking')}</strong>
                <span>{!hasLectureDates
                  ? t(language, 'semesterDatesMissing')
                  : weeklyResult.limit === null
                  ? t(language, 'semesterBreakNoWarning')
                  : t(language, 'weeklyHoursSummary', { hours: weeklyResult.hours, limit: weeklyResult.limit })}</span>
                {weeklyLimitRecord && <SourceStamp limit={weeklyLimitRecord} language={language} />}
              </div>
            )}
            {job.type === 'short-term' && (
              <div className={'result-line ' + (shortDaysWithShift > limitValue('shortTermEmployment', year) ? 'result-over' : 'result-safe')}>
                <strong>{t(language, 'sourceShort')}</strong>
                <span>{shortDaysWithShift} / {limitValue('shortTermEmployment', year)} {t(language, 'workdayCount')}</span>
                {shortTermRecord && <SourceStamp limit={shortTermRecord} language={language} />}
              </div>
            )}
            {unverifiedActiveLimits.map((limit) => (
              <div className="result-line result-neutral" key={limit.id}>
                <strong>{limitName(limit, language)} · {t(language, 'unverified')}</strong>
                <span>{t(language, 'unverifiedNoWarning')}</span>
                <SourceStamp limit={limit} language={language} />
              </div>
            ))}
          </div>
        )}
        <button className="button button-dark button-wide" type="button" onClick={onClose}>{t(language, 'closeDialog')}</button>
      </section>
    </div>
  );
}

function JobBoardPage({
  language,
  data,
}: {
  language: Language;
  data: AppState;
}) {
  type Listing = { id: string; title: string; city: string; date: string; hours: number; hourlyWage: number; demo?: boolean };
  const [showPost, setShowPost] = useState(false);
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('Frankfurt');
  const [date, setDate] = useState(localToday());
  const [hours, setHours] = useState('4');
  const [wage, setWage] = useState(String(limitValue('minimumWage')));
  const [posted, setPosted] = useState<Listing[]>([]);
  const [serverListings, setServerListings] = useState<Listing[] | null>(null);
  const [serverError, setServerError] = useState(false);
  useEffect(() => {
    if (data.profile.age < consentAgeRule.minimumAge) return;
    let cancelled = false;
    void fetch('/api/listings')
      .then(async (response) => {
        if (!response.ok) throw new Error('Listings are unavailable');
        const payload = await response.json() as { listings?: Listing[] };
        if (!Array.isArray(payload.listings)) throw new Error('Listings response is invalid');
        if (!cancelled) setServerListings(payload.listings);
      })
      .catch(() => {
        if (!cancelled) setServerError(true);
      });
    return () => { cancelled = true; };
  }, [data.profile.age]);
  const today = localToday();
  const listings: Listing[] = [...posted, ...(serverListings ?? demoListings)];
  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'demoKicker')} title={t(language, 'jobBoardTitle')} trailing={<span className="badge-demo">{t(language, 'demoBadge')}</span>} />
      <p className="page-intro">{t(language, 'jobBoardIntro')}</p>
      {serverError && <p className="field-hint">{t(language, 'jobBoardLocalFallback')}</p>}
      {data.profile.age < consentAgeRule.minimumAge ? (
        <p className="notice notice-amber">{t(language, 'optInsBlocked')}</p>
      ) : (
        <button className="button button-primary" type="button" onClick={() => setShowPost((current) => !current)}>{t(language, 'postShift')} <span aria-hidden="true">+</span></button>
      )}
      {showPost && data.profile.age >= consentAgeRule.minimumAge && (
        <form className="surface form-surface form-grid" onSubmit={(event) => {
          event.preventDefault();
          const listing = { title: title.trim(), city: city.trim(), date, hours: Number(hours), hourlyWage: Number(wage) };
          if (!listing.title || !listing.city || !listing.date || listing.hours <= 0 || listing.hourlyWage < 0) return;
          void fetch('/api/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(listing),
          }).then(async (response) => {
            if (!response.ok) throw new Error('Could not save listing');
            const saved = await response.json() as Listing;
            setServerListings((items) => [saved, ...(items ?? [])]);
          }).catch(() => {
            setPosted((items) => [{ ...listing, id: id(), demo: true }, ...items]);
            setServerError(true);
          });
          setTitle('');
          setShowPost(false);
        }}>
          <label className="field"><span>{t(language, 'listingTitle')}</span><input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
          <label className="field"><span>{t(language, 'listingCity')}</span><input value={city} onChange={(event) => setCity(event.target.value)} required /></label>
          <label className="field"><span>{t(language, 'shiftDate')}</span><input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <div className="form-grid two-columns">
            <label className="field"><span>{t(language, 'listingHours')}</span><input type="number" min="1" step=".5" value={hours} onChange={(event) => setHours(event.target.value)} /></label>
            <label className="field"><span>{t(language, 'listingWage')}</span><input type="number" min="0" step=".1" value={wage} onChange={(event) => setWage(event.target.value)} /></label>
          </div>
          <button className="button button-dark" type="submit">{t(language, 'postShift')}</button>
        </form>
      )}
      <div className="stack-list">
        {listings.slice(0, 40).map((listing) => {
          const earnings = listing.hourlyWage * listing.hours;
          const listingYear = Number(listing.date.slice(0, 4));
          const listingMonth = listing.date.slice(0, 7);
          const activeProfileLimits = activeLimits(data.profile, listingYear);
          const monthLimitRecord = limitsForYear(listingYear).find((limit) => limit.id === 'miniJobMonthly');
          const yearLimitRecord = limitsForYear(listingYear).find((limit) => limit.id === 'miniJobYearly');
          const applicableMonthlyLimits = activeProfileLimits
            .filter((limit) => limit.period === 'month' && limit.verified)
            .map((limit) => monthlyAmountForLimit(limit, data.profile, data.jobs, data.shifts, listingMonth, listingYear))
            .filter((value): value is { total: number; cap: number } => value !== null);
          const headroom = applicableMonthlyLimits.length
            ? Math.max(0, Math.min(...applicableMonthlyLimits.map((limit) => limit.cap - limit.total)))
            : Math.max(0, limitValue('miniJobMonthly', listingYear) - monthlyIncomeForLimit(data.shifts, data.jobs, 'miniJobMonthly', listingMonth));
          const listingJob: Job = { id: 'listing-' + listing.id, title: listing.title, type: 'mini-job', wage: listing.hourlyWage, startDate: listing.date };
          const listingShift: Shift = { jobId: listingJob.id, date: listing.date, hours: listing.hours, planned: true };
          const currentMonthNumber = listingYear === Number(today.slice(0, 4)) ? Number(today.slice(5, 7)) : 1;
          const annualMini = annualMiniProjection([...data.shifts, listingShift], [...data.jobs, listingJob], listingYear, currentMonthNumber);
          const annualExceeded = Boolean(yearLimitRecord?.verified && yearLimitRecord.value !== null && annualMini > yearLimitRecord.value);
          const secondMiniJob = activeProfileLimits.some((limit) => limit.id === 'miniJobAlongsideMainJob') &&
            data.jobs.some((job) => job.type === 'mini-job' && job.startDate <= listing.date && (!job.endDate || job.endDate >= listing.date));
          const hasLectureDates = (data.profile.semesterPeriods ?? []).some((period) => period.start && period.end);
          const workingStudentNeedsDates = data.profile.status === 'Working student' && !hasLectureDates;
          const workingStudentOverHours = data.profile.status === 'Working student' && hasLectureDates &&
            isInLecturePeriod(listing.date, data.profile) &&
            workingHoursCheck(hoursInWeek(data.shifts, listing.date) + listing.hours, true).over;
          const monthlyExceeded = Boolean(monthLimitRecord?.verified) && earnings > headroom;
          const unknownCoreLimit = !monthLimitRecord?.verified || !yearLimitRecord?.verified;
          const unverifiedProfileLimit = activeProfileLimits.some((limit) =>
            !limit.verified && ['familyInsurance', 'bafoegSideIncome'].includes(limit.id),
          );
          const tooLong = monthlyExceeded || annualExceeded || secondMiniJob || workingStudentOverHours;
          const needsReview = !tooLong && (unknownCoreLimit || unverifiedProfileLimit || workingStudentNeedsDates);
          const reviewReason = unverifiedProfileLimit
            ? 'jobBoardUnverifiedLimit'
            : workingStudentNeedsDates
              ? 'jobBoardNeedSemesterDates'
              : 'jobBoardUnknownLimit';
          const fits = !tooLong && !needsReview;
          return (
            <article className="surface listing-card" key={listing.id}>
              <div className="metric-topline">
                <div><p className="eyebrow">{listing.city}</p><h2>{listing.title}</h2></div>
                <span className={fits ? 'fit-badge' : needsReview ? 'review-badge' : 'over-badge'}>{fits ? t(language, 'fits') : needsReview ? t(language, 'needsReview') : t(language, 'tooLong')}</span>
              </div>
              <div className="listing-detail-row">
                <span>{dateText(listing.date, language)}</span>
                <span>{listing.hours} {t(language, 'hourShort')}</span>
                <span>{preciseMoney(listing.hourlyWage, language)} / {t(language, 'hourShort')}</span>
                <strong>{money(earnings, language)}</strong>
              </div>
              {!fits && <p className="field-hint">{t(language, needsReview ? reviewReason : secondMiniJob ? 'jobBoardSecondMiniJob' : annualExceeded ? 'jobBoardAnnualCap' : workingStudentOverHours ? 'jobBoardWeeklyHours' : 'jobBoardExceedsHeadroom')}</p>}
              <span className="pill-subtle">{t(language, 'typeMini')}</span>
              <p className="privacy-note">{t(language, 'applicationPrivacy')}</p>
              <a className="button button-quiet" href={'mailto:?subject=' + encodeURIComponent(t(language, 'applicationSubject', { title: listing.title }))}>{t(language, 'contact')} ↗</a>
              <span className="sr-only">{t(language, 'demoBadge')}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PeerStatsPage({
  data,
  language,
  onUpdate,
}: {
  data: AppState;
  language: Language;
  onUpdate: (values: Partial<AppState>) => void;
}) {
  type PeerAggregate = { enough: boolean; count: number; median?: number; medianExpectedWage?: number; medianGap?: number };
  const [jobId, setJobId] = useState(data.jobs[0]?.id ?? '');
  const selectedJob = data.jobs.find((job) => job.id === jobId);
  const [city, setCity] = useState(selectedJob?.city ?? '');
  const [hourlyWage, setHourlyWage] = useState(String(selectedJob?.wage ?? ''));
  const [expectedWage, setExpectedWage] = useState(String(selectedJob?.expectedWage ?? ''));
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [aggregate, setAggregate] = useState<PeerAggregate | null>(null);
  const peerAllowed = data.profile.age >= consentAgeRule.minimumAge;
  const selectedPreset = jobPresets.find((preset) => preset.title_de === selectedJob?.title || preset.title_en === selectedJob?.title);
  const presetId = selectedPreset?.id ?? jobPresets.find((preset) => preset.title_de === 'Sonstiger Job')?.id ?? 'preset-31';
  const demoGroup = demoPeerRows.filter(
    (row) => row.city === city && (!selectedPreset || row.jobPresetId === presetId),
  );
  const demoMedian = peerMedian(demoGroup);
  const position = demoMedian ? peerWagePosition(Number(hourlyWage), demoMedian) : null;
  const expectationGap = expectedWage.trim() ? Number(expectedWage) - Number(hourlyWage) : Number.NaN;
  const loadAggregate = async () => {
    if (!data.peerOptIn || !city.trim() || !presetId) return;
    const query = new URLSearchParams({ jobPresetId: presetId, city: city.trim() });
    try {
      const response = await fetch('/api/peer-stats?' + query.toString());
      if (!response.ok) throw new Error('Peer statistics are unavailable');
      setAggregate(await response.json() as PeerAggregate);
    } catch {
      setAggregate(null);
    }
  };

  useEffect(() => {
    if (data.peerOptIn) void loadAggregate();
  }, [data.peerOptIn, city, presetId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!peerAllowed || !consent || !selectedJob || !city.trim() || !Number.isFinite(Number(hourlyWage)) || !Number.isFinite(Number(expectedWage)) || data.peerOptIn) return;
    const token = data.peerToken ?? id();
    if (!data.peerToken) onUpdate({ peerToken: token });
    const row = {
      deviceToken: token,
      jobPresetId: presetId,
      city: city.trim(),
      hourlyWage: Number(hourlyWage),
      expectedWage: Number(expectedWage),
      month: localToday().slice(0, 7),
    };
    try {
      const response = await fetch('/api/peer-opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
      if (!response.ok) throw new Error('Consent data could not be stored');
      onUpdate({ peerOptIn: true, peerToken: token });
      setDone(true);
      const query = new URLSearchParams({ jobPresetId: row.jobPresetId, city: row.city });
      const stats = await fetch('/api/peer-stats?' + query.toString());
      if (!stats.ok) throw new Error('Peer statistics are unavailable');
      setAggregate(await stats.json() as PeerAggregate);
    } catch {
      setError(t(language, 'peerServerUnavailable'));
    }
  };

  const revoke = async () => {
    if (!data.peerToken) {
      onUpdate({ peerOptIn: false, peerToken: undefined });
      setDone(false);
      return;
    }
    try {
      const response = await fetch('/api/peer-opt-in/' + encodeURIComponent(data.peerToken), { method: 'DELETE' });
      if (!response.ok) throw new Error('Peer rows could not be deleted');
      onUpdate({ peerOptIn: false, peerToken: undefined });
      setAggregate(null);
      setDone(false);
    } catch {
      setError(t(language, 'peerRevokeServerUnavailable'));
    }
  };

  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'voluntaryKicker')} title={t(language, 'peerTitle')} trailing={<span className="badge-demo">{t(language, 'demoBadge')}</span>} />
      <p className="page-intro">{t(language, 'peerIntro')}</p>
      {!peerAllowed ? (
        <div className="notice notice-amber">{t(language, 'optInsBlocked')}</div>
      ) : (
        <>
          <section className="surface settings-card">
            <h2>{t(language, 'demoComparison')}</h2>
            <p className="muted">{t(language, 'demoBadge')}: {demoPeerRows.length} {t(language, 'peerDataRowsNote')}</p>
            {demoMedian === null ? (
              <p>{t(language, 'peerNotEnough')}</p>
            ) : (
              <>
                <p>{t(language, 'peerPosition', { job: selectedJob?.title ?? '–', city: city || '–' })}</p>
                <div className="peer-compare">
                  <strong>{preciseMoney(Number(hourlyWage) || 0, language)} / h</strong>
                  <span>{t(language, 'demoMedian')}: {preciseMoney(demoMedian, language)} / {t(language, 'hourShort')}</span>
                  {position && <b className={'peer-position peer-' + position}>{t(language, position === 'below' ? 'peerBelow' : position === 'above' ? 'peerAbove' : 'peerUsual')}</b>}
                </div>
              </>
            )}
            <p className="field-hint">{t(language, 'expectationGap')}: {Number.isFinite(expectationGap) ? preciseMoney(expectationGap, language) : '–'} / {t(language, 'hourShort')}</p>
          </section>

          {data.peerOptIn && (
            <section className="surface settings-card">
              <h2>{t(language, 'peerAggregateTitle')}</h2>
              {!aggregate?.enough ? (
                <p>{t(language, 'peerNotEnough')}</p>
              ) : (
                <>
                  <p>{t(language, 'peerPosition', { job: selectedJob?.title ?? '–', city: city || '–' })}</p>
                  <div className="peer-compare">
                    <strong>{preciseMoney(Number(hourlyWage) || 0, language)} / {t(language, 'hourShort')}</strong>
                    <span>{t(language, 'peerGroupMedian')}: {preciseMoney(aggregate.median ?? 0, language)} / {t(language, 'hourShort')}</span>
                    <b className={'peer-position peer-' + (peerWagePosition(Number(hourlyWage) || 0, aggregate.median ?? 0))}>{t(language, peerWagePosition(Number(hourlyWage) || 0, aggregate.median ?? 0) === 'below' ? 'peerBelow' : peerWagePosition(Number(hourlyWage) || 0, aggregate.median ?? 0) === 'above' ? 'peerAbove' : 'peerUsual')}</b>
                  </div>
                  <p className="field-hint">{t(language, 'expectationGap')}: {preciseMoney(aggregate.medianGap ?? 0, language)} / {t(language, 'hourShort')} · {aggregate.count}</p>
                </>
              )}
            </section>
          )}

          {!done && !data.peerOptIn ? (
            <form className="surface form-surface form-grid" onSubmit={submit}>
              <h2>{t(language, 'enablePeerComparison')}</h2>
              <label className="field"><span>{t(language, 'selectJob')}</span><select value={jobId} onChange={(event) => {
                const nextJob = data.jobs.find((job) => job.id === event.target.value);
                setJobId(event.target.value);
                if (nextJob) {
                  setCity(nextJob.city ?? '');
                  setHourlyWage(String(nextJob.wage));
                  setExpectedWage(String(nextJob.expectedWage ?? ''));
                }
              }}>{data.jobs.map((job) => <option value={job.id} key={job.id}>{job.title}</option>)}</select></label>
              <label className="field"><span>{t(language, 'city')}</span><input value={city} onChange={(event) => setCity(event.target.value)} /></label>
              <div className="form-grid two-columns">
                <label className="field"><span>{t(language, 'hourlyWage')}</span><input type="number" min="0" step=".01" value={hourlyWage} onChange={(event) => setHourlyWage(event.target.value)} required /></label>
                <label className="field"><span>{t(language, 'expectedWage')}</span><input type="number" min="0" step=".01" value={expectedWage} onChange={(event) => setExpectedWage(event.target.value)} required /></label>
              </div>
              <label className="check-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{t(language, 'peerConsent')}</span></label>
              {error && <p role="alert" className="form-error">{error}</p>}
              {data.peerToken && <p role="alert" className="form-error">{t(language, 'peerDeletePending')}</p>}
              <button className="button button-primary" type="submit" disabled={!consent || !selectedJob}>{t(language, data.peerToken ? 'retryPeerSubmit' : 'shareWage')}</button>
              {data.peerToken && <button className="button button-quiet" type="button" onClick={() => void revoke()}>{t(language, 'retryPeerDelete')}</button>}
            </form>
          ) : (
            <section className="surface settings-card">
              <p className="notice notice-neutral">{t(language, 'peerDoneTitle')}</p>
              <button className="button button-danger" type="button" onClick={() => void revoke()}>{t(language, 'revokeConsent')}</button>
              {error && <p role="alert" className="form-error">{error}</p>}
            </section>
          )}
        </>
      )}
    </section>
  );
}

function PartnerPanel({
  data,
  language,
  onUpdate,
}: {
  data: AppState;
  language: Language;
  onUpdate: (values: Partial<AppState>) => void;
}) {
  const year = Number(localToday().slice(0, 4));
  const annual = annualMiniProjection(data.shifts, data.jobs, year, Number(localToday().slice(5, 7)));
  const annualLimit = limitValue('miniJobYearly', year);
  const taxLimitRecord = limitsForYear(year).find((limit) => limit.id === 'incomeTaxThreshold');
  const taxLimit = taxLimitRecord?.value ?? 0;
  const month = localToday().slice(0, 7);
  const secondRegular = data.jobs.filter((job) => job.type === 'regular').length > 1;
  const familyLimit = limitsForYear(year).find((limit) => limit.id === 'familyInsurance');
  const familyThreshold = getAgeBoundary(familyLimit);
  const familyIncome = data.shifts.reduce((sum, shift) => {
    if (!shift.date.startsWith(month)) return sum;
    const job = data.jobs.find((entry) => entry.id === shift.jobId);
    return sum + (job ? shift.hours * job.wage : 0);
  }, 0);
  const currentFacts = {
    regularSecondJob: Boolean(taxLimitRecord?.verified) && secondRegular && annualIncomeProjection(data.shifts, data.jobs, year, ['regular']) <= taxLimit,
    underTaxThreshold: Boolean(taxLimitRecord?.verified) && annualIncomeProjection(data.shifts, data.jobs, year, ['regular', 'working student']) <= taxLimit,
    familyInsuranceEnds: data.profile.familyInsured && (
      (familyThreshold !== null && data.profile.age >= familyThreshold) ||
      familyIncome > (
        data.shifts.some((shift) => shift.date.startsWith(month) && data.jobs.find((job) => job.id === shift.jobId)?.type !== 'mini-job')
          ? familyLimit?.value ?? Infinity
          : limitValue('miniJobMonthly', year)
      )
    ),
    overMiniJobPermanently: annual > annualLimit,
    unclassified: secondRegular && (!taxLimitRecord?.verified || annualIncomeProjection(data.shifts, data.jobs, year, ['regular']) > taxLimit),
  };
  const level = recommendationLevel(currentFacts);
  const isOpen = level > 0 && !data.dismissedRecommendations.includes(level);
  const partnerIds: Record<number, string[]> = {
    1: ['ELSTER', 'TaxLeaf'],
    2: ['HealthCompare'],
    3: ['SafeCover'],
    4: ['Advisor Map'],
  };
  const titleKey: Record<number, MessageKey> = {
    1: 'partnerLevel1',
    2: 'partnerLevel2',
    3: 'partnerLevel3',
    4: 'partnerLevel4',
  };
  const partners = demoPartners.filter((partner) => partnerIds[level]?.includes(partner.name));

  if (level === 0) return null;
  if (!isOpen) return null;

  return (
    <section className="surface partner-panel">
      <div className="partner-panel-head">
        <span className="badge-demo">{t(language, 'partnerBadge')}</span>
        <button className="icon-button" type="button" aria-label={t(language, 'dismiss')} onClick={() => {
          onUpdate({ dismissedRecommendations: [...data.dismissedRecommendations, level] });
        }}>×</button>
      </div>
      <p>{t(language, titleKey[level])}</p>
      <div className="partner-links">
        {partners.map((partner) => (
          <a href={partner.fictional ? '#' : partner.url} key={partner.name} target={partner.fictional ? undefined : '_blank'} rel="noreferrer" onClick={(event) => {
            if (partner.fictional) event.preventDefault();
          }}>
            {partner.name === 'ELSTER' ? t(language, 'elsterFree') : partner.name} <span>· {t(language, 'partnerBadge')}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function PremiumPage({
  data,
  language,
  onUpdate,
}: {
  data: AppState;
  language: Language;
  onUpdate: (values: Partial<AppState>) => void;
}) {
  const [pdfReady, setPdfReady] = useState(false);
  const createReport = () => {
    const year = new Date().getFullYear();
    const lines = [
      t(language, 'reportTitle') + ' ' + year,
      '',
      t(language, 'reportNotice'),
      '',
      ...data.jobs.map((job) => {
        const amount = data.shifts
          .filter((shift) => shift.jobId === job.id && shift.date.startsWith(String(year)))
          .reduce((sum, shift) => sum + shift.hours * job.wage, 0);
        return job.title + ': ' + amount.toFixed(2) + ' EUR';
      }),
    ];
    const content = lines.join('\n');
    const pdf = makeTextPdf(content);
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'headroom-jahresbericht-' + year + '.pdf';
    link.click();
    URL.revokeObjectURL(url);
    setPdfReady(true);
  };

  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'premiumKicker')} title={t(language, 'premiumTitle')} trailing={<span className="badge-demo">{t(language, 'demoBadge')}</span>} />
      <section className="surface settings-card">
        <p>{t(language, 'premiumDescription')}</p>
        {data.isPremium ? (
          <p className="notice notice-lime">{t(language, 'premiumActive')}</p>
        ) : (
          <button className="button button-primary" type="button" onClick={() => onUpdate({ isPremium: true })}>{t(language, 'activatePremium')}</button>
        )}
        {data.isPremium && (
          <button className="button button-dark" type="button" onClick={createReport}>{t(language, 'pdfReport')}</button>
        )}
        {pdfReady && <p role="status" className="field-hint">{t(language, 'pdfCreated')}</p>}
      </section>
      {data.isPremium && (
        <section className="surface settings-card">
          <h2>{t(language, 'multiYearHistory')}</h2>
          {Array.from(new Set(data.shifts.map((shift) => shift.date.slice(0, 4)))).sort().map((year) => (
            <p className="data-row" key={year}><span>{year}</span><strong>{data.shifts.filter((shift) => shift.date.startsWith(year)).length} {t(language, 'shiftCount')}</strong></p>
          ))}
        </section>
      )}
    </section>
  );
}

function makeTextPdf(text: string): string {
  const normalized = text
    .replace(/€/g, ' EUR')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, '?');
  const rows = normalized.split('\n').flatMap((paragraph) => {
    if (!paragraph) return [''];
    const wrapped: string[] = [];
    let remaining = paragraph;
    while (remaining.length > 88) {
      let breakAt = remaining.lastIndexOf(' ', 88);
      if (breakAt < 1) breakAt = 88;
      wrapped.push(remaining.slice(0, breakAt));
      remaining = remaining.slice(breakAt).trimStart();
    }
    wrapped.push(remaining);
    return wrapped;
  });
  const pages: string[][] = [];
  for (let index = 0; index < rows.length; index += 52) pages.push(rows.slice(index, index + 52));
  if (!pages.length) pages.push([]);

  const pageIds = pages.map((_, index) => 4 + index * 2);
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [' + pageIds.map((id) => id + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >> endobj',
    '3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];
  pages.forEach((pageRows, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const textCommands = pageRows.map((row) =>
      '(' + row.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ') Tj T*',
    ).join('\n');
    const stream = 'BT /F1 10 Tf 48 790 Td 14 TL\n' + textCommands + '\nET';
    objects.push(
      pageId + ' 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + contentId + ' 0 R >> endobj',
      contentId + ' 0 obj << /Length ' + stream.length + ' >> stream\n' + stream + '\nendstream endobj',
    );
  });
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object + '\n';
  }
  const xref = pdf.length;
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  pdf += 'trailer << /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  return pdf;
}

function ScanPage({
  jobs,
  language,
  onAdd,
}: {
  jobs: Job[];
  language: Language;
  onAdd: (shifts: Shift[]) => void;
}) {
  const [jobId, setJobId] = useState(jobs[0]?.id ?? '');
  const [image, setImage] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [recognized, setRecognized] = useState<{ date: string; hours: number }[]>([]);
  const [ocrText, setOcrText] = useState('');

  const runOcr = async () => {
    if (!image) return;
    setRunning(true);
    setError('');
    try {
      const module = await import('tesseract.js');
      const result = await module.recognize(image, language === 'de' ? 'deu' : 'eng');
      setOcrText(result.data.text);
      const dates = Array.from(result.data.text.matchAll(/(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/g));
      const hours = Array.from(result.data.text.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:h|std|stunden)/gi));
      const next = dates.map((match, index) => {
        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3] ? (match[3].length === 2 ? '20' + match[3] : match[3]) : new Date().getFullYear());
        return {
          date: year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0'),
          hours: Number((hours[index]?.[1] ?? '0').replace(',', '.')),
        };
      }).filter((shift) => shift.hours > 0);
      setRecognized(next);
      if (!next.length) setError(t(language, 'scanError'));
    } catch {
      setError(t(language, 'scanError'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'premiumKicker')} title={t(language, 'scanTitle')} />
      <p className="notice notice-neutral">{t(language, 'scanPrivacy')}</p>
      <section className="surface form-surface form-grid">
        <label className="field">
          <span>{t(language, 'scanChoose')}</span>
          <input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] ?? null)} />
        </label>
        <button className="button button-primary" type="button" onClick={() => void runOcr()} disabled={!image || running}>
          {running ? t(language, 'scanRunning') : t(language, 'scanRun')}
        </button>
        {error && <p role="alert" className="form-error">{error}</p>}
        {ocrText && (
          <details><summary>{t(language, 'recognizedLocalText')}</summary><pre className="ocr-text">{ocrText}</pre></details>
        )}
      </section>
      {recognized.length > 0 && (
        <section className="surface form-surface">
          <h2>{t(language, 'scanReview')}</h2>
          <label className="field">
            <span>{t(language, 'selectJob')}</span>
            <select value={jobId} onChange={(event) => setJobId(event.target.value)} required>
              {jobs.map((job) => <option value={job.id} key={job.id}>{job.title}</option>)}
            </select>
          </label>
          {recognized.map((item, index) => (
            <div className="form-grid two-columns" key={index}>
              <label className="field"><span>{t(language, 'shiftDate')}</span><input type="date" value={item.date} onChange={(event) => setRecognized((items) => items.map((entry, row) => row === index ? { ...entry, date: event.target.value } : entry))} /></label>
              <label className="field"><span>{t(language, 'hoursWorked')}</span><input type="number" min="0" step=".25" value={item.hours} onChange={(event) => setRecognized((items) => items.map((entry, row) => row === index ? { ...entry, hours: Number(event.target.value) } : entry))} /></label>
            </div>
          ))}
          <button className="button button-dark" type="button" onClick={() => {
            if (!jobId || !jobs.some((job) => job.id === jobId)) return;
            onAdd(recognized.map((item) => ({ id: id(), jobId, date: item.date, hours: item.hours, planned: false })));
            setRecognized([]);
          }} disabled={!jobId || jobs.length === 0}>{t(language, 'scanSave')}</button>
        </section>
      )}
    </section>
  );
}

function Navigation({
  language,
  current,
  onNavigate,
}: {
  language: Language;
  current: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  const items: { screen: Screen; key: MessageKey }[] = [
    { screen: 'Dashboard', key: 'dashboard' },
    { screen: 'Shifts', key: 'shifts' },
    { screen: 'Jobs', key: 'jobs' },
    { screen: 'Limits', key: 'limits' },
    { screen: 'More', key: 'more' },
  ];
  const selected = current === 'Settings' || current === 'Trends' || current === 'WageCheck' ||
    current === 'Developer' || current === 'JobBoard' || current === 'PeerStats' ||
    current === 'Premium' || current === 'Scan' ? 'More' : current;

  return (
    <nav className="bottom-nav" aria-label={t(language, 'mainNavigation')}>
      {items.map((item, index) => (
        <button
          type="button"
          key={item.screen}
          className={selected === item.screen ? 'nav-item is-current' : 'nav-item'}
          aria-current={selected === item.screen ? 'page' : undefined}
          onClick={() => onNavigate(item.screen)}
        >
          <span className="nav-indicator" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span>{t(language, item.key)}</span>
        </button>
      ))}
    </nav>
  );
}

function App() {
  const [data, setData] = useState<AppState>(() => createDemoState());
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Screen>('Onboarding');
  const [features, setFeatures] = useState<Record<FeatureName, boolean>>({ ...defaultFeatures });
  const [featureReady, setFeatureReady] = useState(false);
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
      localStorage.setItem('headroom-features', JSON.stringify(features));
    } catch {
      // Feature-flag persistence is optional for demos.
    }
  }, [features, featureReady]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  }, []);

  const update = (values: Partial<AppState>) =>
    setData((current) => ({ ...current, ...values }));

  const addOrReplaceShifts = (items: Shift[]) => {
    const replaceId = items[0]?.id;
    if (items.length === 1 && data.shifts.some((shift) => shift.id === replaceId)) {
      update({ shifts: data.shifts.map((shift) => shift.id === replaceId ? items[0] : shift) });
    } else {
      update({ shifts: [...data.shifts, ...items] });
    }
  };

  const languageChanged = (value: Language) => update({ language: value });
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
          />
        );
      case 'Shifts':
        return <ShiftsPage data={data} language={language} onUpdate={(shifts) => update({ shifts })} />;
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
            features={features}
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
              try {
                localStorage.removeItem('headroom-features');
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
        return <DeveloperPage language={language} features={features} onChange={setFeatures} />;
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
      case 'Scan':
        return features.scheduleScan && features.premium && data.isPremium
          ? <ScanPage jobs={data.jobs} language={language} onAdd={addOrReplaceShifts} />
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
        ) : <>{content}{currentPage === 'Dashboard' && data.profile.age >= consentAgeRule.minimumAge && features.partnerRecommendations && <div className="partner-wrap"><PartnerPanel data={data} language={language} onUpdate={update} /></div>}</>}
        {!ready && <span className="sr-only">{t(language, 'infoOnly')}</span>}
      </main>
      {ready && data.onboarded && <Navigation language={language} current={page} onNavigate={setPage} />}
      <AppFooter language={language} />
      {checkOpen && <ShiftCheckDialog data={data} language={language} onClose={() => setCheckOpen(false)} />}
    </div>
  );
}

export default App;
