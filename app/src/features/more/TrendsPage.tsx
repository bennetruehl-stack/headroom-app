import { limitValue, shortDays } from '@headroom/core';
import { PageHeading } from '../../components/PageHeading';
import { t, type Language } from '../../i18n/translations';
import { localToday, money, withLocalDate } from '../../lib/format';
import type { AppState } from '../../lib/storage';

export function TrendsPage({
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
        <div className="data-row"><span>{year}</span><strong>{shortTerm} / {limitValue('shortTermEmployment', Number(year)) ?? '–'}</strong></div>
      </section>
    </section>
  );
}
