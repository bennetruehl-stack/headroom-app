import { BASIC_INCOME_NAME, basicIncomeView } from '@headroom/core';
import { t, type Language } from '../../i18n/translations';
import { money } from '../../lib/format';
import type { AppState } from '../../lib/storage';

/** Bürgergeld der Familie: welcher Teil des Verdienstes anrechnungsfrei bleibt. Nur mit Schalter im Profil. */
export function BasicIncomeCard({ data, language, month }: { data: AppState; language: Language; month: string }) {
  const view = basicIncomeView(data.profile, data.jobs, data.shifts, data.payments, month);
  if (!view.applies) return null;
  const name = BASIC_INCOME_NAME.value[language];
  return (
    <section className="surface basic-income" aria-labelledby="basic-income-title">
      <span className="eyebrow">{t(language, 'basicIncomeKicker', { name })}</span>
      <h2 id="basic-income-title">{t(language, 'basicIncomeTitle')}</h2>
      {view.holidayIncome > 0 && <p>{t(language, 'basicIncomeHoliday', { amount: money(view.holidayIncome, language), law: view.holidayLawRef })}</p>}
      {view.allowance !== null && (
        <p>{t(language, 'basicIncomeAllowance', { amount: money(view.otherIncome, language), cap: money(view.allowance, language), law: view.allowanceLawRef })}</p>
      )}
      {view.aboveAllowance > 0 && <p className="row-note row-note-amber">{t(language, 'basicIncomeAbove', { amount: money(view.aboveAllowance, language) })}</p>}
      <p className="muted">{t(language, 'basicIncomeReport')} {t(language, 'youthNotAdvice')}</p>
    </section>
  );
}
