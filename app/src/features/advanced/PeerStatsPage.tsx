import { useEffect, useState, type FormEvent } from 'react';
import { consentAgeRule, peerMedian, peerWagePosition } from '@headroom/core';
import { jobPresets } from '@headroom/core/data/jobPresets';
import { PageHeading } from '../../components/PageHeading';
import { t, type Language } from '../../i18n/translations';
import { id, localToday, preciseMoney } from '../../lib/format';
import type { AppState } from '../../lib/storage';
import { demoPeerRows } from '../../mock/data';

export function PeerStatsPage({
  data,
  language,
  onUpdate,
}: {
  data: AppState;
  language: Language;
  onUpdate: (values: Partial<AppState>) => void;
}) {
  type PeerAggregate = { enough: boolean; count: number; median?: number; medianExpectedWage?: number; medianGap?: number };
  const [jobId, setJobId] = useState(data.jobs[0]?.id ?? '');
  const selectedJob = data.jobs.find((job) => job.id === jobId);
  const [city, setCity] = useState(selectedJob?.city ?? '');
  const [hourlyWage, setHourlyWage] = useState(String(selectedJob?.wage ?? ''));
  const [expectedWage, setExpectedWage] = useState(String(selectedJob?.expectedWage ?? ''));
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [aggregate, setAggregate] = useState<PeerAggregate | null>(null);
  const peerAllowed = data.profile.age >= consentAgeRule.minimumAge;
  const selectedPreset = jobPresets.find((preset) => preset.title_de === selectedJob?.title || preset.title_en === selectedJob?.title);
  const presetId = selectedPreset?.id ?? jobPresets.find((preset) => preset.title_de === 'Sonstiger Job')?.id ?? 'preset-31';
  const demoGroup = demoPeerRows.filter(
    (row) => row.city === city && (!selectedPreset || row.jobPresetId === presetId),
  );
  const demoMedian = peerMedian(demoGroup);
  const position = demoMedian ? peerWagePosition(Number(hourlyWage), demoMedian) : null;
  const expectationGap = expectedWage.trim() ? Number(expectedWage) - Number(hourlyWage) : Number.NaN;
  const loadAggregate = async () => {
    if (!data.peerOptIn || !city.trim() || !presetId) return;
    const query = new URLSearchParams({ jobPresetId: presetId, city: city.trim() });
    try {
      const response = await fetch('/api/peer-stats?' + query.toString());
      if (!response.ok) throw new Error('Peer statistics are unavailable');
      setAggregate(await response.json() as PeerAggregate);
    } catch {
      setAggregate(null);
    }
  };

  useEffect(() => {
    if (data.peerOptIn) void loadAggregate();
  }, [data.peerOptIn, city, presetId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!peerAllowed || !consent || !selectedJob || !city.trim() || !Number.isFinite(Number(hourlyWage)) || !Number.isFinite(Number(expectedWage)) || data.peerOptIn) return;
    const token = data.peerToken ?? id();
    if (!data.peerToken) onUpdate({ peerToken: token });
    const row = {
      deviceToken: token,
      jobPresetId: presetId,
      city: city.trim(),
      hourlyWage: Number(hourlyWage),
      expectedWage: Number(expectedWage),
      month: localToday().slice(0, 7),
    };
    try {
      const response = await fetch('/api/peer-opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
      if (!response.ok) throw new Error('Consent data could not be stored');
      onUpdate({ peerOptIn: true, peerToken: token });
      setDone(true);
      const query = new URLSearchParams({ jobPresetId: row.jobPresetId, city: row.city });
      const stats = await fetch('/api/peer-stats?' + query.toString());
      if (!stats.ok) throw new Error('Peer statistics are unavailable');
      setAggregate(await stats.json() as PeerAggregate);
    } catch {
      setError(t(language, 'peerServerUnavailable'));
    }
  };

  const revoke = async () => {
    if (!data.peerToken) {
      onUpdate({ peerOptIn: false, peerToken: undefined });
      setDone(false);
      return;
    }
    try {
      const response = await fetch('/api/peer-opt-in/' + encodeURIComponent(data.peerToken), { method: 'DELETE' });
      if (!response.ok) throw new Error('Peer rows could not be deleted');
      onUpdate({ peerOptIn: false, peerToken: undefined });
      setAggregate(null);
      setDone(false);
    } catch {
      setError(t(language, 'peerRevokeServerUnavailable'));
    }
  };

  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'voluntaryKicker')} title={t(language, 'peerTitle')} trailing={<span className="badge-demo">{t(language, 'demoBadge')}</span>} />
      <p className="page-intro">{t(language, 'peerIntro')}</p>
      {!peerAllowed ? (
        <div className="notice notice-amber">{t(language, 'optInsBlocked')}</div>
      ) : (
        <>
          <section className="surface settings-card">
            <h2>{t(language, 'demoComparison')}</h2>
            <p className="muted">{t(language, 'demoBadge')}: {demoPeerRows.length} {t(language, 'peerDataRowsNote')}</p>
            {demoMedian === null ? (
              <p>{t(language, 'peerNotEnough')}</p>
            ) : (
              <>
                <p>{t(language, 'peerPosition', { job: selectedJob?.title ?? '–', city: city || '–' })}</p>
                <div className="peer-compare">
                  <strong>{preciseMoney(Number(hourlyWage) || 0, language)} / h</strong>
                  <span>{t(language, 'demoMedian')}: {preciseMoney(demoMedian, language)} / {t(language, 'hourShort')}</span>
                  {position && <b className={'peer-position peer-' + position}>{t(language, position === 'below' ? 'peerBelow' : position === 'above' ? 'peerAbove' : 'peerUsual')}</b>}
                </div>
              </>
            )}
            <p className="field-hint">{t(language, 'expectationGap')}: {Number.isFinite(expectationGap) ? preciseMoney(expectationGap, language) : '–'} / {t(language, 'hourShort')}</p>
          </section>

          {data.peerOptIn && (
            <section className="surface settings-card">
              <h2>{t(language, 'peerAggregateTitle')}</h2>
              {!aggregate?.enough ? (
                <p>{t(language, 'peerNotEnough')}</p>
              ) : (
                <>
                  <p>{t(language, 'peerPosition', { job: selectedJob?.title ?? '–', city: city || '–' })}</p>
                  <div className="peer-compare">
                    <strong>{preciseMoney(Number(hourlyWage) || 0, language)} / {t(language, 'hourShort')}</strong>
                    <span>{t(language, 'peerGroupMedian')}: {preciseMoney(aggregate.median ?? 0, language)} / {t(language, 'hourShort')}</span>
                    <b className={'peer-position peer-' + (peerWagePosition(Number(hourlyWage) || 0, aggregate.median ?? 0))}>{t(language, peerWagePosition(Number(hourlyWage) || 0, aggregate.median ?? 0) === 'below' ? 'peerBelow' : peerWagePosition(Number(hourlyWage) || 0, aggregate.median ?? 0) === 'above' ? 'peerAbove' : 'peerUsual')}</b>
                  </div>
                  <p className="field-hint">{t(language, 'expectationGap')}: {preciseMoney(aggregate.medianGap ?? 0, language)} / {t(language, 'hourShort')} · {aggregate.count}</p>
                </>
              )}
            </section>
          )}

          {!done && !data.peerOptIn ? (
            <form className="surface form-surface form-grid" onSubmit={submit}>
              <h2>{t(language, 'enablePeerComparison')}</h2>
              <label className="field"><span>{t(language, 'selectJob')}</span><select value={jobId} onChange={(event) => {
                const nextJob = data.jobs.find((job) => job.id === event.target.value);
                setJobId(event.target.value);
                if (nextJob) {
                  setCity(nextJob.city ?? '');
                  setHourlyWage(String(nextJob.wage));
                  setExpectedWage(String(nextJob.expectedWage ?? ''));
                }
              }}>{data.jobs.map((job) => <option value={job.id} key={job.id}>{job.title}</option>)}</select></label>
              <label className="field"><span>{t(language, 'city')}</span><input value={city} onChange={(event) => setCity(event.target.value)} /></label>
              <div className="form-grid two-columns">
                <label className="field"><span>{t(language, 'hourlyWage')}</span><input type="number" min="0" step=".01" value={hourlyWage} onChange={(event) => setHourlyWage(event.target.value)} required /></label>
                <label className="field"><span>{t(language, 'expectedWage')}</span><input type="number" min="0" step=".01" value={expectedWage} onChange={(event) => setExpectedWage(event.target.value)} required /></label>
              </div>
              <label className="check-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{t(language, 'peerConsent')}</span></label>
              {error && <p role="alert" className="form-error">{error}</p>}
              {data.peerToken && <p role="alert" className="form-error">{t(language, 'peerDeletePending')}</p>}
              <button className="button button-primary" type="submit" disabled={!consent || !selectedJob}>{t(language, data.peerToken ? 'retryPeerSubmit' : 'shareWage')}</button>
              {data.peerToken && <button className="button button-quiet" type="button" onClick={() => void revoke()}>{t(language, 'retryPeerDelete')}</button>}
            </form>
          ) : (
            <section className="surface settings-card">
              <p className="notice notice-neutral">{t(language, 'peerDoneTitle')}</p>
              <button className="button button-danger" type="button" onClick={() => void revoke()}>{t(language, 'revokeConsent')}</button>
              {error && <p role="alert" className="form-error">{error}</p>}
            </section>
          )}
        </>
      )}
    </section>
  );
}
