import { limitValue, limitsForYear, wageBelowMinimum } from '@headroom/core';
import { PageHeading } from '../../components/PageHeading';
import { SourceStamp } from '../../components/SourceStamp';
import { t, type Language } from '../../i18n/translations';
import { money, preciseMoney } from '../../lib/format';
import type { AppState } from '../../lib/storage';

export function WageCheckPage({
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
