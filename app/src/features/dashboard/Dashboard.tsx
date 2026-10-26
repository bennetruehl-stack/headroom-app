import { useState } from 'react';
import { activeLimits, annualProjectionBreakdown, limitValue, limitsForYear, monthlyIncomeForLimit, monthlySummary, roleTier, shortDays, type Limit, type Shift } from '@headroom/core';
import type { DashboardPeriod, Screen } from '../../app/types';
import type { FeatureName } from '../../config/features';
import { t, type Language, type MessageKey } from '../../i18n/translations';
import { dateText, localToday } from '../../lib/format';
import { calculateAnnualProjection, getAgeBoundary, monthlyAmountForLimit } from '../../lib/limitText';
import type { AppState } from '../../lib/storage';
import { DashboardMetrics } from './DashboardMetrics';

export function Dashboard({
  data,
  language,
  onNavigate,
  onAddShift,
  onShiftCheck,
  features,
  syncNotice,
  onDismissSync,
}: {
  data: AppState;
  language: Language;
  onNavigate: (screen: Screen) => void;
  onAddShift: (shifts: Shift[]) => void;
  onShiftCheck: () => void;
  features: Record<FeatureName, boolean>;
  syncNotice: string;
  onDismissSync: () => void;
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
  const primaryMonthly = monthlySummaries.filter(({ limit }) => roleTier(data.profile.status, limit.id) === 'primary');
  const measured = (primaryMonthly.some((item) => item.value !== null) ? primaryMonthly : monthlySummaries)
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
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const kickerKey: Record<DashboardPeriod, MessageKey> = {
    month: 'welcomeKicker',
    year: 'welcomeKickerYear',
    season: 'welcomeKickerSeason',
  };
  const familyMonthTotal = data.shifts.reduce((sum, shift) => {
    if (!shift.date.startsWith(month)) return sum;
    const job = data.jobs.find((entry) => entry.id === shift.jobId);
    return sum + (job ? Math.max(0, shift.hours) * job.wage : 0);
  }, 0);

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
                {t(language, data.example === 'lena' ? 'exampleBadgeLena' : 'exampleBadge')}
              </span>
            )}
          </div>
        </div>
      </section>

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
        familyCap={familyCap}
        familyMonthTotal={familyMonthTotal}
        period={period}
        onPeriod={setPeriod}
      />
    </div>
  );
}
