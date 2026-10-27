import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { dedupeCandidates, hoursBetween, parseIcs, parseScheduleText, type Job, type ShiftCandidate, parseLocaleNumber } from '@headroom/core';
import { t, type Language, type MessageKey } from '../i18n/translations';
import type { AppState, CalendarSource } from '../lib/storage';
import {
  applyImport,
  CalendarFeedError,
  fetchCalendarFeed,
  importWindow,
  isCalendarLink,
  newId,
  syncFromIcs,
  withJobs,
  type FeedError,
} from '../lib/shiftImport';

export type ImportTab = 'calendar' | 'photo';

type Props = {
  data: AppState;
  language: Language;
  onUpdate: (values: Partial<AppState>) => void;
  onDone: () => void;
};

const feedErrorKey: Record<FeedError, MessageKey> = {
  host: 'calendarErrorHost',
  notFound: 'calendarErrorNotFound',
  offline: 'calendarErrorOffline',
  tooLarge: 'calendarErrorTooLarge',
  notCalendar: 'calendarErrorNotCalendar',
  unknown: 'calendarErrorUnknown',
};

function feedError(error: unknown): FeedError {
  return error instanceof CalendarFeedError ? error.code : 'unknown';
}

function dateLabel(value: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(value + 'T12:00:00'));
}

function timeAgo(value: string | undefined, language: Language): string {
  if (!value) return t(language, 'calendarNeverSynced');
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(new Date(value));
}

export function ImportPage({ data, language, onUpdate, onDone }: Props) {
  const [tab, setTab] = useState<ImportTab>('calendar');
  const [review, setReview] = useState<{ candidates: ShiftCandidate[]; calendarId?: string; fromPending?: boolean } | null>(null);
  const [message, setMessage] = useState('');

  if (data.jobs.length === 0) {
    return (
      <section className="page-enter">
        <Heading language={language} />
        <div className="empty-panel">{t(language, 'importNeedsJob')}</div>
      </section>
    );
  }

  if (review) {
    return (
      <section className="page-enter">
        <Heading language={language} />
        <ImportReview
          key={review.candidates.length + (review.calendarId ?? '')}
          data={data}
          language={language}
          candidates={review.candidates}
          onCancel={() => setReview(null)}
          onSave={(values, summary) => {
            onUpdate(review.fromPending ? { ...values, pendingImports: [] } : values);
            setReview(null);
            setMessage(t(language, 'importSaved', summary));
          }}
          calendarId={review.calendarId}
          pending={review.fromPending}
        />
      </section>
    );
  }

  return (
    <section className="page-enter">
      <Heading language={language} />
      <p className="page-intro">{t(language, 'importIntro')}</p>
      {message && (
        <section className="notice notice-lime import-pending" role="status">
          <p>{message}</p>
          <div className="card-actions"><button className="text-button" type="button" onClick={onDone}>{t(language, 'importOpenShifts')}</button></div>
        </section>
      )}
      {data.pendingImports.length > 0 && (
        <section className="notice notice-amber import-pending">
          <p>{t(language, 'importPending', { count: data.pendingImports.length })}</p>
          <div className="card-actions">
            <button className="text-button" type="button" onClick={() => setReview({ candidates: data.pendingImports, fromPending: true })}>
              {t(language, 'importReviewNow')}
            </button>
            <button className="text-button" type="button" onClick={() => onUpdate({ pendingImports: [] })}>{t(language, 'importDismiss')}</button>
          </div>
        </section>
      )}
      <div
        className="segmented segmented-sliding import-tabs"
        style={{ '--count': 2, '--index': tab === 'calendar' ? 0 : 1 } as CSSProperties}
      >
        {(['calendar', 'photo'] as const).map((value) => (
          <button key={value} type="button" className={tab === value ? 'selected' : ''} aria-pressed={tab === value} onClick={() => setTab(value)}>
            {t(language, value === 'calendar' ? 'importTabCalendar' : 'importTabPhoto')}
          </button>
        ))}
      </div>
      {tab === 'calendar'
        ? <CalendarImport data={data} language={language} onUpdate={onUpdate} onReview={(candidates, calendarId) => setReview({ candidates, calendarId })} />
        : <PhotoImport data={data} language={language} onReview={(candidates) => setReview({ candidates })} />}
    </section>
  );
}

function Heading({ language }: { language: Language }) {
  return (
    <div className="page-heading">
      <div><p className="eyebrow">{t(language, 'logKicker')}</p><h1>{t(language, 'importTitle')}</h1></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kalender
// ---------------------------------------------------------------------------

function CalendarImport({
  data,
  language,
  onUpdate,
  onReview,
}: {
  data: AppState;
  language: Language;
  onUpdate: (values: Partial<AppState>) => void;
  onReview: (candidates: ShiftCandidate[], calendarId: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const connect = async () => {
    setError('');
    setResult('');
    if (!isCalendarLink(url)) {
      setError(t(language, 'calendarErrorHost'));
      return;
    }
    setBusy('new');
    try {
      const text = await fetchCalendarFeed(url.trim());
      const calendar: CalendarSource = {
        id: newId(),
        name: /google/i.test(url) ? 'Google Kalender' : 'Apple iCloud',
        kind: 'url',
        url: url.trim(),
        lastSync: new Date().toISOString(),
      };
      onUpdate({ calendars: [...data.calendars, calendar] });
      setUrl('');
      openReview(text, calendar.id);
    } catch (caught) {
      setError(t(language, feedErrorKey[feedError(caught)]));
    } finally {
      setBusy(null);
    }
  };

  const openReview = (text: string, calendarId: string) => {
    const candidates = withJobs(parseIcs(text, importWindow()), data.jobs);
    if (!candidates.length) {
      setResult(t(language, 'calendarNoEvents'));
      return;
    }
    onReview(candidates, calendarId);
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setResult('');
    try {
      const text = await file.text();
      if (!text.includes('BEGIN:VCALENDAR')) {
        setError(t(language, 'calendarErrorNotCalendar'));
        return;
      }
      const calendar: CalendarSource = { id: newId(), name: file.name.replace(/\.ics$/i, ''), kind: 'file', lastSync: new Date().toISOString() };
      onUpdate({ calendars: [...data.calendars, calendar] });
      openReview(text, calendar.id);
    } catch {
      setError(t(language, 'calendarErrorNotCalendar'));
    }
  };

  const syncNow = async (calendar: CalendarSource) => {
    if (!calendar.url) return;
    setBusy(calendar.id);
    setError('');
    setResult('');
    try {
      const text = await fetchCalendarFeed(calendar.url);
      const outcome = syncFromIcs(text, calendar, data);
      onUpdate({
        shifts: outcome.shifts,
        pendingImports: outcome.pending,
        calendars: data.calendars.map((item) => item.id === calendar.id ? { ...item, lastSync: new Date().toISOString(), lastError: undefined } : item),
      });
      setResult(t(language, 'calendarSynced', { added: outcome.added, updated: outcome.updated }));
    } catch (caught) {
      const code = feedError(caught);
      onUpdate({ calendars: data.calendars.map((item) => item.id === calendar.id ? { ...item, lastError: code } : item) });
      setError(t(language, feedErrorKey[code]));
    } finally {
      setBusy(null);
    }
  };

  const subscribed = data.calendars.filter((calendar) => calendar.kind === 'url');

  return (
    <>
      {subscribed.length > 0 && (
        <section className="surface settings-card">
          <h2>{t(language, 'calendarConnected')}</h2>
          {subscribed.map((calendar) => (
            <div className="calendar-row" key={calendar.id}>
              <span>
                <strong>{calendar.name}</strong>
                <small>
                  {calendar.url ? t(language, 'calendarLastSync', { time: timeAgo(calendar.lastSync, language) }) : t(language, 'calendarLinkMissing')}
                  {calendar.lastError && ' · ' + t(language, feedErrorKey[calendar.lastError as FeedError] ?? 'calendarErrorUnknown')}
                </small>
              </span>
              <span className="calendar-actions">
                {calendar.url && (
                  <button className="text-button" type="button" disabled={busy !== null} onClick={() => void syncNow(calendar)}>
                    {busy === calendar.id ? t(language, 'calendarSyncing') : t(language, 'calendarSyncNow')}
                  </button>
                )}
                <button
                  className="text-button danger-text"
                  type="button"
                  onClick={() => onUpdate({ calendars: data.calendars.filter((item) => item.id !== calendar.id) })}
                >
                  {t(language, 'calendarDisconnect')}
                </button>
              </span>
            </div>
          ))}
          <p className="field-hint">{t(language, 'calendarAutoHint')}</p>
        </section>
      )}

      <section className="surface form-surface form-grid">
        <h2>{t(language, 'calendarConnectTitle')}</h2>
        <label className="field">
          <span>{t(language, 'calendarLink')}</span>
          <input
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
          <small>{t(language, 'calendarLinkPrivacy')}</small>
        </label>
        <button className="button button-primary" type="button" disabled={!url.trim() || busy !== null} onClick={() => void connect()}>
          {busy === 'new' ? t(language, 'calendarSyncing') : t(language, 'calendarConnect')}
        </button>
        <details className="method-details">
          <summary>{t(language, 'calendarHowGoogle')}</summary>
          <ol className="import-steps">
            <li>{t(language, 'calendarGoogle1')}</li>
            <li>{t(language, 'calendarGoogle2')}</li>
            <li>{t(language, 'calendarGoogle3')}</li>
          </ol>
        </details>
        <details className="method-details">
          <summary>{t(language, 'calendarHowApple')}</summary>
          <ol className="import-steps">
            <li>{t(language, 'calendarApple1')}</li>
            <li>{t(language, 'calendarApple2')}</li>
            <li>{t(language, 'calendarApple3')}</li>
          </ol>
        </details>
        <div className="import-divider"><span>{t(language, 'or')}</span></div>
        <label className="field">
          <span>{t(language, 'calendarFile')}</span>
          <input type="file" accept=".ics,text/calendar" onChange={(event) => { void importFile(event.target.files?.[0]); event.target.value = ''; }} />
          <small>{t(language, 'calendarFileHint')}</small>
        </label>
        {error && <p role="alert" className="form-error">{error}</p>}
        {result && <p role="status" className="field-hint">{result}</p>}
      </section>
      <p className="field-hint">{t(language, 'calendarKeywordHint')}</p>
    </>
  );
}

// ---------------------------------------------------------------------------
// Foto / Screenshot
// ---------------------------------------------------------------------------

function PhotoImport({ data, language, onReview }: { data: AppState; language: Language; onReview: (candidates: ShiftCandidate[]) => void }) {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    if (!image) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  // Screenshot direkt einfügen (Strg/Cmd+V)
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith('image/'));
      if (file) {
        setImage(file);
        setText('');
        setError('');
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const run = async () => {
    if (!image) return;
    setRunning(true);
    setProgress(0);
    setError('');
    try {
      const module = await import('tesseract.js');
      const result = await module.recognize(image, 'deu+eng', {
        logger: (entry: { status: string; progress: number }) => {
          if (entry.status === 'recognizing text') setProgress(entry.progress);
        },
      });
      setText(result.data.text);
      const candidates = withJobs(parseScheduleText(result.data.text, { year: new Date().getFullYear() }), data.jobs);
      if (!candidates.length) {
        setError(t(language, 'scanError'));
        return;
      }
      onReview(candidates);
    } catch {
      setError(t(language, 'scanError'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="surface form-surface form-grid">
      <h2>{t(language, 'photoTitle')}</h2>
      <p className="field-hint">{t(language, 'scanPrivacy')}</p>
      <label className="field">
        <span>{t(language, 'scanChoose')}</span>
        <input type="file" accept="image/*" onChange={(event) => { setImage(event.target.files?.[0] ?? null); setText(''); setError(''); }} />
        <small>{t(language, 'photoPasteHint')}</small>
      </label>
      {preview && <img className="import-preview" src={preview} alt={t(language, 'photoPreviewAlt')} />}
      <button className="button button-primary" type="button" onClick={() => void run()} disabled={!image || running}>
        {running ? t(language, 'scanRunning') + (progress ? ' ' + Math.round(progress * 100) + ' %' : '') : t(language, 'scanRun')}
      </button>
      {error && <p role="alert" className="form-error">{error}</p>}
      {text && (
        <details><summary>{t(language, 'recognizedLocalText')}</summary><pre className="ocr-text">{text}</pre></details>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Prüfen und übernehmen
// ---------------------------------------------------------------------------

type Row = ShiftCandidate & { key: string; include: boolean };

function ImportReview({
  data,
  language,
  candidates,
  calendarId,
  pending,
  onSave,
  onCancel,
}: {
  data: AppState;
  language: Language;
  candidates: ShiftCandidate[];
  calendarId?: string;
  pending?: boolean;
  onSave: (values: Partial<AppState>, summary: { added: number; updated: number }) => void;
  onCancel: () => void;
}) {
  const source = candidates[0]?.source ?? 'calendar';
  // Fotozeilen und vorgemerkte Termine sind wahrscheinlich Schichten; sonstige Kalendertermine nicht.
  const listAll = source === 'photo' || Boolean(pending);
  const [defaultJob, setDefaultJob] = useState('');
  const [rows, setRows] = useState<Row[]>(() =>
    candidates.map((candidate, index) => ({
      ...candidate,
      key: String(index),
      // Kalendertermine ohne Job (Arzt, Geburtstag …) sind standardmäßig nicht ausgewählt.
      include: listAll || Boolean(candidate.jobId),
    })));
  const [showOther, setShowOther] = useState(false);

  const effective = (row: Row): ShiftCandidate => ({ ...row, jobId: row.jobId || defaultJob || undefined });
  const chosen = rows.filter((row) => row.include && effective(row).jobId);
  const result = useMemo(
    () => dedupeCandidates(data.shifts, chosen.map(effective)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, defaultJob, data.shifts],
  );
  const statusFor = (row: Row): MessageKey | null => {
    if (!row.include) return null;
    const value = effective(row);
    if (!value.jobId) return 'importStatusNoJob';
    const match = (item: ShiftCandidate) => item.date === value.date && item.startTime === value.startTime && item.jobId === value.jobId && item.hours === value.hours;
    if (result.fresh.some(match)) return 'importStatusNew';
    if (result.updates.some((update) => match(update.candidate))) return 'importStatusUpdate';
    return 'importStatusKnown';
  };

  const change = (key: string, values: Partial<Row>) =>
    setRows((items) => items.map((row) => {
      if (row.key !== key) return row;
      const next = { ...row, ...values };
      if ((values.startTime !== undefined || values.endTime !== undefined) && next.startTime && next.endTime) {
        next.hours = Math.round(hoursBetween(next.startTime, next.endTime) * 100) / 100;
      }
      return next;
    }));

  const matched = rows.filter((row) => listAll || candidates[Number(row.key)].jobId);
  const other = rows.filter((row) => !listAll && !candidates[Number(row.key)].jobId);
  const missingJob = rows.some((row) => row.include && !row.jobId);

  const save = () => {
    const applied = applyImport(data.shifts, data.jobs, result, { calendarId });
    // Neue Stichwörter merken: Wer einen Kalendertermin von Hand einem Job zuordnet, bekommt ihn beim nächsten Abgleich automatisch.
    const learned = new Map<string, string[]>();
    for (const row of rows) {
      const original = candidates[Number(row.key)];
      if (source !== 'calendar' || !row.include || original.jobId || !row.jobId || !row.title) continue;
      learned.set(row.jobId, [...(learned.get(row.jobId) ?? []), row.title]);
    }
    const jobs: Job[] = data.jobs.map((job) => {
      const words = learned.get(job.id);
      if (!words) return job;
      return { ...job, calendarKeywords: Array.from(new Set([...(job.calendarKeywords ?? []), ...words])) };
    });
    onSave({ shifts: applied.shifts, ...(learned.size ? { jobs } : {}) }, { added: applied.added, updated: applied.updated });
  };

  const renderRow = (row: Row) => {
    const status = statusFor(row);
    return (
      <article className={'surface import-row' + (row.include ? '' : ' is-off')} key={row.key}>
        <div className="import-row-head">
          <label className="check-row">
            <input type="checkbox" checked={row.include} onChange={(event) => change(row.key, { include: event.target.checked })} />
            <span><strong>{dateLabel(row.date, language)}</strong>{row.title && <small>{row.title}</small>}</span>
          </label>
          {status && <span className={'pill-subtle import-status import-status-' + status}>{t(language, status)}</span>}
        </div>
        {row.include && (
          <div className="form-grid import-row-fields">
            <label className="field">
              <span>{t(language, 'selectJob')}</span>
              <select value={row.jobId ?? ''} onChange={(event) => change(row.key, { jobId: event.target.value || undefined })}>
                <option value="">{defaultJob ? t(language, 'importUseDefault') : t(language, 'importChooseJob')}</option>
                {data.jobs.map((job) => <option value={job.id} key={job.id}>{job.title}</option>)}
              </select>
            </label>
            <div className="form-grid three-columns">
              <label className="field"><span>{t(language, 'shiftDate')}</span><input type="date" value={row.date} onChange={(event) => change(row.key, { date: event.target.value })} /></label>
              <label className="field"><span>{t(language, 'startTime')}</span><input type="time" value={row.startTime ?? ''} onChange={(event) => change(row.key, { startTime: event.target.value || undefined })} /></label>
              <label className="field"><span>{t(language, 'endTime')}</span><input type="time" value={row.endTime ?? ''} onChange={(event) => change(row.key, { endTime: event.target.value || undefined })} /></label>
            </div>
            {!(row.startTime && row.endTime) && (
              <label className="field">
                <span>{t(language, 'hoursWorked')}</span>
                <input type="number" min="0.25" max="16" step="0.25" value={row.hours} onChange={(event) => {
                  const value = parseLocaleNumber(event.target.value);
                  if (value !== null && value >= 0 && value <= 24) change(row.key, { hours: value });
                }} />
              </label>
            )}
          </div>
        )}
      </article>
    );
  };

  const count = result.fresh.length + result.updates.length;

  return (
    <>
      <p className="page-intro">{t(language, source === 'photo' ? 'importReviewPhoto' : 'importReviewCalendar')}</p>
      <div className="import-summary" role="status">
        <span><strong>{result.fresh.length}</strong> {t(language, 'importStatusNew')}</span>
        <span><strong>{result.updates.length}</strong> {t(language, 'importStatusUpdate')}</span>
        <span><strong>{result.duplicates.length}</strong> {t(language, 'importStatusKnown')}</span>
      </div>
      {result.duplicates.length > 0 && <p className="field-hint">{t(language, 'importDuplicateHint')}</p>}
      {(missingJob || listAll) && (
        <label className="field surface form-surface">
          <span>{t(language, 'importDefaultJob')}</span>
          <select value={defaultJob} onChange={(event) => setDefaultJob(event.target.value)}>
            <option value="">{t(language, 'importChooseJob')}</option>
            {data.jobs.map((job) => <option value={job.id} key={job.id}>{job.title}</option>)}
          </select>
        </label>
      )}
      {matched.length === 0 && <div className="empty-panel">{t(language, 'importNoMatches')}</div>}
      <div className="stack-list">{matched.map(renderRow)}</div>
      {other.length > 0 && (
        <section className="import-other">
          <button className="text-button" type="button" aria-expanded={showOther} onClick={() => setShowOther((value) => !value)}>
            {t(language, 'importOtherEvents', { count: other.length })} {showOther ? '−' : '+'}
          </button>
          {showOther && <div className="stack-list">{other.map(renderRow)}</div>}
        </section>
      )}
      <div className="form-actions import-actions">
        <button className="button button-primary" type="button" disabled={count === 0} onClick={save}>
          {t(language, 'importSave', { count })}
        </button>
        <button className="button button-quiet" type="button" onClick={onCancel}>{t(language, 'cancel')}</button>
      </div>
    </>
  );
}
