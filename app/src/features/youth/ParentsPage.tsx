import { useState } from 'react';
import { medicalExamStatus, type ParentalConsentChecklist, type Profile } from '@headroom/core';
import { PageHeading } from '../../components/PageHeading';
import { t, type Language, type MessageKey } from '../../i18n/translations';
import { dateText, localToday, money } from '../../lib/format';
import { consentText, downloadPdf, monthlyReport, monthlyReportText } from '../../lib/parentDocs';
import type { AppState } from '../../lib/storage';
import { ViolationList } from './ViolationList';

const checklistItems: { key: keyof Omit<ParentalConsentChecklist, 'signedOn'>; label: MessageKey }[] = [
  { key: 'job', label: 'consentJob' },
  { key: 'hours', label: 'consentHours' },
  { key: 'wage', label: 'consentWage' },
  { key: 'commute', label: 'consentCommute' },
];

/** Eltern und Organisatorisches: Einwilligung, Erstuntersuchung, Monatsübersicht. */
export function ParentsPage({ data, language, onProfile }: { data: AppState; language: Language; onProfile: (profile: Profile) => void }) {
  const [month, setMonth] = useState(localToday().slice(0, 7));
  const report = monthlyReport(data, month, language);
  const setChecklist = (jobId: string, values: Partial<ParentalConsentChecklist>) => {
    const current = data.profile.parentalConsent?.[jobId] ?? { job: false, hours: false, wage: false, commute: false };
    onProfile({ ...data.profile, parentalConsent: { ...data.profile.parentalConsent, [jobId]: { ...current, ...values } } });
  };
  const examJobs = data.jobs.map((job) => ({ job, status: medicalExamStatus(data.profile, job) })).filter((entry) => entry.status);

  return (
    <section className="page-enter parents-page">
      <PageHeading kicker={t(language, 'parentsKicker')} title={t(language, 'parentsTitle')} />
      <p className="muted">{t(language, 'parentsIntro')}</p>

      <section className="surface settings-card" aria-labelledby="consent-title">
        <h2 id="consent-title">{t(language, 'consentTitle')}</h2>
        <p className="muted">{t(language, 'consentIntro')}</p>
        {data.jobs.length === 0 && <p className="muted">{t(language, 'parentsNoJobs')}</p>}
        {data.jobs.map((job) => {
          const checklist = data.profile.parentalConsent?.[job.id];
          const done = checklistItems.every((item) => checklist?.[item.key]);
          return (
            <fieldset className="wide-fieldset consent-job" key={job.id}>
              <legend>{job.title}{done && <span className="pill-subtle consent-done">{t(language, 'consentComplete')}</span>}</legend>
              {checklistItems.map((item) => (
                <label className="check-row" key={item.key}>
                  <input type="checkbox" checked={Boolean(checklist?.[item.key])} onChange={(event) => setChecklist(job.id, { [item.key]: event.target.checked })} />
                  <span>{t(language, item.label)}</span>
                </label>
              ))}
              <label className="field">
                <span>{t(language, 'consentSignedOn')}</span>
                <input type="date" value={checklist?.signedOn ?? ''} onChange={(event) => setChecklist(job.id, { signedOn: event.target.value || undefined })} />
              </label>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => downloadPdf(consentText(data.profile, job, data.shifts, checklist, language), 'einverstaendnis-' + job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf')}
              >
                {t(language, 'consentPdf')}
              </button>
            </fieldset>
          );
        })}
      </section>

      {examJobs.length > 0 && (
        <section className="surface settings-card" aria-labelledby="exam-title">
          <h2 id="exam-title">{t(language, 'examTitle')}</h2>
          <p>{t(language, 'examIntro')}</p>
          <label className="field">
            <span>{t(language, 'examDate')}</span>
            <input type="date" value={data.profile.medicalExamDate ?? ''} onChange={(event) => onProfile({ ...data.profile, medicalExamDate: event.target.value || undefined })} />
          </label>
          {examJobs.map(({ job, status }) => status && (
            <div key={job.id} className={'result-line ' + (!status.required ? 'result-neutral' : status.examValid ? 'result-safe' : 'result-close')}>
              <strong>{job.title}</strong>
              <span>{!status.required
                ? t(language, status.exemptReason === 'marginalLightWork' ? 'examExemptMarginal' : 'examExemptShort')
                : status.examValid
                  ? t(language, 'examValid')
                  : t(language, 'examNeeded', { from: dateText(status.earliestExamDate, language), to: dateText(job.startDate, language) })}</span>
              <small>{status.lawRef}</small>
            </div>
          ))}
        </section>
      )}

      <section className="surface settings-card" aria-labelledby="report-title">
        <h2 id="report-title">{t(language, 'reportMonthTitle')}</h2>
        <p className="muted">{t(language, 'reportMonthIntro')}</p>
        <label className="field">
          <span>{t(language, 'month')}</span>
          <input type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} />
        </label>
        <div className="what-if-total"><span>{t(language, 'reportHours')}</span><strong>{(Math.round(report.hours * 10) / 10).toLocaleString(language === 'de' ? 'de-DE' : 'en-GB')} {t(language, 'hourShort')}</strong></div>
        <div className="what-if-total"><span>{t(language, 'reportEarnings')}</span><strong>{money(report.amount, language)}</strong></div>
        {report.violations.length
          ? <ViolationList violations={report.violations} language={language} />
          : <div className="result-line result-safe"><span>{t(language, 'youthRowNone')}</span></div>}
        <button className="button button-primary" type="button" onClick={() => downloadPdf(monthlyReportText(data, month, language), 'headroom-monat-' + month + '.pdf')}>
          {t(language, 'reportMonthPdf')}
        </button>
      </section>
    </section>
  );
}
