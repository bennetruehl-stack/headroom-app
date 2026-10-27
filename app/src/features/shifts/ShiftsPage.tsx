import { useState, type CSSProperties } from 'react';
import type { OneTimePayment, Shift } from '@headroom/core';
import { PageHeading } from '../../components/PageHeading';
import { t, type Language } from '../../i18n/translations';
import { dateText, money } from '../../lib/format';
import type { AppState } from '../../lib/storage';
import { PaymentsSection } from './PaymentsSection';
import { ShiftForm } from './ShiftForm';
import { WeekCalendar } from './WeekCalendar';

type ShiftView = 'list' | 'week';
const viewKey = 'headroom-shift-view';

function storedView(): ShiftView {
  try {
    return localStorage.getItem(viewKey) === 'week' ? 'week' : 'list';
  } catch {
    return 'list';
  }
}

export function ShiftsPage({
  data,
  language,
  onUpdate,
  onPayments,
  onImport,
  showCalendar = false,
}: {
  data: AppState;
  language: Language;
  onUpdate: (shifts: Shift[]) => void;
  onPayments: (payments: OneTimePayment[]) => void;
  onImport: () => void;
  showCalendar?: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [view, setView] = useState<ShiftView>(storedView);
  const activeView: ShiftView = showCalendar ? view : 'list';
  const changeView = (next: ShiftView) => {
    setView(next);
    try {
      localStorage.setItem(viewKey, next);
    } catch {
      // Ohne Speicher bleibt die Auswahl nur bis zum Neuladen.
    }
  };
  const saveEdit = (shiftId: string, values: Shift[]) => {
    // Herkunft und Kalender-Kennung bleiben erhalten; ein späterer Abgleich überschreibt die Änderung nicht.
    onUpdate(data.shifts.map((item) => (item.id ?? item.jobId + item.date) === shiftId
      ? {
        ...values[0],
        source: item.source,
        externalId: item.externalId,
        calendarId: item.calendarId,
        editedManually: item.source === 'calendar' || item.editedManually ? true : undefined,
      }
      : item));
  };
  const ordered = [...data.shifts].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="page-enter">
      <PageHeading
        kicker={t(language, 'logKicker')}
        title={t(language, 'shiftList')}
        trailing={<button className="button button-quiet heading-action" type="button" onClick={onImport}>{t(language, 'importShort')} <span aria-hidden="true">↓</span></button>}
      />
      {showCalendar && (
        <div
          className="segmented segmented-sliding shift-view-tabs"
          aria-label={t(language, 'shiftView')}
          style={{ '--count': 2, '--index': activeView === 'list' ? 0 : 1 } as CSSProperties}
        >
          {(['list', 'week'] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={activeView === option ? 'selected' : ''}
              aria-pressed={activeView === option}
              onClick={() => changeView(option)}
            >
              {t(language, option === 'list' ? 'viewList' : 'viewWeek')}
            </button>
          ))}
        </div>
      )}
      {activeView === 'week' ? (
        <WeekCalendar data={data} language={language} onSaveEdit={saveEdit} />
      ) : (
      <>
      {ordered.length === 0 && <div className="empty-panel">{t(language, 'emptyState')}</div>}
      <div className="stack-list">
        {ordered.map((shift) => {
          const job = data.jobs.find((item) => item.id === shift.jobId);
          const shiftId = shift.id ?? shift.jobId + shift.date;
          const amount = job ? shift.hours * job.wage + (shift.surchargeAmount ?? 0) : 0;
          return (
            <article className="surface shift-card" key={shiftId}>
              <div className="shift-card-heading">
                <div>
                  <p className="eyebrow">{dateText(shift.date, language)}</p>
                  <h2>{job?.title ?? t(language, 'noJob')}</h2>
                </div>
                <strong>{money(amount, language)}</strong>
              </div>
              <div className="shift-metadata">
                <span>{shift.hours.toLocaleString(language === 'de' ? 'de-DE' : 'en-GB')} {t(language, 'hourShort')}</span>
                {shift.startTime && shift.endTime && <span>{shift.startTime}–{shift.endTime}</span>}
                {shift.planned && <span className="pill-subtle">{t(language, 'planned')}</span>}
                {shift.source === 'calendar' && <span className="pill-subtle pill-source">{t(language, 'sourceCalendar')}</span>}
                {shift.source === 'photo' && <span className="pill-subtle pill-source">{t(language, 'sourcePhoto')}</span>}
                {(shift.days ?? 0) > 1 && <span>{shift.days} {t(language, 'workdayCount')}</span>}
              </div>
              {editing === shiftId ? (
                <ShiftForm
                  jobs={data.jobs}
                  language={language}
                  initial={{ ...shift, id: shiftId }}
                  onCancel={() => setEditing(null)}
                  onSave={(values) => {
                    saveEdit(shiftId, values);
                    setEditing(null);
                  }}
                />
              ) : (
                <div className="card-actions">
                  <button className="text-button" type="button" onClick={() => setEditing(shiftId)}>{t(language, 'edit')}</button>
                  <button
                    className="text-button danger-text"
                    type="button"
                    onClick={() => {
                      if (window.confirm(t(language, 'confirmDelete'))) {
                        onUpdate(data.shifts.filter((item) => (item.id ?? item.jobId + item.date) !== shiftId));
                      }
                    }}
                  >
                    {t(language, 'delete')}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      </>
      )}
      <PaymentsSection data={data} language={language} onUpdate={onPayments} />
    </section>
  );
}
