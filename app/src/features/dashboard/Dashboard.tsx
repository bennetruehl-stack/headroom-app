import { useState } from 'react';
import { activeLimits, annualProjectionBreakdown, limitsForYear, monthlyIncomeForLimit, monthlySummary, referenceHourlyWage, roleTier, shortDays, usableLimitValue, type Limit, type MonthlyLimitCheck, type Profile, type Shift } from '@headroom/core';
import type { DashboardPeriod, Screen } from '../../app/types';
import type { ActiveFeatures } from '@headroom/core';
import { t, type Language, type MessageKey } from '../../i18n/translations';
import { dateText, localToday } from '../../lib/format';
import { calculateAnnualProjection, getAgeBoundary, monthlyAmountForLimit } from '../../lib/limitText';
import type { AppState } from '../../lib/storage';
import { DashboardMetrics } from './DashboardMetrics';
import { TransitionNotices } from '../youth/TransitionNotices';

export function Dashboard({
  data,
  language,
  onNavigate,
  onAddShift,
  onShiftCheck,
  features,
  syncNotice,
  onDismissSync,
  onProfile,
}: {
  data: AppState;
  language: Language;
  onNavigate: (screen: Screen) => void;
  onAddShift: (shifts: Shift[]) => void;
  onShiftCheck: () => void;
  features: ActiveFeatures;
  syncNotice: string;
  onDismissSync: () => void;
  onProfile: (profile: Profile) => void;
}) {
  const today = localToday();
  const month = today.slice(0, 7);
  const year = Number(today.slice(0, 4));
  const yearLimits = activeLimits(data.profile, year);
  const monthlyLimits = yearLimits.filter((limit) => limit.period === 'month');
  const monthlySummaries = monthlyLimits.map((limit) => {
    const value = monthlyAmountForLimit(limit, data.jobs, data.shifts, month, year, data.payments);
    return { limit, value };
  });
  const primaryMonthly = monthlySummaries.filter(({ limit }) => roleTier(data.profile.status, limit.id) === 'primary');
  const measured = (primaryMonthly.some((item) => item.value !== null) ? primaryMonthly : monthlySummaries)
    .filter((item): item is { limit: Limit; value: MonthlyLimitCheck } => item.value !== null)
    .map((item) => ({ ...item, ratio: item.value.ratio }));
  const strictest = measured.reduce<(typeof measured)[number] | null>(
    (chosen, item) => (!chosen || item.ratio > chosen.ratio ? item : chosen),
    null,
  );

  // Unter 18 gilt der Mindestlohn nicht: Stunden dann mit dem eigenen Lohn schätzen.
  const hourlyWage = referenceHourlyWage(data.profile, data.jobs, year);
  const miniMonthly = monthlyIncomeForLimit(data.shifts, data.jobs, 'miniJobMonthly', month, data.payments);
  const monthSummary = strictest
    ? monthlySummary(strictest.value.total, strictest.value.cap, hourlyWage)
    : monthlySummary(miniMonthly, usableLimitValue('miniJobMonthly', year), hourlyWage);
  const annualMiniBreakdown = annualProjectionBreakdown(
    data.shifts,
    data.jobs,
    year,
    ['mini-job'],
    Number(today.slice(5, 7)),
    data.payments,
  );
  const annualMini = annualMiniBreakdown.projected;
  const yearlyMiniCap = usableLimitValue('miniJobYearly', year);
  const annualRegular = calculateAnnualProjection(data.shifts, data.jobs, year, [
    'regular',
    'working student',
  ], data.payments);
  const taxLimit = limitsForYear(year).find((limit) => limit.id === 'incomeTaxThreshold')?.value ?? null;
  const shortTermShifts = data.shifts.filter(
    (shift) => data.jobs.find((job) => job.id === shift.jobId)?.type === 'short-term',
  );
  const daysUsed = shortDays(shortTermShifts, year);
  const familyLimit = limitsForYear(year).find((limit) => limit.id === 'familyInsurance');
  const familyAge = getAgeBoundary(familyLimit);
  // Gleiche Rechnung wie in der Grenzwert-Zeile (Core), damit Hinweis und Zeile übereinstimmen.
  const familyCheck = familyLimit ? monthlyAmountForLimit(familyLimit, data.jobs, data.shifts, month, year, data.payments) : null;
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const kickerKey: Record<DashboardPeriod, MessageKey> = {
    month: 'welcomeKicker',
    year: 'welcomeKickerYear',
    season: 'welcomeKickerSeason',
  };

  return (
    <div className="page-enter">
      <section className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">{t(language, kickerKey[period])}</p>
          <h1>{t(language, 'welcomeTitle')}</h1>
          <div className="heading-meta">
            <time className="date-stamp" dateTime={today}>{dateText(today, language)}</time>
            {data.example && (
              <span className="badge-demo">
                {t(language, data.example === 'lena' ? 'exampleBadgeLena' : data.example === 'mia' ? 'exampleBadgeMia' : 'exampleBadge')}
              </span>
            )}
          </div>
        </div>
      </section>

      <TransitionNotices profile={data.profile} today={today} language={language} onProfile={onProfile} />

      {(syncNotice || data.pendingImports.length > 0) && (
        <section className={'notice import-pending ' + (data.pendingImports.length ? 'notice-amber' : 'notice-lime')} role="status">
          <p>
            {syncNotice}
            {syncNotice && data.pendingImports.length > 0 && ' '}
            {data.pendingImports.length > 0 && t(language, 'importPending', { count: data.pendingImports.length })}
          </p>
          <div className="card-actions">
            <button className="text-button" type="button" onClick={() => onNavigate(data.pendingImports.length ? 'Import' : 'Shifts')}>
              {t(language, data.pendingImports.length ? 'importReviewNow' : 'importOpenShifts')}
            </button>
            {syncNotice && <button className="text-button" type="button" onClick={onDismissSync}>{t(language, 'dismiss')}</button>}
          </div>
        </section>
      )}

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
        familyOver={familyCheck !== null && familyCheck.total > familyCheck.cap}
        period={period}
        onPeriod={setPeriod}
      />
    </div>
  );
}
