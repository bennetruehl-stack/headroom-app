import { useEffect, useState, type FormEvent } from 'react';
import { companyPlausibility, limitValue, limitsForYear, miniJobRoomBesideOthers, type Job, type Shift } from '@headroom/core';
import { jobPresets } from '@headroom/core/data/jobPresets';
import { employmentTypes } from '../../app/constants';
import { t, type Language } from '../../i18n/translations';
import { id, localToday, money } from '../../lib/format';
import { companyErrorMessage } from '../../lib/limitText';

export function JobForm({
  language,
  initial,
  jobs,
  shifts,
  onSave,
  onCancel,
}: {
  language: Language;
  initial?: Job;
  jobs: Job[];
  shifts: Shift[];
  onSave: (job: Job) => void;
  onCancel: () => void;
}) {
  const presetForInitial = jobPresets.find((preset) => preset.title_de === initial?.title || preset.title_en === initial?.title);
  const [query, setQuery] = useState('');
  const [presetId, setPresetId] = useState(presetForInitial?.id ?? jobPresets[0]?.id ?? '');
  const preset = jobPresets.find((item) => item.id === presetId);
  const [title, setTitle] = useState(initial?.title ?? (language === 'de' ? preset?.title_de ?? '' : preset?.title_en ?? ''));
  const [type, setType] = useState<Job['type']>(initial?.type ?? 'mini-job');
  const [wage, setWage] = useState(String(initial?.wage ?? limitValue('minimumWage')));
  const [startDate, setStartDate] = useState(initial?.startDate ?? localToday());
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [industry, setIndustry] = useState(initial?.industry ?? preset?.industry.wzDivision ?? '');
  const [skillLevel, setSkillLevel] = useState<Job['skillLevel']>(initial?.skillLevel ?? preset?.skillLevel ?? 1);
  const [surcharges, setSurcharges] = useState(String((initial?.surcharges ?? 0) * 100));
  const [tipsEnabled, setTipsEnabled] = useState(Boolean(initial?.tipsEnabled));
  const [tips, setTips] = useState(String(initial?.tips ?? ''));
  const [expectedWage, setExpectedWage] = useState(String(initial?.expectedWage ?? ''));
  const [keywords, setKeywords] = useState((initial?.calendarKeywords ?? []).join(', '));
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    if (!preset || initial) return;
    setTitle(language === 'de' ? preset.title_de : preset.title_en);
    setIndustry(preset.industry.wzDivision);
    setSkillLevel(preset.skillLevel);
    setType(preset.typicalEmploymentTypes[0] ?? 'mini-job');
  }, [presetId, language]);

  const thisMonth = localToday().slice(0, 7);
  const miniJobCapRecord = limitsForYear(Number(thisMonth.slice(0, 4))).find((limit) => limit.id === 'miniJobMonthly');
  // Vorab-Hinweis nur mit geprüfter Grenze und nur, wenn schon andere Minijobs Verdienst haben.
  const miniRoom = type === 'mini-job' && miniJobCapRecord?.verified && miniJobCapRecord.value
    ? miniJobRoomBesideOthers(shifts, jobs, thisMonth, initial?.id, miniJobCapRecord.value)
    : null;

  const matches = jobPresets.filter((item) => {
    const haystack = [item.title_de, item.title_en, item.area, item.area_en].join(' ').toLocaleLowerCase();
    return haystack.includes(query.toLocaleLowerCase());
  });

  const validate = (event: FormEvent) => {
    event.preventDefault();
    const checked = companyPlausibility(company, jobs.map((job) => job.company ?? '').filter(Boolean));
    if (!checked.ok) {
      setError(companyErrorMessage(checked.errorCode, language));
      return;
    }
    if (!title.trim() || Number(wage) <= 0 || !startDate) {
      setError(t(language, 'jobValidation'));
      return;
    }
    setError('');
    setSuggestion(checked.suggestion ? t(language, 'companySuggestion', { name: checked.suggestion }) : '');
    onSave({
      id: initial?.id ?? id(),
      title: title.trim(),
      type,
      wage: Number(wage),
      startDate,
      endDate: endDate || undefined,
      industry: industry.trim() || undefined,
      skillLevel,
      company: checked.normalized || undefined,
      city: city.trim() || undefined,
      surcharges: Math.max(0, Number(surcharges) || 0) / 100,
      tipsEnabled,
      tips: tipsEnabled ? Math.max(0, Number(tips) || 0) : undefined,
      expectedWage: expectedWage ? Math.max(0, Number(expectedWage)) : undefined,
      calendarKeywords: keywords.split(',').map((word) => word.trim()).filter(Boolean),
    });
  };

  return (
    <form className="form-grid" onSubmit={validate}>
      {!initial && (
        <label className="field">
          <span>{t(language, 'searchPreset')}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      )}
      <label className="field">
        <span>{t(language, 'jobTitle')}</span>
        {!initial && (
          <select value={presetId} onChange={(event) => setPresetId(event.target.value)}>
            {matches.map((item) => (
              <option value={item.id} key={item.id}>
                {(language === 'de' ? item.area : item.area_en) + ' · ' + (language === 'de' ? item.title_de : item.title_en)}
              </option>
            ))}
          </select>
        )}
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>

      <label className="field">
        <span>{t(language, 'employmentType')}</span>
        <select value={type} onChange={(event) => setType(event.target.value as Job['type'])}>
          {employmentTypes.map((item) => <option value={item.value} key={item.value}>{t(language, item.key)}</option>)}
        </select>
      </label>

      {miniRoom && miniRoom.otherJobsWithIncome > 0 && miniJobCapRecord?.value && (
        <div className={'notice ' + (miniRoom.room > 0 ? 'notice-amber' : 'notice-over')} role="status">
          <span className="info-mark" aria-hidden="true">!</span>
          <p>
            {miniRoom.room > 0
              ? t(language, 'miniJobRoomHint', { room: money(miniRoom.room, language), cap: money(miniJobCapRecord.value, language) })
              : t(language, 'miniJobRoomNone', { cap: money(miniJobCapRecord.value, language) })}
          </p>
        </div>
      )}

      <div className="form-grid two-columns">
        <label className="field">
          <span>{t(language, 'hourlyWage')}</span>
          <input type="number" min="0.01" step="0.01" value={wage} onChange={(event) => setWage(event.target.value)} required />
        </label>
        <label className="field">
          <span>{t(language, 'expectedWage')}</span>
          <input type="number" min="0" step="0.01" value={expectedWage} onChange={(event) => setExpectedWage(event.target.value)} />
        </label>
      </div>

      <div className="form-grid two-columns">
        <label className="field">
          <span>{t(language, 'startDate')}</span>
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </label>
        <label className="field">
          <span>{t(language, 'endDate')}</span>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
      </div>

      <label className="field">
        <span>{t(language, 'companyName')}</span>
        <input value={company} onChange={(event) => {
          setCompany(event.target.value);
          setSuggestion('');
          const result = companyPlausibility(event.target.value, jobs.map((job) => job.company ?? '').filter(Boolean));
          setError(result.ok ? '' : companyErrorMessage(result.errorCode, language));
          if (result.suggestion) setSuggestion(t(language, 'companySuggestion', { name: result.suggestion }));
        }} />
        <small>{t(language, 'companyLocal')}</small>
        {suggestion && <small className="inline-suggestion">{suggestion}</small>}
      </label>
      <label className="field">
        <span>{t(language, 'city')}</span>
        <input value={city} onChange={(event) => setCity(event.target.value)} autoComplete="address-level2" />
      </label>

      <div className="form-grid two-columns">
        <label className="field">
          <span>{t(language, 'industry')}</span>
          <input value={industry} onChange={(event) => setIndustry(event.target.value)} />
        </label>
        <label className="field">
          <span>{t(language, 'skillLevel')}</span>
          <select value={skillLevel} onChange={(event) => setSkillLevel(Number(event.target.value) as Job['skillLevel'])}>
            <option value="1">1 · {t(language, 'helperLevel')}</option>
            <option value="2">2 · {t(language, 'skilledLevel')}</option>
            <option value="3">3 · {t(language, 'specialistLevel')}</option>
            <option value="4">4 · {t(language, 'expertLevel')}</option>
          </select>
        </label>
      </div>

      <div className="form-grid two-columns">
        <label className="field">
          <span>{t(language, 'surcharges')}</span>
          <input type="number" min="0" step="1" value={surcharges} onChange={(event) => setSurcharges(event.target.value)} />
        </label>
        <label className="field">
          <span>{t(language, 'tips')}</span>
          <span className="inline-check">
            <input type="checkbox" checked={tipsEnabled} onChange={(event) => setTipsEnabled(event.target.checked)} />
            {t(language, 'yes')}
          </span>
          {tipsEnabled && <input type="number" min="0" step="0.01" value={tips} onChange={(event) => setTips(event.target.value)} />}
        </label>
      </div>
      <p className="field-hint wide-hint">{t(language, 'tipsInfo')}</p>
      <label className="field">
        <span>{t(language, 'calendarKeywords')}</span>
        <input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder={t(language, 'calendarKeywordsPlaceholder')} />
        <small>{t(language, 'calendarKeywordsHint')}</small>
      </label>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="form-actions">
        <button className="button button-primary" type="submit">{initial ? t(language, 'updateJob') : t(language, 'createJob')}</button>
        <button className="button button-quiet" type="button" onClick={onCancel}>{t(language, 'cancel')}</button>
      </div>
    </form>
  );
}
