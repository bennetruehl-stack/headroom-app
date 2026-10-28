import { useEffect, useState, type FormEvent } from 'react';
import { inputRules, validateDate, validateNumber, type Job, type Shift } from '@headroom/core';
import { t, type Language } from '../../i18n/translations';
import { hoursFromTimes, id, localToday, withLocalDate } from '../../lib/format';
import { dateError, numberError, numberInputValue } from '../../lib/inputErrors';

export function ShiftForm({
  jobs,
  language,
  initial,
  onSave,
  onCancel,
}: {
  jobs: Job[];
  language: Language;
  initial?: Shift;
  onSave: (shifts: Shift[]) => void;
  onCancel?: () => void;
}) {
  const [jobId, setJobId] = useState(initial?.jobId ?? jobs[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? localToday());
  const [hours, setHours] = useState(initial?.hours ? numberInputValue(initial.hours, language) : '');
  const [start, setStart] = useState(initial?.startTime ?? '');
  const [end, setEnd] = useState(initial?.endTime ?? '');
  const [breakStart, setBreakStart] = useState(initial?.breaks?.[0]?.start ?? '');
  const [breakEnd, setBreakEnd] = useState(initial?.breaks?.[0]?.end ?? '');
  const [planned, setPlanned] = useState(Boolean(initial?.planned));
  const [weekly, setWeekly] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setJobId(initial?.jobId ?? jobs[0]?.id ?? '');
    setDate(initial?.date ?? localToday());
    setHours(initial?.hours ? numberInputValue(initial.hours, language) : '');
    setStart(initial?.startTime ?? '');
    setEnd(initial?.endTime ?? '');
    setBreakStart(initial?.breaks?.[0]?.start ?? '');
    setBreakEnd(initial?.breaks?.[0]?.end ?? '');
    setPlanned(Boolean(initial?.planned));
  }, [initial, jobs]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const job = jobs.find((item) => item.id === jobId);
    if (!job) {
      setError(t(language, 'noJob'));
      return;
    }
    const dateMessage = dateError(validateDate(date), t(language, 'shiftDate'), language);
    if (dateMessage) { setError(dateMessage); return; }
    if (date < job.startDate || (job.endDate && date > job.endDate)) {
      setError(t(language, 'errShiftOutsideJob'));
      return;
    }
    let duration: number;
    const breaks = start && end && breakStart && breakEnd ? [{ start: breakStart, end: breakEnd }] : undefined;
    if (start && end) {
      // Die Pause zählt nicht als Arbeitszeit.
      const pause = breaks ? hoursFromTimes(breakStart, breakEnd) : 0;
      duration = hoursFromTimes(start, end) - (Number.isFinite(pause) && pause > 0 ? pause : 0);
      if (!Number.isFinite(duration) || duration <= 0) { setError(t(language, 'shiftValidation')); return; }
    } else {
      const parsed = validateNumber(hours, inputRules.shiftHours);
      const message = numberError(parsed, t(language, 'hoursWorked'), language);
      if (message || !parsed.ok || parsed.value === null) { setError(message || t(language, 'shiftValidation')); return; }
      duration = parsed.value;
    }
    // job.surcharges ist bereits ein Anteil (25 % = 0,25); früher wurde hier ein zweites Mal durch 100 geteilt.
    const surchargeAmount = duration * job.wage * Math.max(0, job.surcharges ?? 0);
    const result: Shift[] = [];
    const count = weekly && !initial ? 12 : 1;
    const firstDate = new Date(date + 'T12:00:00');
    for (let index = 0; index < count; index += 1) {
      const shiftDate = new Date(firstDate);
      shiftDate.setDate(firstDate.getDate() + index * 7);
      const dated = withLocalDate(shiftDate);
      if (job.endDate && dated > job.endDate) break;
      result.push({
        id: initial?.id ?? id(),
        jobId,
        date: dated,
        hours: duration,
        startTime: start || undefined,
        endTime: end || undefined,
        breaks,
        planned,
        days: job.type === 'short-term' ? 1 : undefined,
        surchargeAmount,
        tips: job.tipsEnabled ? job.tips ?? 0 : undefined,
        recurring: weekly ? 'weekly' : undefined,
      });
    }
    setError('');
    onSave(result);
  };

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      <label className="field">
        <span>{t(language, 'selectJob')}</span>
        <select value={jobId} onChange={(event) => setJobId(event.target.value)} required>
          {jobs.map((job) => <option value={job.id} key={job.id}>{job.title}</option>)}
        </select>
      </label>
      <label className="field">
        <span>{t(language, 'shiftDate')}</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
      </label>
      <div className="form-grid two-columns">
        <label className="field">
          <span>{t(language, 'startTime')}</span>
          <input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label className="field">
          <span>{t(language, 'endTime')}</span>
          <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
        </label>
      </div>
      {start && end && (
        <div className="form-grid two-columns">
          <label className="field">
            <span>{t(language, 'breakStart')}</span>
            <input type="time" value={breakStart} onChange={(event) => setBreakStart(event.target.value)} aria-describedby="shift-break-hint" />
          </label>
          <label className="field">
            <span>{t(language, 'breakEnd')}</span>
            <input type="time" value={breakEnd} onChange={(event) => setBreakEnd(event.target.value)} aria-describedby="shift-break-hint" />
          </label>
          <small id="shift-break-hint" className="field-hint wide-hint">{t(language, 'breakHint')}</small>
        </div>
      )}
      <label className="field">
        <span>{t(language, 'hoursWorked')}</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          aria-describedby="shift-hours-hint"
          required={!start || !end}
        />
        <small id="shift-hours-hint">{t(language, 'exactTimeHint')}</small>
      </label>
      <label className="check-row">
        <input type="checkbox" checked={planned} onChange={(event) => setPlanned(event.target.checked)} />
        <span>{t(language, 'plannedShift')}</span>
      </label>
      {!initial && (
        <label className="check-row">
          <input type="checkbox" checked={weekly} onChange={(event) => setWeekly(event.target.checked)} />
          <span>{t(language, 'repeatWeekly')}</span>
        </label>
      )}
      {weekly && <p className="field-hint">{t(language, 'repeatHint')}</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="button button-primary" type="submit">{initial ? t(language, 'save') : t(language, 'addShift')}</button>
        {onCancel && <button className="button button-quiet" type="button" onClick={onCancel}>{t(language, 'cancel')}</button>}
      </div>
    </form>
  );
}
