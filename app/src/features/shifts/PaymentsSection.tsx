import { useState, type FormEvent } from 'react';
import { inputRules, validateDate, validateNumber, type OneTimePayment, type OneTimePaymentKind } from '@headroom/core';
import { t, type Language, type MessageKey } from '../../i18n/translations';
import { dateText, id, localToday, money } from '../../lib/format';
import { dateError, numberError } from '../../lib/inputErrors';
import type { AppState } from '../../lib/storage';

export const kindKeys: Record<OneTimePaymentKind, MessageKey> = {
  bonus: 'paymentKindBonus',
  holidayPay: 'paymentKindHoliday',
  christmasBonus: 'paymentKindChristmas',
  other: 'paymentKindOther',
};

/** Einmalzahlungen erfassen. Wie sie je Grenze zählen, steht im Core (oneTimePaymentRules). */
export function PaymentsSection({
  data,
  language,
  onUpdate,
}: {
  data: AppState;
  language: Language;
  onUpdate: (payments: OneTimePayment[]) => void;
}) {
  const [jobId, setJobId] = useState(data.jobs[0]?.id ?? '');
  const [date, setDate] = useState(localToday());
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<OneTimePaymentKind>('bonus');
  const [error, setError] = useState('');
  const ordered = [...data.payments].sort((a, b) => b.date.localeCompare(a.date));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!data.jobs.some((job) => job.id === jobId)) { setError(t(language, 'noJob')); return; }
    const dateMessage = dateError(validateDate(date), t(language, 'paymentDate'), language);
    if (dateMessage) { setError(dateMessage); return; }
    const parsed = validateNumber(amount, inputRules.paymentAmount);
    const amountMessage = numberError(parsed, t(language, 'paymentAmount'), language);
    if (amountMessage || !parsed.ok || parsed.value === null) { setError(amountMessage); return; }
    setError('');
    onUpdate([...data.payments, { id: id(), jobId, date, amount: parsed.value, kind }]);
    setAmount('');
  };

  if (data.jobs.length === 0) return null;
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t(language, 'paymentsKicker')}</p>
          <h2>{t(language, 'paymentsTitle')}</h2>
        </div>
        <span className="small-count">{data.payments.length.toString().padStart(2, '0')}</span>
      </div>
      <p className="muted">{t(language, 'paymentsIntro')}</p>
      <form className="surface form-surface form-grid" onSubmit={submit} noValidate>
        <label className="field">
          <span>{t(language, 'selectJob')}</span>
          <select value={jobId} onChange={(event) => setJobId(event.target.value)}>
            {data.jobs.map((job) => <option value={job.id} key={job.id}>{job.title}</option>)}
          </select>
        </label>
        <div className="form-grid two-columns">
          <label className="field">
            <span>{t(language, 'paymentDate')}</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label className="field">
            <span>{t(language, 'paymentAmount')}</span>
            <input type="text" inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} required aria-invalid={Boolean(error) || undefined} />
          </label>
        </div>
        <label className="field">
          <span>{t(language, 'paymentKind')}</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as OneTimePaymentKind)}>
            {(Object.keys(kindKeys) as OneTimePaymentKind[]).map((value) => <option value={value} key={value}>{t(language, kindKeys[value])}</option>)}
          </select>
        </label>
        {error && <p role="alert" className="form-error">{error}</p>}
        <div className="form-actions">
          <button className="button button-quiet" type="submit">{t(language, 'addPayment')}</button>
        </div>
      </form>
      {ordered.length === 0
        ? <p className="muted">{t(language, 'paymentsEmpty')}</p>
        : (
          <div className="stack-list">
            {ordered.map((payment) => {
              const job = data.jobs.find((item) => item.id === payment.jobId);
              return (
                <article className="surface shift-card payment-card" key={payment.id}>
                  <div className="shift-card-heading">
                    <div>
                      <p className="eyebrow">{dateText(payment.date, language)}</p>
                      <h2>{job?.title ?? t(language, 'noJob')}</h2>
                    </div>
                    <strong>{money(payment.amount, language)}</strong>
                  </div>
                  <div className="shift-metadata">
                    <span className="payment-tag">{t(language, 'oneTimeTag')}</span>
                    <span className="pill-subtle">{t(language, kindKeys[payment.kind])}</span>
                  </div>
                  <div className="card-actions">
                    <button
                      className="text-button danger-text"
                      type="button"
                      onClick={() => {
                        if (window.confirm(t(language, 'confirmDelete'))) {
                          onUpdate(data.payments.filter((item) => item.id !== payment.id));
                        }
                      }}
                    >
                      {t(language, 'delete')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
    </section>
  );
}
