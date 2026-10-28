import { useState } from 'react';
import { annualMiniProjection, consentAgeRule, limitsForYear, monthlyLimitCheck, taxRefundHint, usableLimitValue } from '@headroom/core';
import { t, type Language } from '../../i18n/translations';
import { localToday, money } from '../../lib/format';
import type { AppState } from '../../lib/storage';
import { demoPartners } from '../../mock/data';

const dismissKey = 'headroom-tax-check-dismissed';

function dismissedMonth(): string {
  try {
    return localStorage.getItem(dismissKey) ?? '';
  } catch {
    return '';
  }
}

/**
 * Steuer-Check (Advanced, Partnerhinweise): erscheint gut sichtbar unter der Monatskarte,
 * sobald der Minijob-Verdienst über einer geprüften Grenze liegt. Weggeklickt bleibt er
 * nur für den laufenden Monat weg.
 */
export function TaxAppCard({ data, language, partners = true }: { data: AppState; language: Language; partners?: boolean }) {
  const today = localToday();
  const month = today.slice(0, 7);
  const year = Number(today.slice(0, 4));
  const [hiddenFor, setHiddenFor] = useState(dismissedMonth);

  // Erstattungshinweis: unabhängig von Partnern und Alter, ohne Werbung, nur mit ELSTER.
  const refund = taxRefundHint(data.jobs, data.shifts, data.payments, year, today);
  if (refund?.likelyRefund) return <TaxRefundCard language={language} projected={refund.projected} allowance={refund.basicAllowance} years={refund.yearsBack} />;

  if (!partners || data.profile.age < consentAgeRule.minimumAge || hiddenFor === month) return null;

  const monthlyLimit = limitsForYear(year).find((limit) => limit.id === 'miniJobMonthly');
  const monthly = monthlyLimit ? monthlyLimitCheck(monthlyLimit, data.shifts, data.jobs, month, year, data.payments) : null;
  const monthOver = monthly !== null && monthly.total > monthly.cap ? monthly.total - monthly.cap : 0;
  const annualCap = usableLimitValue('miniJobYearly', year);
  const annual = annualMiniProjection(data.shifts, data.jobs, year, Number(today.slice(5, 7)), data.payments);
  const yearOver = annualCap !== null && annual > annualCap;
  if (monthOver <= 0 && !yearOver) return null;

  const taxApp = demoPartners.find((partner) => partner.name === 'TaxLeaf');
  const elster = demoPartners.find((partner) => partner.name === 'ELSTER');
  const hide = () => {
    setHiddenFor(month);
    try {
      localStorage.setItem(dismissKey, month);
    } catch {
      // Ohne Speicher bleibt die Karte nur bis zum Neuladen weg.
    }
  };

  return (
    <section className="surface tax-check" aria-labelledby="tax-check-title">
      <div className="tax-check-head">
        <span className="tax-check-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h9l3 3v15H6z" />
            <path d="M9 9h6M9 13h6M9 17h3" />
          </svg>
        </span>
        <div className="tax-check-heading">
          <span className="eyebrow">{t(language, 'taxCheckKicker')}</span>
          <h2 id="tax-check-title">{t(language, 'taxCheckTitle')}</h2>
        </div>
        <button className="icon-button" type="button" aria-label={t(language, 'dismiss')} onClick={hide}>×</button>
      </div>
      <p className="tax-check-text">
        {monthOver > 0
          ? t(language, 'taxCheckMonth', { amount: money(monthOver, language) })
          : t(language, 'taxCheckYear')}
      </p>
      <div className="tax-check-actions">
        {taxApp && (
          <a
            className="button button-primary"
            href={taxApp.fictional ? '#' : taxApp.url}
            target={taxApp.fictional ? undefined : '_blank'}
            rel="noreferrer"
            onClick={(event) => { if (taxApp.fictional) event.preventDefault(); }}
          >
            {t(language, 'taxCheckApp', { name: taxApp.name })}
          </a>
        )}
        {elster && (
          <a className="button button-quiet" href={elster.url} target="_blank" rel="noreferrer">
            {t(language, 'elsterFree')}
          </a>
        )}
      </div>
      <p className="tax-check-note">
        <span className="badge-demo">{t(language, 'partnerBadge')}</span>
        {t(language, 'taxCheckNote')}
      </p>
    </section>
  );
}

function TaxRefundCard({ language, projected, allowance, years }: { language: Language; projected: number; allowance: number; years: number }) {
  const elster = demoPartners.find((partner) => partner.name === 'ELSTER');
  return (
    <section className="surface tax-check tax-refund" aria-labelledby="tax-refund-title">
      <div className="tax-check-head">
        <span className="tax-check-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12M7 10l5 5 5-5" />
            <path d="M5 20h14" />
          </svg>
        </span>
        <div className="tax-check-heading">
          <span className="eyebrow">{t(language, 'taxCheckKicker')}</span>
          <h2 id="tax-refund-title">{t(language, 'taxRefundTitle')}</h2>
        </div>
      </div>
      <p className="tax-check-text">{t(language, 'taxRefundText', { projected: money(projected, language), allowance: money(allowance, language) })}</p>
      <p className="tax-check-text">{t(language, 'taxRefundYears', { years })}</p>
      {elster && (
        <div className="tax-check-actions">
          <a className="button button-quiet" href={elster.url} target="_blank" rel="noreferrer">{t(language, 'elsterFree')}</a>
        </div>
      )}
      <p className="tax-check-note">{t(language, 'youthNotAdvice')}</p>
    </section>
  );
}
