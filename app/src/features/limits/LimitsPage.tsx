import { useMemo, useState } from 'react';
import { activeLimits, availableLimitYears, isStudentMode, limitsForYear, roleTier, type Limit, type Profile } from '@headroom/core';
import { references } from '@headroom/core/data/references';
import { PageHeading } from '../../components/PageHeading';
import { t, type Language } from '../../i18n/translations';
import { dateText, localToday } from '../../lib/format';
import { showLimitInStudentMode } from '../../config/studentMode';
import { grossEquivalentNote, limitConsequence, limitName, limitSourceName, periodLabel } from '../../lib/limitText';

export function LimitsPage({ language, profile }: { language: Language; profile: Profile }) {
  // Jahresauswahl aus den hinterlegten Daten; fehlt das aktuelle Jahr, zeigt die Seite das nächstliegende.
  const yearOptions = availableLimitYears();
  const currentYear = new Date().getFullYear();
  const fallbackYear = yearOptions.reduce((best, value) => (Math.abs(value - currentYear) < Math.abs(best - currentYear) ? value : best), yearOptions[0] ?? currentYear);
  const [year, setYear] = useState(yearOptions.includes(currentYear) ? currentYear : fallbackYear);
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
  const shown = all.length ? all : [];
  const isPrimary = (limit: Limit) =>
    active.some((item) => item.id === limit.id) && roleTier(profile.status, limit.id) === 'primary';
  const primaryLimits = shown.filter(isPrimary);
  // Im Schüler-Modus fallen Grenzen weg, die für das Profil nicht gelten.
  const studentMode = isStudentMode(profile, localToday());
  const otherLimits = shown.filter((limit) => !isPrimary(limit) && showLimitInStudentMode(active.some((item) => item.id === limit.id), studentMode));
  const renderLimit = (limit: Limit) => (
    <article className="surface limit-card" key={limit.id + limit.validFrom}>
      <div className="limit-card-top">
        <div>
          <p className="eyebrow">{limit.unit} · {periodLabel(limit.period, language)}</p>
          <h2>{limitName(limit, language)}</h2>
        </div>
        <div className="limit-value-stack">
          <strong className="limit-card-value">{limit.value === null ? '–' : new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-GB').format(limit.value)}</strong>
          {limit.value === null
            ? <span className="pill-subtle">{t(language, 'statusUnknown')}</span>
            : !limit.verified && <span className="pill-unverified">{t(language, 'unverified')}</span>}
        </div>
      </div>
      {limit.basis === 'net-allowance' && limit.value !== null && (
        <p className="condition-note">{t(language, 'legalAllowance')}{limit.grossEquivalent ? ' · ' + t(language, 'grossEquivalent') + ': ' + new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-GB').format(limit.grossEquivalent.value) + ' ' + limit.unit : ''}</p>
      )}
      <p>{limit.value === null ? t(language, 'limitUnavailable', { year }) : limitConsequence(limit, language)}</p>
      {limit.value !== null && grossEquivalentNote(limit, language) && (
        <p className="condition-note">{grossEquivalentNote(limit, language)}</p>
      )}
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
      {!yearOptions.includes(currentYear) && (
        <p className="notice notice-amber" role="status">{t(language, 'limitYearNotice', { year: currentYear, shown: year })}</p>
      )}
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
