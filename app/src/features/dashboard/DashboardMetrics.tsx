import { useState, type CSSProperties } from 'react';
import { annualProjectionBreakdown, limitsForYear, monthlyIncomeForLimit, monthlySummary, multipleMiniJobsOverCap, paymentTotal, usableLimitValue, type Limit, type MonthlyLimitCheck, type Shift } from '@headroom/core';
import type { DashboardPeriod, Screen } from '../../app/types';
import { AnimatedMoney } from '../../components/AnimatedMoney';
import { ProgressBar } from '../../components/ProgressBar';
import { SourceStamp } from '../../components/SourceStamp';
import { StatusBadge } from '../../components/StatusBadge';
import type { FeatureName } from '../../config/features';
import { t, type Language } from '../../i18n/translations';
import { localToday, money, preciseMoney } from '../../lib/format';
import { employmentLabel, limitName } from '../../lib/limitText';
import type { AppState } from '../../lib/storage';
import { ShiftForm } from '../shifts/ShiftForm';
import { InformationCards } from './InformationCards';
import { RoleLimits, roleRows } from './RoleLimits';
import { TaxAppCard } from '../advanced/TaxAppCard';
import { JobComboCard } from '../advanced/JobComboCard';

export function DashboardMetrics({
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
  features,
  onShiftCheck,
  onAddShift,
  onNavigate,
  familyAge,
  familyOver,
  period,
  onPeriod,
}: {
  data: AppState;
  language: Language;
  month: string;
  year: number;
  strictest: { limit: Limit; value: MonthlyLimitCheck; ratio: number } | null;
  monthSummary: ReturnType<typeof monthlySummary>;
  monthlySummaries: { limit: Limit; value: MonthlyLimitCheck | null }[];
  annualMini: number;
  annualMiniBreakdown: ReturnType<typeof annualProjectionBreakdown>;
  yearlyMiniCap: number | null;
  annualRegular: number;
  taxLimit: number | null;
  daysUsed: number;
  features: Record<FeatureName, boolean>;
  onShiftCheck: () => void;
  onAddShift: (shifts: Shift[]) => void;
  onNavigate: (screen: Screen) => void;
  familyAge: number | null;
  familyOver: boolean;
  period: DashboardPeriod;
  onPeriod: (period: DashboardPeriod) => void;
}) {
  const [showShiftForm, setShowShiftForm] = useState(false);
  const monthLimitText = strictest ? limitName(strictest.limit, language) : t(language, 'miniJobCap');
  const miniMonthCap = usableLimitValue('miniJobMonthly', year);
  const shortTermCap = usableLimitValue('shortTermEmployment', year);
  const noLimitsForYear = limitsForYear(year).length === 0;
  const annualMiniRecord = limitsForYear(year).find((limit) => limit.id === 'miniJobYearly');
  const taxLimitRecord = limitsForYear(year).find((limit) => limit.id === 'incomeTaxThreshold');
  const shortTermRecord = limitsForYear(year).find((limit) => limit.id === 'shortTermEmployment');
  // Ohne Einmalzahlungen: Die Warnung ist eine feste Aussage, Einmalzahlungen verteilt das Recht aufs Jahr.
  const multipleOver = multipleMiniJobsOverCap(data.shifts, data.jobs, month, miniMonthCap);
  const paymentsThisMonth = paymentTotal(data.payments, data.jobs, month);
  // Eine Hauptaktion pro Bildschirm: „Schicht eintragen“ direkt unter der großen Zahl.
  const actions = (
    <>
      <div className="action-row">
        <button className="button button-primary button-wide" type="button" aria-expanded={showShiftForm} onClick={() => setShowShiftForm((value) => !value)}>
          <span>{t(language, 'logShift')}</span><span aria-hidden="true">+</span>
        </button>
        <button className="button button-quiet button-wide" type="button" onClick={onShiftCheck}>
          <span>{t(language, 'shiftCheck')}</span><span aria-hidden="true">↗</span>
        </button>
      </div>
      <button className="text-button import-link" type="button" onClick={() => onNavigate('Import')}>
        {t(language, 'importFromCalendarOrPhoto')} <span aria-hidden="true">↓</span>
      </button>
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
    </>
  );
  const monthOverYearSafe =
    !multipleOver &&
    miniMonthCap !== null && yearlyMiniCap !== null &&
    miniMonthCap > 0 &&
    monthlyIncomeForLimit(data.shifts, data.jobs, 'miniJobMonthly', month, data.payments) > miniMonthCap &&
    annualMini <= yearlyMiniCap;

  return (
    <>
      <div
        className="segmented segmented-sliding dashboard-tabs"
        aria-label={t(language, 'currentMonth')}
        style={{ '--count': 3, '--index': ['month', 'year', 'season'].indexOf(period) } as CSSProperties}
      >
        {(['month', 'year', 'season'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={period === tab ? 'selected' : ''}
            aria-pressed={period === tab}
            onClick={() => onPeriod(tab)}
          >
            {t(language, tab)}
          </button>
        ))}
      </div>

      {noLimitsForYear && (
        <p className="notice notice-amber" role="status">{t(language, 'noLimitsForYear', { year })}</p>
      )}

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
            {monthSummary.available ? (
              <>
                <div className="metric-number"><AnimatedMoney value={monthSummary.remaining} language={language} /></div>
                <div className="metric-caption">
                  {monthSummary.over > 0
                    ? t(language, 'overBy', { amount: money(monthSummary.over, language) })
                    : monthSummary.hours !== null ? t(language, 'hoursApprox', { hours: Math.round(monthSummary.hours) }) : null}
                </div>
                {paymentsThisMonth > 0 && (
                  <p className="metric-caption payment-note">
                    <span className="payment-tag">{t(language, 'oneTimeTag')}</span>
                    {t(language, 'includesPayment', { amount: money(paymentsThisMonth, language) })}
                  </p>
                )}
                {strictest?.value.comparison === 'gross-orientation' && (
                  <p className="metric-caption"><span className="pill-subtle">{t(language, 'grossOrientation')}</span></p>
                )}
                <ProgressBar ratio={monthSummary.ratio} label={t(language, 'progress')} />
              </>
            ) : (
              <>
                <div className="metric-number">–</div>
                <p className="metric-caption">{t(language, 'monthUnavailable')}</p>
              </>
            )}
            <div className="metric-foot">
              <span>{monthSummary.available
                ? t(language, 'usedOf', { used: money(monthSummary.total, language), limit: money(strictest?.value.cap ?? miniMonthCap ?? 0, language) })
                : money(monthSummary.total, language)}</span>
              {strictest
                ? <SourceStamp limit={strictest.limit} language={language} />
                : (() => {
                    const sourceLimit = limitsForYear(year).find((limit) => limit.id === 'miniJobMonthly');
                    return sourceLimit ? <SourceStamp limit={sourceLimit} language={language} /> : null;
                  })()}
            </div>
          </section>

          {features.partnerRecommendations && <TaxAppCard data={data} language={language} />}

          {features.jobCombinations && <JobComboCard data={data} language={language} />}

          {multipleOver && (
            <div className="notice notice-over" role="status">
              <span className="info-mark" aria-hidden="true">!</span>
              <p>{t(language, 'multipleMiniJobsOver', { cap: miniMonthCap ?? '' })}</p>
            </div>
          )}

          {monthOverYearSafe && (
            <div className="notice notice-lime">
              {t(language, 'monthOverYearSafe', { cap: miniMonthCap ?? '' })}
            </div>
          )}

          {actions}

          <RoleLimits
            rows={roleRows(data, language, month, year, localToday(), daysUsed, annualRegular, features.jobCombinations)}
            status={data.profile.status}
            language={language}
          />
        </>
      )}

      {period === 'year' && (
        <section className="surface year-panel">
          <div className="metric-topline">
            <div>
              <p className="eyebrow">{year}</p>
              <h2>{t(language, 'annualMiniJobs')}</h2>
            </div>
            <StatusBadge status={monthlySummary(annualMini, yearlyMiniCap).status} language={language} />
          </div>
          <div className="metric-number">{money(annualMini, language)}</div>
          <p className="metric-caption">{t(language, 'projection')} · {t(language, 'annualLimit')}: {yearlyMiniCap === null ? t(language, 'statusUnknown') : money(yearlyMiniCap, language)}</p>
          {annualMiniRecord && <SourceStamp limit={annualMiniRecord} language={language} />}
          {yearlyMiniCap !== null
            ? <ProgressBar ratio={yearlyMiniCap > 0 ? annualMini / yearlyMiniCap : 0} label={t(language, 'annualMiniJobs')} />
            : <p className="row-note">{t(language, 'limitUnavailable', { year })}</p>}
          {multipleOver && (
            <div className="notice notice-over">
              <span className="info-mark" aria-hidden="true">!</span>
              <p>{t(language, 'multipleMiniJobsOver', { cap: miniMonthCap ?? '' })}</p>
            </div>
          )}
          <details className="method-details">
            <summary>{t(language, 'projectionMethod').split('.')[0]}</summary>
            <p>{t(language, 'projectionMethod')}</p>
          </details>
          <div className="tax-reference">
            <div className="tax-reference-head">
              <strong>{t(language, 'approximateTaxThreshold')}</strong>
              <span className="tax-reference-value">
                {taxLimit === null ? '–' : money(taxLimit, language)}
                {taxLimitRecord && !taxLimitRecord.verified && <span className="pill-unverified">{t(language, 'unverified')}</span>}
              </span>
            </div>
            <p>{t(language, 'taxThresholdNote')}</p>
            {taxLimitRecord && <SourceStamp limit={taxLimitRecord} language={language} />}
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
      {period === 'year' && actions}

      {period === 'season' && (
        <section className="surface season-panel">
          <p className="eyebrow">{year}</p>
          <h2>{t(language, 'seasonDays')}</h2>
          <div className="metric-number season-number">
            {daysUsed}<span> / {shortTermCap ?? '–'}</span>
          </div>
          {shortTermCap !== null ? (
            <>
              <p className="metric-caption">
                {t(language, 'daysOf', { used: daysUsed, limit: shortTermCap })}
              </p>
              <ProgressBar
                ratio={daysUsed / Math.max(1, shortTermCap)}
                label={t(language, 'seasonDays')}
              />
            </>
          ) : (
            <p className="row-note">{t(language, 'limitUnavailable', { year })}</p>
          )}
          {shortTermRecord && <SourceStamp limit={shortTermRecord} language={language} />}
          {shortTermCap !== null && daysUsed > shortTermCap && (
            <StatusBadge status="Over" language={language} />
          )}
        </section>
      )}
      {period === 'season' && actions}

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

      <InformationCards
        data={data}
        language={language}
        familyAge={familyAge}
        familyOver={familyOver}
        features={features}
        year={year}
      />
    </>
  );
}
