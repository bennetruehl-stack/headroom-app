import { useState } from 'react';
import { dateKey, earnings, hoursInWeek, isInLecturePeriod, mondayOf, schoolCollision, statusFor, usableLimitValue, type Shift } from '@headroom/core';
import { StatusBadge } from '../../components/StatusBadge';
import { t, type Language } from '../../i18n/translations';
import { localToday, money } from '../../lib/format';
import type { AppState } from '../../lib/storage';
import { kindKeys } from './PaymentsSection';
import { ShiftForm } from './ShiftForm';

function addDays(date: string, days: number): string {
  const day = new Date(date + 'T12:00:00');
  day.setDate(day.getDate() + days);
  return dateKey(day);
}

/** ISO-Kalenderwoche (Woche mit dem ersten Donnerstag des Jahres ist KW 1). */
function isoWeek(monday: string): number {
  const thursday = new Date(addDays(monday, 3) + 'T12:00:00');
  const firstThursday = new Date(thursday.getFullYear(), 0, 4, 12);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

export const shiftKey = (shift: Shift) => shift.id ?? shift.jobId + shift.date;

export function WeekCalendar({
  data,
  language,
  onSaveEdit,
  markSchoolTime = false,
}: {
  data: AppState;
  language: Language;
  onSaveEdit: (shiftId: string, values: Shift[]) => void;
  markSchoolTime?: boolean;
}) {
  const today = localToday();
  const [monday, setMonday] = useState(() => mondayOf(today));
  const [editing, setEditing] = useState<string | null>(null);
  const locale = language === 'de' ? 'de-DE' : 'en-GB';
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const sunday = days[6];
  const weekShifts = data.shifts.filter((shift) => shift.date >= monday && shift.date <= sunday);
  const jobById = new Map(data.jobs.map((job) => [job.id, job]));
  const totalHours = hoursInWeek(data.shifts, monday);
  const weekPayments = data.payments.filter((payment) => payment.date >= monday && payment.date <= sunday);
  const paymentSum = weekPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalPay = paymentSum + weekShifts.reduce((sum, shift) => {
    const job = jobById.get(shift.jobId);
    return sum + (job ? earnings(shift, job) : 0);
  }, 0);

  // Werkstudenten: 20-Stunden-Grenze nur in der Vorlesungszeit und nur mit geprüftem Wert.
  const hourLimit = usableLimitValue('workingStudentHours', Number(monday.slice(0, 4)));
  const showHourLimit = data.profile.status === 'Working student' && hourLimit !== null && days.some((day) => isInLecturePeriod(day, data.profile));

  const short = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const asDate = (value: string) => new Date(value + 'T12:00:00');
  const hours = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 2 });

  return (
    <section className="week-calendar" aria-label={t(language, 'viewWeek')}>
      <div className="week-nav">
        <button className="icon-button" type="button" aria-label={t(language, 'previousWeek')} onClick={() => { setMonday(addDays(monday, -7)); setEditing(null); }}>‹</button>
        <div className="week-title">
          <strong>{t(language, 'calendarWeek', { week: isoWeek(monday) })}</strong>
          <span>{short.format(asDate(monday))}–{short.format(asDate(sunday))}</span>
        </div>
        <button className="icon-button" type="button" aria-label={t(language, 'nextWeek')} onClick={() => { setMonday(addDays(monday, 7)); setEditing(null); }}>›</button>
      </div>
      {monday !== mondayOf(today) && (
        <button className="text-button week-today" type="button" onClick={() => { setMonday(mondayOf(today)); setEditing(null); }}>
          {t(language, 'thisWeek')}
        </button>
      )}

      <div className="surface week-summary">
        <div>
          <span className="eyebrow">{t(language, 'weekTotal')}</span>
          <strong>{hours(totalHours)} {t(language, 'hourShort')} · {money(totalPay, language)}</strong>
          {paymentSum > 0 && (
            <span className="week-payment-sum">
              <span className="payment-dot" aria-hidden="true" />
              {t(language, 'weekPayments', { amount: money(paymentSum, language) })}
            </span>
          )}
        </div>
        {showHourLimit && hourLimit !== null && (
          <div className="week-limit">
            <span>{hours(totalHours)} / {hours(hourLimit)} {t(language, 'hourShort')}</span>
            <StatusBadge status={statusFor(totalHours / hourLimit)} language={language} />
          </div>
        )}
      </div>

      <ol className="week-days">
        {days.map((day) => {
          const dayShifts = weekShifts
            .filter((shift) => shift.date === day)
            .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
          const editShift = dayShifts.find((shift) => shiftKey(shift) === editing);
          const dayPayments = weekPayments.filter((payment) => payment.date === day);
          return (
            <li key={day} className={'week-day' + (day === today ? ' is-today' : '')} aria-current={day === today ? 'date' : undefined}>
              <div className="week-day-label">
                <span>{weekday.format(asDate(day))}</span>
                <strong>{asDate(day).getDate()}</strong>
              </div>
              <div className="week-day-shifts">
                {dayShifts.length === 0 && dayPayments.length === 0 && <span className="week-day-empty">–</span>}
                {dayPayments.map((payment) => (
                  <div key={payment.id} className="week-payment">
                    <span className="week-shift-title">
                      <span className="payment-tag">{t(language, 'oneTimeTag')}</span>
                      {jobById.get(payment.jobId)?.title ?? t(language, 'noJob')}
                    </span>
                    <span className="week-shift-meta">{t(language, kindKeys[payment.kind])} · {money(payment.amount, language)}</span>
                  </div>
                ))}
                {dayShifts.map((shift) => {
                  const job = jobById.get(shift.jobId);
                  const id = shiftKey(shift);
                  // Schulzeit-Kollision nach Stundenplan und Ferien aus dem Profil.
                  const duringSchool = markSchoolTime && schoolCollision(data.profile, shift) === 'during';
                  return (
                    <button
                      key={id}
                      type="button"
                      className={'week-shift' + (shift.planned ? ' is-planned' : '') + (editing === id ? ' is-editing' : '') + (duringSchool ? ' is-school-collision' : '')}
                      aria-expanded={editing === id}
                      onClick={() => setEditing(editing === id ? null : id)}
                    >
                      <span className="week-shift-title">{job?.title ?? t(language, 'noJob')}</span>
                      <span className="week-shift-meta">
                        {shift.startTime && shift.endTime ? `${shift.startTime}–${shift.endTime}` : `${hours(shift.hours)} ${t(language, 'hourShort')}`}
                        {' · '}
                        {money(job ? earnings(shift, job) : 0, language)}
                        {shift.planned && <> · {t(language, 'planned')}</>}
                      </span>
                      {duringSchool && <span className="week-shift-flag">{t(language, 'schoolCollisionLabel')}</span>}
                    </button>
                  );
                })}
              </div>
              {editShift && (
                <div className="week-day-edit">
                  <ShiftForm
                    jobs={data.jobs}
                    language={language}
                    initial={{ ...editShift, id: shiftKey(editShift) }}
                    onCancel={() => setEditing(null)}
                    onSave={(values) => {
                      onSaveEdit(shiftKey(editShift), values);
                      setEditing(null);
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {weekShifts.length === 0 && weekPayments.length === 0 && <p className="week-empty">{t(language, 'noShiftsThisWeek')}</p>}
    </section>
  );
}
