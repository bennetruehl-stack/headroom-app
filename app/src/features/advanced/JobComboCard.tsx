import { combinationChecks, hasMainJob, jobsInYear, usableLimitValue, type ComboCheck, type ComboCheckId, type Job } from '@headroom/core';
import { ProgressBar } from '../../components/ProgressBar';
import { StatusBadge } from '../../components/StatusBadge';
import { t, type Language, type MessageKey } from '../../i18n/translations';
import { localToday, money } from '../../lib/format';
import { employmentLabel, shortTermRiskText } from '../../lib/limitText';
import type { AppState } from '../../lib/storage';

const checkText: Record<ComboCheckId, { title: MessageKey; note: MessageKey }> = {
  miniJobMonthly: { title: 'comboCheckMini', note: 'comboCheckMiniNote' },
  miniJobsBesideMain: { title: 'comboCheckBesideMain', note: 'comboCheckBesideMainNote' },
  workingStudentHours: { title: 'comboCheckHours', note: 'comboCheckHoursNote' },
  shortTermDays: { title: 'comboCheckDays', note: 'comboCheckDaysNote' },
  familyInsurance: { title: 'comboCheckFamily', note: 'comboCheckFamilyNote' },
};

const typeOrder: Job['type'][] = ['working student', 'regular', 'mini-job', 'short-term'];

function valueText(check: ComboCheck, language: Language): string {
  const limit = check.limit ?? '–';
  switch (check.unit) {
    case 'eur':
      return money(check.used, language) + ' / ' + (check.limit !== null ? money(check.limit, language) : '–');
    case 'hours':
      return t(language, 'comboHoursValue', { used: check.used, limit });
    case 'days':
      return t(language, 'comboDaysValue', { used: check.used, limit });
    default:
      return t(language, 'comboCountValue', { used: check.used, limit });
  }
}

function perJobText(check: ComboCheck, language: Language): string | null {
  if (!check.perJob || check.perJob.length < 2) return null;
  return check.perJob
    .map((row) => row.title + ': ' + (check.unit === 'eur' ? money(row.value, language) : row.value + ' h'))
    .join(' · ');
}

/**
 * Jobkombi (Advanced): erkennt aus den eigenen Jobs, welche Kombination vorliegt,
 * und zeigt die Regeln, die dann zusammen gelten. Nur mit mindestens zwei Jobs.
 */
export function JobComboCard({ data, language }: { data: AppState; language: Language }) {
  const today = localToday();
  const month = today.slice(0, 7);
  const year = Number(today.slice(0, 4));
  const result = combinationChecks({ profile: data.profile, jobs: data.jobs, shifts: data.shifts, payments: data.payments, month, today, year });
  if (result.combos.length === 0) return null;

  const yearJobs = jobsInYear(data.jobs, year);
  const parts: string[] = [];
  if (hasMainJob(data.profile, yearJobs) && !yearJobs.some((job) => job.type === 'regular')) parts.push(t(language, 'comboMainJob'));
  for (const type of typeOrder) {
    const count = yearJobs.filter((job) => job.type === type).length;
    if (count > 0) parts.push((count > 1 ? count + '× ' : '') + employmentLabel(type, language));
  }
  const miniCap = usableLimitValue('miniJobMonthly', year);

  return (
    <section className="surface job-combo" aria-labelledby="job-combo-title">
      <div className="job-combo-head">
        <span className="job-combo-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="7" width="11" height="11" rx="2.5" />
            <rect x="10" y="4" width="11" height="11" rx="2.5" />
          </svg>
        </span>
        <div>
          <span className="eyebrow">{t(language, 'comboKicker')}</span>
          <h2 id="job-combo-title">{parts.join(' + ')}</h2>
        </div>
      </div>
      <div className="job-combo-list">
        {result.checks.map((check) => {
          const text = checkText[check.id];
          const title = t(language, text.title);
          const split = perJobText(check, language);
          const outside = check.id === 'workingStudentHours' && check.inLecturePeriod === false;
          return (
            <article className="job-combo-row" key={check.id}>
              <div className="limit-row">
                <strong>{title}</strong>
                <div className="limit-row-value">
                  <span className="limit-amount">{valueText(check, language)}</span>
                  {check.status && <StatusBadge status={check.status} language={language} />}
                </div>
              </div>
              {check.ratio !== undefined && check.status && <ProgressBar ratio={check.ratio} label={title} />}
              {split && <p className="row-note job-combo-split">{split}</p>}
              <p className="row-note">
                {outside ? t(language, 'comboHoursOutside') : t(language, text.note)}
                {check.limit === null && ' ' + t(language, 'comboNoValue', { year })}
              </p>
            </article>
          );
        })}
      </div>
      {result.shortTermRisk && (
        <p className="row-note row-note-amber job-combo-risk" role="status">
          {shortTermRiskText(result.shortTermRisk, language, miniCap !== null ? money(miniCap, language) : t(language, 'miniJobCap'))}
        </p>
      )}
      <p className="job-combo-source">
        {result.combos
          .filter((combo, index, list) => list.findIndex((entry) => entry.sourceUrl === combo.sourceUrl) === index)
          .map((combo) => (
            <a key={combo.id} href={combo.sourceUrl} target="_blank" rel="noreferrer">{combo.sourceName}</a>
          ))}
      </p>
    </section>
  );
}
