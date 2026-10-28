import { limitsForYear, minimumWageAssessment, usableLimitValue, wageBelowMinimum } from '@headroom/core';
import { PageHeading } from '../../components/PageHeading';
import { SourceStamp } from '../../components/SourceStamp';
import { t, type Language } from '../../i18n/translations';
import { localToday, money, preciseMoney } from '../../lib/format';
import type { AppState } from '../../lib/storage';

export function WageCheckPage({
  data,
  language,
}: {
  data: AppState;
  language: Language;
}) {
  const wageLimit = usableLimitValue('minimumWage');
  const minimumWageRecord = limitsForYear(new Date().getFullYear()).find((limit) => limit.id === 'minimumWage');
  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'referenceKicker')} title={t(language, 'wageCheckTitle')} />
      <section className="stack-list">
        {data.jobs.map((job) => {
          // Unter 18 ohne Ausbildung gilt der Mindestlohn nicht (§ 22 Abs. 2 MiLoG): Hinweis statt Fehler.
          const assessment = minimumWageAssessment(data.profile, job, localToday());
          const difference = assessment.differenceToMinimum;
          return (
          <article className="surface wage-card" key={job.id}>
            <div className="metric-topline"><h2>{job.title}</h2><strong>{preciseMoney(job.wage, language)} / h</strong></div>
            {assessment.applies && wageLimit !== null && wageBelowMinimum(job.wage, wageLimit) && (
              <p className="notice notice-amber">{t(language, 'wageBelow')} {t(language, 'source')}: {money(wageLimit, language)}/h.</p>
            )}
            {!assessment.applies && (
              <div className="notice notice-neutral youth-wage">
                <p>{t(language, 'wageYouthExempt', { law: assessment.lawRef })}</p>
                {assessment.minimumWage !== null && difference !== null && difference !== 0 && (
                  <p>{t(language, 'wageYouthCompareMin', {
                    min: preciseMoney(assessment.minimumWage, language),
                    diff: preciseMoney(Math.abs(difference), language),
                    direction: t(language, difference < 0 ? 'wageBelowWord' : 'wageAboveWord'),
                  })}</p>
                )}
                <p>{assessment.youthReference?.hourlyWage
                  ? t(language, 'wageYouthCompareTypical', { wage: preciseMoney(assessment.youthReference.hourlyWage, language), source: assessment.youthReference.sourceName })
                  : t(language, 'wageYouthNoTypical')}</p>
                <p>{t(language, 'wageAt18')}</p>
              </div>
            )}
            {minimumWageRecord && <SourceStamp limit={minimumWageRecord} language={language} />}
          </article>
          );
        })}
      </section>
      <article className="surface chart-card">
        <h2>{t(language, 'wageCheck')}</h2>
        <p>{t(language, 'entgeltatlasNote')}</p>
        <a className="button button-quiet" href="https://web.arbeitsagentur.de/entgeltatlas/" target="_blank" rel="noreferrer">Entgeltatlas ↗</a>
      </article>
    </section>
  );
}
