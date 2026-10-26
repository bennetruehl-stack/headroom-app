import { useEffect, useState } from 'react';
import { activeLimits, annualMiniProjection, earnings, hoursInWeek, isInLecturePeriod, limitValue, limitsForYear, monthlyIncomeForLimit, shiftCheck, shortDays, workingHoursCheck, type Shift } from '@headroom/core';
import { SourceStamp } from '../../components/SourceStamp';
import { t, type Language } from '../../i18n/translations';
import { localToday, money, prefersReducedMotion } from '../../lib/format';
import { limitName } from '../../lib/limitText';
import type { AppState } from '../../lib/storage';

export function ShiftCheckDialog({
  data,
  language,
  onClose,
}: {
  data: AppState;
  language: Language;
  onClose: () => void;
}) {
  // Schneller Austritt (180 ms), dann erst wirklich schließen. Escape schließt ebenfalls.
  const [closing, setClosing] = useState(false);
  const close = () => {
    if (closing) return;
    if (prefersReducedMotion()) { onClose(); return; }
    setClosing(true);
    window.setTimeout(onClose, 180);
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const [jobId, setJobId] = useState(data.jobs[0]?.id ?? '');
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(localToday());
  const job = data.jobs.find((item) => item.id === jobId);
  const year = Number(date.slice(0, 4));
  const month = date.slice(0, 7);
  const duration = Number(hours || 0);
  const amount = job ? duration * job.wage * (1 + Math.max(0, job.surcharges ?? 0)) : 0;
  const miniTotal = monthlyIncomeForLimit(data.shifts, data.jobs, 'miniJobMonthly', month);
  const miniCap = limitValue('miniJobMonthly', year);
  const isMini = job?.type === 'mini-job';
  const result = isMini ? shiftCheck(miniTotal, amount, miniCap) : null;
  const lecture = data.profile.status === 'Working student' && isInLecturePeriod(date, data.profile);
  const existingWeeklyHours = hoursInWeek(data.shifts, date);
  const weeklyResult = data.profile.status === 'Working student'
    ? workingHoursCheck(existingWeeklyHours + duration, lecture)
    : null;
  const hasLectureDates = (data.profile.semesterPeriods ?? []).some((period) => period.start && period.end);
  const annualMiniRecord = limitsForYear(year).find((limit) => limit.id === 'miniJobYearly');
  const annualMiniCap = annualMiniRecord?.value ?? 0;
  const projectedShift: Shift = {
    jobId,
    date,
    hours: duration,
    planned: true,
    surchargeAmount: job ? duration * job.wage * Math.max(0, job.surcharges ?? 0) : 0,
  };
  const annualMiniAfter = isMini
    ? annualMiniProjection([...data.shifts, projectedShift], data.jobs, year, Number(localToday().slice(5, 7)))
    : 0;
  const annualMiniOver = Math.max(0, annualMiniAfter - annualMiniCap);
  const shortDaysWithShift = shortDays([
    ...data.shifts.filter((shift) => data.jobs.find((entry) => entry.id === shift.jobId)?.type === 'short-term'),
    { jobId, date, hours: 1, days: job?.type === 'short-term' ? 1 : undefined },
  ], year);
  const familyLimit = activeLimits(data.profile, year).find((limit) => limit.id === 'familyInsurance');
  const currentFamilyAmount = data.shifts.reduce((sum, shift) => {
    if (!shift.date.startsWith(month)) return sum;
    const entry = data.jobs.find((candidate) => candidate.id === shift.jobId);
    return sum + (entry ? earnings(shift, entry) : 0);
  }, 0);
  const hasNonMiniIncome = data.shifts.some((shift) => {
    if (!shift.date.startsWith(month)) return false;
    const entry = data.jobs.find((candidate) => candidate.id === shift.jobId);
    return Boolean(entry && entry.type !== 'mini-job' && shift.hours > 0);
  });
  const familyCap = familyLimit && job
    ? job.type === 'mini-job' && !hasNonMiniIncome
      ? miniCap
      : familyLimit.value ?? 0
    : 0;
  const familyResult = familyLimit?.verified && familyLimit.value !== null && job
    ? shiftCheck(
        currentFamilyAmount,
        amount,
        familyCap,
      )
    : null;
  const weeklyLimitRecord = activeLimits(data.profile, year).find((limit) => limit.id === 'workingStudentHours');
  const miniMonthRecord = limitsForYear(year).find((limit) => limit.id === 'miniJobMonthly');
  const shortTermRecord = limitsForYear(year).find((limit) => limit.id === 'shortTermEmployment');
  const unverifiedActiveLimits = activeLimits(data.profile, year).filter((limit) => !limit.verified);

  return (
    <div className={'dialog-backdrop' + (closing ? ' is-closing' : '')} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className="dialog surface" role="dialog" aria-modal="true" aria-labelledby="shift-dialog-title">
        <div className="section-heading">
          <div><p className="eyebrow">{t(language, 'shiftCheck')}</p><h2 id="shift-dialog-title">{t(language, 'whatIfTitle')}</h2></div>
          <button className="icon-button" type="button" aria-label={t(language, 'closeDialog')} onClick={close}>×</button>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>{t(language, 'selectJob')}</span>
            <select value={jobId} onChange={(event) => setJobId(event.target.value)}>
              {data.jobs.map((entry) => <option value={entry.id} key={entry.id}>{entry.title}</option>)}
            </select>
          </label>
          <label className="field">
            <span>{t(language, 'shiftDate')}</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="field">
            <span>{t(language, 'hoursWorked')}</span>
            <input type="number" min="0" step="0.25" value={hours} onChange={(event) => setHours(event.target.value)} />
          </label>
        </div>
        {job && (
          <div className="what-if-results">
            <div className="what-if-total"><span>{t(language, 'shiftEarnings')}</span><strong>{money(amount, language)}</strong></div>
            {isMini && result && (
              <div className={'result-line ' + (result.over ? 'result-over' : 'result-safe')}>
                <strong>{miniMonthRecord ? limitName(miniMonthRecord, language) : t(language, 'miniJobCap')}</strong>
                <span>{result.over > 0
                  ? t(language, 'crossesLimit', { limit: money(miniCap, language), amount: money(result.over, language) })
                  : t(language, 'remainsUnder', { limit: money(miniCap, language), amount: money(Math.max(0, miniCap - result.projected), language) })}</span>
                {miniMonthRecord && <SourceStamp limit={miniMonthRecord} language={language} />}
              </div>
            )}
            {isMini && annualMiniRecord && (
              <div className={'result-line ' + (annualMiniOver ? 'result-over' : 'result-safe')}>
                <strong>{limitName(annualMiniRecord, language)}</strong>
                <span>{annualMiniOver
                  ? t(language, 'crossesLimit', { limit: money(annualMiniCap, language), amount: money(annualMiniOver, language) })
                  : t(language, 'remainsUnder', { limit: money(annualMiniCap, language), amount: money(Math.max(0, annualMiniCap - annualMiniAfter), language) })}</span>
                <SourceStamp limit={annualMiniRecord} language={language} />
              </div>
            )}
            {familyResult && (
              <div className={'result-line ' + (familyResult.over ? 'result-over' : 'result-safe')}>
                <strong>{t(language, 'sourceFamily')}</strong>
                <span>{familyResult.over > 0
                  ? t(language, 'crossesLimit', { limit: money(familyCap, language), amount: money(familyResult.over, language) })
                  : t(language, 'remainsUnder', { limit: money(familyCap, language), amount: money(familyResult.remaining, language) })}</span>
                {familyLimit && <SourceStamp limit={familyLimit} language={language} />}
              </div>
            )}
            {weeklyResult && (
              <div className={'result-line ' + (weeklyResult.over ? 'result-over' : 'result-safe')}>
                <strong>{t(language, 'sourceWorking')}</strong>
                <span>{!hasLectureDates
                  ? t(language, 'semesterDatesMissing')
                  : weeklyResult.limit === null
                  ? t(language, 'semesterBreakNoWarning')
                  : t(language, 'weeklyHoursSummary', { hours: weeklyResult.hours, limit: weeklyResult.limit })}</span>
                {weeklyLimitRecord && <SourceStamp limit={weeklyLimitRecord} language={language} />}
              </div>
            )}
            {job.type === 'short-term' && (
              <div className={'result-line ' + (shortDaysWithShift > limitValue('shortTermEmployment', year) ? 'result-over' : 'result-safe')}>
                <strong>{t(language, 'sourceShort')}</strong>
                <span>{shortDaysWithShift} / {limitValue('shortTermEmployment', year)} {t(language, 'workdayCount')}</span>
                {shortTermRecord && <SourceStamp limit={shortTermRecord} language={language} />}
              </div>
            )}
            {unverifiedActiveLimits.map((limit) => (
              <div className="result-line result-neutral" key={limit.id}>
                <strong>{limitName(limit, language)} · {t(language, 'unverified')}</strong>
                <span>{t(language, 'unverifiedNoWarning')}</span>
                <SourceStamp limit={limit} language={language} />
              </div>
            ))}
          </div>
        )}
        <button className="button button-dark button-wide" type="button" onClick={close}>{t(language, 'closeDialog')}</button>
      </section>
    </div>
  );
}
