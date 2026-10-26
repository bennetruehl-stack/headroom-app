import { useMemo, useState } from 'react';
import { activeLimits, limitsForYear, roleTier, type Limit, type Profile } from '@headroom/core';
import { references } from '@headroom/core/data/references';
import { PageHeading } from '../../components/PageHeading';
import { t, type Language } from '../../i18n/translations';
import { dateText } from '../../lib/format';
import { limitConsequence, limitName, limitSourceName, periodLabel } from '../../lib/limitText';

export function LimitsPage({ language, profile }: { language: Language; profile: Profile }) {
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
  const isPrimary = (limit: Limit) =>
    active.some((item) => item.id === limit.id) && roleTier(profile.status, limit.id) === 'primary';
  const primaryLimits = shown.filter(isPrimary);
  const otherLimits = shown.filter((limit) => !isPrimary(limit));
  const renderLimit = (limit: Limit) => (
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
  );

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
      {primaryLimits.length > 0 && (
        <section className="content-section limits-group">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t(language, 'forYouKicker')}</p>
              <h2>{t(language, 'forYou')}</h2>
            </div>
            <span className="small-count">{primaryLimits.length.toString().padStart(2, '0')}</span>
          </div>
          <div className="stack-list">{primaryLimits.map(renderLimit)}</div>
        </section>
      )}
      <section className="content-section limits-group">
        <div className="section-heading">
          <div>
            <h2>{t(language, 'moreLimits')}</h2>
          </div>
          <span className="small-count">{otherLimits.length.toString().padStart(2, '0')}</span>
        </div>
        <div className="stack-list">{otherLimits.map(renderLimit)}</div>
      </section>
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
