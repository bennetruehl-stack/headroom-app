import { useEffect, useRef, useState } from 'react';
import { JobTagFindings } from '../youth/JobTagFindings';
import { consentAgeRule, employeeMiniJobStatus, type Job } from '@headroom/core';
import { PageHeading } from '../../components/PageHeading';
import type { FeatureName } from '../../config/features';
import { t, type Language } from '../../i18n/translations';
import { localToday, preciseMoney } from '../../lib/format';
import { employmentLabel } from '../../lib/limitText';
import type { AppState } from '../../lib/storage';
import { JobForm } from './JobForm';

export let lastOsmLookupAt = 0;

export function JobsPage({
  data,
  language,
  features,
  onUpdate,
}: {
  data: AppState;
  language: Language;
  features: Record<FeatureName, boolean>;
  onUpdate: (jobs: Job[]) => void;
}) {
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  // Tastatur: beim Öffnen ins erste Feld springen, nach Speichern/Abbrechen zurück zum Auslöser.
  const formRef = useRef<HTMLElement>(null);
  const openedFrom = useRef<HTMLElement | null>(null);
  const open = (value: string | 'new') => {
    openedFrom.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditing(value);
  };
  useEffect(() => {
    if (editing) {
      formRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    } else if (openedFrom.current?.isConnected) {
      openedFrom.current.focus();
      openedFrom.current = null;
    }
  }, [editing]);
  const [osmLookup, setOsmLookup] = useState<Record<string, { status: 'loading' | 'found' | 'empty' | 'error'; result?: string }>>({});
  const activeEdit = data.jobs.find((job) => job.id === editing);
  const today = localToday();
  const miniJobs = data.jobs.filter((job) => job.type === 'mini-job' && job.startDate <= today && (!job.endDate || job.endDate >= today)).length;
  const employeeRule = data.profile.status === 'Employee' && data.profile.hasMainJob !== false
    ? employeeMiniJobStatus(miniJobs)
    : null;

  const checkCompanyInOsm = async (job: Job) => {
    if (!job.company || !job.city || data.profile.age < consentAgeRule.minimumAge) return;
    setOsmLookup((current) => ({ ...current, [job.id]: { status: 'loading' } }));
    try {
      const delay = Math.max(0, 1_000 - (Date.now() - lastOsmLookupAt));
      if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
      lastOsmLookupAt = Date.now();
      const query = new URLSearchParams({
        q: `${job.company}, ${job.city}, Deutschland`,
        format: 'jsonv2',
        limit: '1',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${query.toString()}`);
      if (!response.ok) throw new Error('OpenStreetMap lookup failed');
      const matches = await response.json() as { display_name?: string }[];
      setOsmLookup((current) => ({
        ...current,
        [job.id]: matches[0]?.display_name
          ? { status: 'found', result: matches[0].display_name }
          : { status: 'empty' },
      }));
    } catch {
      setOsmLookup((current) => ({ ...current, [job.id]: { status: 'error' } }));
    }
  };

  return (
    <section className="page-enter">
      <PageHeading
        kicker={t(language, 'jobsKicker')}
        title={t(language, 'jobs')}
        trailing={<button className="button button-primary" type="button" onClick={() => open('new')}>{t(language, 'createJob')} <span aria-hidden="true">+</span></button>}
      />

      {employeeRule?.over && (
        <div className="notice notice-amber">
          {t(language, 'profileJobRule')}
        </div>
      )}

      {editing && (
        <section ref={formRef} className="surface form-surface">
          <div className="section-heading">
            <div><p className="eyebrow">{t(language, editing === 'new' ? 'newEntryKicker' : 'editEntryKicker')}</p><h2>{editing === 'new' ? t(language, 'createJob') : t(language, 'updateJob')}</h2></div>
            <button className="icon-button" type="button" aria-label={t(language, 'closeDialog')} onClick={() => setEditing(null)}>×</button>
          </div>
          <JobForm
            language={language}
            initial={activeEdit}
            jobs={data.jobs}
            shifts={data.shifts}
            payments={data.payments}
            profile={data.profile}
            onCancel={() => setEditing(null)}
            onSave={(job) => {
              onUpdate(editing === 'new'
                ? [...data.jobs, job]
                : data.jobs.map((item) => item.id === job.id ? job : item));
              setEditing(null);
            }}
          />
        </section>
      )}

      {data.jobs.length === 0 && !editing && <div className="empty-panel">{t(language, 'noJobs')}</div>}
      <div className="stack-list">
        {data.jobs.map((job) => {
          const jobShifts = data.shifts.filter((shift) => shift.jobId === job.id);
          return (
            <article className="surface job-card" key={job.id}>
              <div className="job-card-top">
                <div className="job-avatar" aria-hidden="true">{job.title.slice(0, 1).toUpperCase()}</div>
                <div className="job-card-heading">
                  <p className="eyebrow">{employmentLabel(job.type, language)}</p>
                  <h2>{job.title}</h2>
                  <p>{job.company ?? t(language, 'companyLocal')}{job.city ? ' · ' + job.city : ''}</p>
                </div>
                <div className="job-wage">{preciseMoney(job.wage, language)}<small>/h</small></div>
              </div>
              <div className="job-card-meta">
                <span>{t(language, 'industry')} · {job.industry || '–'}</span>
                <span>{jobShifts.length} {t(language, 'shiftCount')}</span>
              </div>
              <JobTagFindings job={job} profile={data.profile} language={language} />
              {job.tipsEnabled && <p className="field-hint">{t(language, 'tipsInfo')}</p>}
              {features.osmCompanyCheck && job.company && job.city && (
                <details className="osm-lookup">
                  <summary>{t(language, 'osmTitle')}</summary>
                  <p>{t(language, 'osmExplain')}</p>
                  {data.profile.age < consentAgeRule.minimumAge ? (
                    <p className="notice notice-amber">{t(language, 'optInsBlocked')}</p>
                  ) : (
                    <button className="button button-quiet" type="button" disabled={osmLookup[job.id]?.status === 'loading'} onClick={() => void checkCompanyInOsm(job)}>
                      {osmLookup[job.id]?.status === 'loading' ? t(language, 'osmLoading') : t(language, 'osmCheck')}
                    </button>
                  )}
                  {osmLookup[job.id]?.status === 'found' && <p className="notice notice-neutral">{t(language, 'osmFound', { name: osmLookup[job.id].result ?? '' })} · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a></p>}
                  {osmLookup[job.id]?.status === 'empty' && <p className="notice notice-neutral">{t(language, 'osmNoMatch')}</p>}
                  {osmLookup[job.id]?.status === 'error' && <p role="alert" className="notice notice-amber">{t(language, 'osmError')}</p>}
                </details>
              )}
              <div className="card-actions">
                <button className="text-button" type="button" onClick={() => open(job.id)}>{t(language, 'edit')}</button>
                <button className="text-button danger-text" type="button" onClick={() => {
                  if (window.confirm(t(language, 'confirmDelete'))) {
                    onUpdate(data.jobs.filter((item) => item.id !== job.id));
                  }
                }}>{t(language, 'delete')}</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
