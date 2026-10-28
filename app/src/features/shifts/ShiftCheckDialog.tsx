import { useEffect, useRef, useState } from 'react';
import { activeLimits, annualMiniProjection, checkYouthLabor, holidayJobDays, shiftId, youthCheckRange, youthLaborApplies, inputRules, validateNumber, hoursInWeek, isInLecturePeriod, limitsForYear, monthlyIncomeForLimit, monthlyLimitCheck, shiftCheck, shortDays, usableLimitValue, workingHoursCheck, workingStudent26Weeks, workingStudentReferenceDate, type Shift } from '@headroom/core';
import { ProgressBar } from '../../components/ProgressBar';
import { SourceStamp } from '../../components/SourceStamp';
import { ViolationList } from '../youth/ViolationList';
import { t, type Language } from '../../i18n/translations';
import { dateText, hoursFromTimes, localToday, money, prefersReducedMotion } from '../../lib/format';
import { limitName } from '../../lib/limitText';
import { numberError } from '../../lib/inputErrors';
import { useDialogFocus } from '../../lib/useDialogFocus';
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
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus(dialogRef);
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
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');
  const youth = youthLaborApplies(data.profile, date);
  const job = data.jobs.find((item) => item.id === jobId);
  const year = Number(date.slice(0, 4));
  const month = date.slice(0, 7);
  // Leere Eingabe heißt 0 Stunden; alles andere wird zentral und lokalisiert geprüft.
  const hoursResult = hours.trim() ? validateNumber(hours, inputRules.shiftHours) : { ok: true as const, value: 0 };
  const hoursMessage = numberError(hoursResult, t(language, 'hoursWorked'), language);
  const timed = youth && startTime && endTime;
  const breaks = timed && breakStart && breakEnd ? [{ start: breakStart, end: breakEnd }] : undefined;
  const duration = timed
    ? Math.max(0, hoursFromTimes(startTime, endTime) - (breaks ? hoursFromTimes(breakStart, breakEnd) : 0))
    : hoursResult.ok ? hoursResult.value ?? 0 : 0;
  const amount = job ? duration * job.wage * (1 + Math.max(0, job.surcharges ?? 0)) : 0;
  const miniTotal = monthlyIncomeForLimit(data.shifts, data.jobs, 'miniJobMonthly', month, data.payments);
  const miniCap = usableLimitValue('miniJobMonthly', year);
  const isMini = job?.type === 'mini-job';
  const result = isMini && miniCap !== null ? shiftCheck(miniTotal, amount, miniCap) : null;
  const lecture = data.profile.status === 'Working student' && isInLecturePeriod(date, data.profile);
  const existingWeeklyHours = hoursInWeek(data.shifts, date);
  const weeklyResult = data.profile.status === 'Working student'
    ? workingHoursCheck(existingWeeklyHours + duration, lecture)
    : null;
  const hasLectureDates = (data.profile.semesterPeriods ?? []).some((period) => period.start && period.end);
  const annualMiniRecord = limitsForYear(year).find((limit) => limit.id === 'miniJobYearly');
  const annualMiniCap = usableLimitValue('miniJobYearly', year);
  const projectedShift: Shift = {
    id: 'shift-check-preview',
    jobId,
    date,
    hours: duration,
    startTime: timed ? startTime : undefined,
    endTime: timed ? endTime : undefined,
    breaks,
    planned: true,
    surchargeAmount: job ? duration * job.wage * Math.max(0, job.surcharges ?? 0) : 0,
  };
  const annualMiniAfter = isMini
    ? annualMiniProjection([...data.shifts, projectedShift], data.jobs, year, Number(localToday().slice(5, 7)), data.payments)
    : 0;
  const annualMiniOver = annualMiniCap === null ? 0 : Math.max(0, annualMiniAfter - annualMiniCap);
  const shortTermCap = usableLimitValue('shortTermEmployment', year);
  const shortDaysWithShift = shortDays([
    ...data.shifts.filter((shift) => data.jobs.find((entry) => entry.id === shift.jobId)?.type === 'short-term'),
    { jobId, date, hours: 1, days: job?.type === 'short-term' ? 1 : undefined },
  ], year);
  // Familienversicherung und BAföG: dieselbe Core-Rechnung wie in der Übersicht, mit der neuen Schicht.
  const withShift = job && duration > 0 ? [...data.shifts, projectedShift] : data.shifts;
  const familyLimit = activeLimits(data.profile, year).find((limit) => limit.id === 'familyInsurance');
  const familyResult = familyLimit && job ? monthlyLimitCheck(familyLimit, withShift, data.jobs, month, year, data.payments) : null;
  const bafoegLimit = activeLimits(data.profile, year).find((limit) => limit.id === 'bafoegSideIncome');
  const bafoegResult = bafoegLimit && job ? monthlyLimitCheck(bafoegLimit, withShift, data.jobs, month, year, data.payments) : null;
  const weeks26Limit = activeLimits(data.profile, year).find((limit) => limit.id === 'workingStudent26Weeks');
  const weeks26 = weeks26Limit && job
    ? workingStudent26Weeks(withShift, workingStudentReferenceDate(data.jobs, withShift, date), year)
    : null;
  const weeklyLimitRecord = activeLimits(data.profile, year).find((limit) => limit.id === 'workingStudentHours');
  const miniMonthRecord = limitsForYear(year).find((limit) => limit.id === 'miniJobMonthly');
  const shortTermRecord = limitsForYear(year).find((limit) => limit.id === 'shortTermEmployment');
  // Jugendarbeitsschutz: immer Monat plus angeschnittene Wochen prüfen, weil Wochen-, Ruhezeit-
  // und Wochenendregeln mehrere Schichten betreffen.
  const youthViolations = youth && job && duration > 0
    ? checkYouthLabor({ profile: data.profile, jobs: data.jobs, shifts: withShift, ...youthCheckRange(date) })
    : [];
  const previewId = shiftId(projectedShift);
  const forThisShift = youthViolations.filter((item) => item.shiftIds.includes(previewId));
  const elsewhere = youthViolations.filter((item) => !item.shiftIds.includes(previewId) && item.severity !== 'info');
  const holidayUsage = youth ? holidayJobDays(data.profile, withShift, data.jobs, year) : null;
  const unverifiedActiveLimits = activeLimits(data.profile, year).filter((limit) => !limit.verified || limit.value === null);

  return (
    <div className={'dialog-backdrop' + (closing ? ' is-closing' : '')} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section ref={dialogRef} tabIndex={-1} className="dialog surface" role="dialog" aria-modal="true" aria-labelledby="shift-dialog-title">
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
          {youth && (
            <div className="form-grid two-columns">
              <label className="field"><span>{t(language, 'startTime')}</span><input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
              <label className="field"><span>{t(language, 'endTime')}</span><input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
              {startTime && endTime && (
                <>
                  <label className="field"><span>{t(language, 'breakStart')}</span><input type="time" value={breakStart} onChange={(event) => setBreakStart(event.target.value)} /></label>
                  <label className="field"><span>{t(language, 'breakEnd')}</span><input type="time" value={breakEnd} onChange={(event) => setBreakEnd(event.target.value)} /></label>
                </>
              )}
              <small className="field-hint wide-hint">{t(language, 'youthTimesForCheck')}</small>
            </div>
          )}
          {!timed && <label className="field">
            <span>{t(language, 'hoursWorked')}</span>
            <input type="text" inputMode="decimal" autoComplete="off" value={hours} onChange={(event) => setHours(event.target.value)} aria-invalid={Boolean(hoursMessage) || undefined} aria-describedby={hoursMessage ? 'shift-check-hours-error' : undefined} />
            {hoursMessage && <small id="shift-check-hours-error" className="form-error" role="alert">{hoursMessage}</small>}
          </label>}
        </div>
        {job && (
          <div className="what-if-results">
            <div className="what-if-total"><span>{t(language, 'shiftEarnings')}</span><strong>{money(amount, language)}</strong></div>
            {youth && duration > 0 && (
              <section className="youth-check" aria-label={t(language, 'youthCheckTitle')}>
                <h3>{t(language, 'youthCheckTitle')}</h3>
                {forThisShift.length === 0 && elsewhere.length === 0
                  ? <div className="result-line result-safe"><span>{t(language, 'youthAllGood')}</span></div>
                  : <ViolationList violations={forThisShift} language={language} />}
                {elsewhere.length > 0 && (
                  <>
                    <p className="eyebrow">{t(language, 'youthAlsoThisMonth')}</p>
                    <ViolationList violations={elsewhere} language={language} />
                  </>
                )}
                {holidayUsage?.applies && (
                  <div className={'result-line ' + (holidayUsage.used > holidayUsage.limit ? 'result-over' : 'result-safe')}>
                    <strong>{t(language, 'holidayJobTitle')}</strong>
                    <span>{t(language, 'holidayJobRow', { used: holidayUsage.used, limit: holidayUsage.limit })}</span>
                    <ProgressBar ratio={holidayUsage.ratio} label={t(language, 'holidayJobTitle')} />
                    <small>{holidayUsage.lawRef}</small>
                  </div>
                )}
                <small className="muted">{t(language, 'youthNotAdvice')}</small>
              </section>
            )}
            {isMini && result && miniCap !== null && (
              <div className={'result-line ' + (result.over ? 'result-over' : 'result-safe')}>
                <strong>{miniMonthRecord ? limitName(miniMonthRecord, language) : t(language, 'miniJobCap')}</strong>
                <span>{result.over > 0
                  ? t(language, 'crossesLimit', { limit: money(miniCap, language), amount: money(result.over, language) })
                  : t(language, 'remainsUnder', { limit: money(miniCap, language), amount: money(Math.max(0, miniCap - result.projected), language) })}</span>
                {miniMonthRecord && <SourceStamp limit={miniMonthRecord} language={language} />}
              </div>
            )}
            {isMini && annualMiniRecord && annualMiniCap !== null && (
              <div className={'result-line ' + (annualMiniOver ? 'result-over' : 'result-safe')}>
                <strong>{limitName(annualMiniRecord, language)}</strong>
                <span>{annualMiniOver
                  ? t(language, 'crossesLimit', { limit: money(annualMiniCap, language), amount: money(annualMiniOver, language) })
                  : t(language, 'remainsUnder', { limit: money(annualMiniCap, language), amount: money(Math.max(0, annualMiniCap - annualMiniAfter), language) })}</span>
                <SourceStamp limit={annualMiniRecord} language={language} />
              </div>
            )}
            {familyResult && familyLimit && (
              <div className={'result-line ' + (familyResult.total > familyResult.cap ? 'result-over' : 'result-safe')}>
                <strong>{t(language, 'sourceFamily')} · {t(language, 'grossOrientation')}</strong>
                <span>{familyResult.total > familyResult.cap
                  ? t(language, 'crossesLimit', { limit: money(familyResult.cap, language), amount: money(familyResult.total - familyResult.cap, language) })
                  : t(language, 'remainsUnder', { limit: money(familyResult.cap, language), amount: money(familyResult.cap - familyResult.total, language) })}</span>
                <small>{familyResult.capSource === 'miniJobCap' ? t(language, 'familyMiniCapNote') + ' ' : ''}{t(language, 'familyGrossNote')}</small>
                <SourceStamp limit={familyLimit} language={language} />
              </div>
            )}
            {bafoegResult && bafoegLimit && bafoegLimit.value !== null && (
              <div className={'result-line ' + (bafoegResult.total > bafoegResult.cap ? 'result-over' : 'result-safe')}>
                <strong>{limitName(bafoegLimit, language)} · {t(language, 'grossOrientation')}</strong>
                <span>{bafoegResult.total > bafoegResult.cap
                  ? t(language, 'crossesLimit', { limit: money(bafoegResult.cap, language), amount: money(bafoegResult.total - bafoegResult.cap, language) })
                  : t(language, 'remainsUnder', { limit: money(bafoegResult.cap, language), amount: money(bafoegResult.cap - bafoegResult.total, language) })}</span>
                <small>{t(language, 'bafoegAllowanceLine', { allowance: money(bafoegLimit.value, language), gross: money(bafoegResult.cap, language) })}</small>
                <SourceStamp limit={bafoegLimit} language={language} />
              </div>
            )}
            {weeks26?.available && weeks26Limit && (
              <div className={'result-line ' + (weeks26.over ? 'result-over' : 'result-safe')}>
                <strong>{limitName(weeks26Limit, language)}</strong>
                <span>{t(language, 'weeks26Row', { used: weeks26.weeksOver, limit: weeks26.weekLimit })}</span>
                <small>{t(language, 'weeks26Window', { from: dateText(weeks26.windowStart, language), to: dateText(weeks26.windowEnd, language) })} {t(language, 'weeks26Limitation')}</small>
                <SourceStamp limit={weeks26Limit} language={language} />
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
            {job.type === 'short-term' && shortTermCap !== null && (
              <div className={'result-line ' + (shortDaysWithShift > shortTermCap ? 'result-over' : 'result-safe')}>
                <strong>{t(language, 'sourceShort')}</strong>
                <span>{shortDaysWithShift} / {shortTermCap} {t(language, 'workdayCount')}</span>
                {shortTermRecord && <SourceStamp limit={shortTermRecord} language={language} />}
              </div>
            )}
            {unverifiedActiveLimits.map((limit) => (
              <div className="result-line result-neutral" key={limit.id}>
                <strong>{limitName(limit, language)} · {t(language, limit.value === null ? 'statusUnknown' : 'unverified')}</strong>
                <span>{limit.value === null ? t(language, 'limitUnavailable', { year }) : t(language, 'unverifiedNoWarning')}</span>
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
