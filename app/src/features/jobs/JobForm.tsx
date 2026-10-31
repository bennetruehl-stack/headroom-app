import { useEffect, useState, type FormEvent } from 'react';
import { companyPlausibility, inputRules, latestKnownLimitValue, limitsForYear, miniJobRoomBesideOthers, validateDate, validateDateRange, validateNumber, type Job, type JobTag, type OneTimePayment, type Profile, type Shift, isStudentMode, JOB_TAG_RULES, tagsForJob, youthLaborApplies } from '@headroom/core';
import { jobPresets } from '@headroom/core/data/jobPresets';
import { JobTagFindings } from '../youth/JobTagFindings';
import { employmentTypes } from '../../app/constants';
import { visibleEmploymentType, visiblePreset } from '../../config/studentMode';
import { t, type Language } from '../../i18n/translations';
import { id, localToday, money } from '../../lib/format';
import { dateError, numberError, numberInputValue } from '../../lib/inputErrors';
import { companyErrorMessage } from '../../lib/limitText';

export function JobForm({
  language,
  initial,
  jobs,
  shifts,
  payments = [],
  onSave,
  onCancel,
  profile,
}: {
  language: Language;
  initial?: Job;
  jobs: Job[];
  shifts: Shift[];
  payments?: OneTimePayment[];
  /** Für den Schüler-Modus: Merkmale der Arbeit abfragen und Vorlagen markieren. */
  profile?: Profile;
  onSave: (job: Job) => void;
  onCancel: () => void;
}) {
  const presetForInitial = jobPresets.find((preset) => preset.title_de === initial?.title || preset.title_en === initial?.title);
  const [query, setQuery] = useState('');
  const [presetId, setPresetId] = useState(presetForInitial?.id ?? jobPresets[0]?.id ?? '');
  const preset = jobPresets.find((item) => item.id === presetId);
  const [title, setTitle] = useState(initial?.title ?? (language === 'de' ? preset?.title_de ?? '' : preset?.title_en ?? ''));
  const [type, setType] = useState<Job['type']>(initial?.type ?? 'mini-job');
  const [wage, setWage] = useState(numberInputValue(initial?.wage ?? latestKnownLimitValue('minimumWage', Number(localToday().slice(0, 4))), language));
  const [startDate, setStartDate] = useState(initial?.startDate ?? localToday());
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [industry, setIndustry] = useState(initial?.industry ?? preset?.industry.wzDivision ?? '');
  const [skillLevel, setSkillLevel] = useState<Job['skillLevel']>(initial?.skillLevel ?? preset?.skillLevel ?? 1);
  const [surcharges, setSurcharges] = useState(numberInputValue(Math.round((initial?.surcharges ?? 0) * 10_000) / 100, language));
  const [tipsEnabled, setTipsEnabled] = useState(Boolean(initial?.tipsEnabled));
  const [tips, setTips] = useState(numberInputValue(initial?.tips, language));
  const [expectedWage, setExpectedWage] = useState(numberInputValue(initial?.expectedWage, language));
  const [keywords, setKeywords] = useState((initial?.calendarKeywords ?? []).join(', '));
  const [tags, setTags] = useState<JobTag[]>(initial ? tagsForJob(initial) : preset?.tags ?? []);
  const [incomeTaxWithheld, setIncomeTaxWithheld] = useState(Boolean(initial?.incomeTaxWithheld));
  const youth = profile ? youthLaborApplies(profile, localToday()) : false;
  const studentMode = profile ? isStudentMode(profile, localToday()) : false;
  // Vorlagen mit Merkmalen, die unter 18 verboten sind (Regeln aus dem Core, nicht aus der UI).
  const forbiddenTags = new Set(JOB_TAG_RULES.filter((rule) => rule.severity === 'error').map((rule) => rule.tag));
  const youthTags: JobTag[] = ['lightWork', 'pieceWork', 'hazardous', 'barNightclub', 'alcoholTobacco'];
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    if (!preset || initial) return;
    setTitle(language === 'de' ? preset.title_de : preset.title_en);
    setIndustry(preset.industry.wzDivision);
    setSkillLevel(preset.skillLevel);
    setType(preset.typicalEmploymentTypes[0] ?? 'mini-job');
    setTags(preset.tags);
  }, [presetId, language]);

  const thisMonth = localToday().slice(0, 7);
  const miniJobCapRecord = limitsForYear(Number(thisMonth.slice(0, 4))).find((limit) => limit.id === 'miniJobMonthly');
  // Vorab-Hinweis nur mit geprüfter Grenze und nur, wenn schon andere Minijobs Verdienst haben.
  const miniRoom = type === 'mini-job' && miniJobCapRecord?.verified && miniJobCapRecord.value
    ? miniJobRoomBesideOthers(shifts, jobs, thisMonth, initial?.id, miniJobCapRecord.value, payments)
    : null;

  const matches = jobPresets.filter((item) => {
    if (!visiblePreset(item, studentMode)) return false;
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
    if (!title.trim()) {
      setError(t(language, 'jobValidation'));
      return;
    }
    // Zahlen zentral und lokalisiert prüfen (Dezimalkomma, Wertebereich), Daten als Zeitraum.
    const wageResult = validateNumber(wage, inputRules.hourlyWage);
    const expectedResult = validateNumber(expectedWage, inputRules.expectedWage);
    const surchargeResult = validateNumber(surcharges, inputRules.surchargePercent);
    const tipsResult = tipsEnabled ? validateNumber(tips, inputRules.tipsPerShift) : { ok: true as const, value: null };
    const startCode = validateDate(startDate);
    const endCode = startCode ? null : validateDate(endDate, true);
    const rangeCode = startCode || endCode ? null : validateDateRange(startDate, endDate);
    const message =
      numberError(wageResult, t(language, 'hourlyWage'), language) ||
      numberError(expectedResult, t(language, 'expectedWage'), language) ||
      dateError(startCode, t(language, 'startDate'), language) ||
      dateError(endCode ?? rangeCode, t(language, 'endDate'), language) ||
      numberError(surchargeResult, t(language, 'surcharges'), language) ||
      numberError(tipsResult, t(language, 'tips'), language);
    if (message || !wageResult.ok || wageResult.value === null) {
      setError(message);
      return;
    }
    const valueOf = (result: ReturnType<typeof validateNumber>) => (result.ok ? result.value : null);
    setError('');
    setSuggestion(checked.suggestion ? t(language, 'companySuggestion', { name: checked.suggestion }) : '');
    onSave({
      id: initial?.id ?? id(),
      title: title.trim(),
      type,
      wage: wageResult.value,
      startDate,
      endDate: endDate || undefined,
      industry: industry.trim() || undefined,
      skillLevel,
      company: checked.normalized || undefined,
      city: city.trim() || undefined,
      surcharges: (valueOf(surchargeResult) ?? 0) / 100,
      tipsEnabled,
      tips: tipsEnabled ? valueOf(tipsResult) ?? 0 : undefined,
      expectedWage: valueOf(expectedResult) ?? undefined,
      calendarKeywords: keywords.split(',').map((word) => word.trim()).filter(Boolean),
      presetId: initial?.presetId ?? (initial ? undefined : presetId),
      tags,
      incomeTaxWithheld: incomeTaxWithheld || undefined,
    });
  };

  return (
    <form className="form-grid" onSubmit={validate} noValidate>
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
                {(language === 'de' ? item.area : item.area_en) + ' · ' + (language === 'de' ? item.title_de : item.title_en)
                  + (youth && item.tags.some((tag) => forbiddenTags.has(tag)) ? ' · ' + t(language, 'jobTagNotForMinors') : '')}
              </option>
            ))}
          </select>
        )}
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>

      <label className="field">
        <span>{t(language, 'employmentType')}</span>
        <select value={type} onChange={(event) => setType(event.target.value as Job['type'])}>
          {employmentTypes.filter((item) => visibleEmploymentType(item.value, studentMode) || item.value === type).map((item) => <option value={item.value} key={item.value}>{t(language, item.key)}</option>)}
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
          <input type="text" inputMode="decimal" autoComplete="off" value={wage} onChange={(event) => setWage(event.target.value)} required />
        </label>
        <label className="field">
          <span>{t(language, 'expectedWage')}</span>
          <input type="text" inputMode="decimal" autoComplete="off" value={expectedWage} onChange={(event) => setExpectedWage(event.target.value)} />
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
          <input type="text" inputMode="decimal" autoComplete="off" value={surcharges} onChange={(event) => setSurcharges(event.target.value)} />
        </label>
        <label className="field">
          <span>{t(language, 'tips')}</span>
          <span className="inline-check">
            <input type="checkbox" checked={tipsEnabled} onChange={(event) => setTipsEnabled(event.target.checked)} />
            {t(language, 'yes')}
          </span>
          {tipsEnabled && <input type="text" inputMode="decimal" autoComplete="off" aria-label={t(language, 'tips')} value={tips} onChange={(event) => setTips(event.target.value)} />}
        </label>
      </div>
      <p className="field-hint wide-hint">{t(language, 'tipsInfo')}</p>
      {youth && profile && (
        <fieldset className="wide-fieldset job-tags">
          <legend>{t(language, 'jobTagsLabel')}</legend>
          {youthTags.map((tag) => (
            <label className="check-row" key={tag}>
              <input
                type="checkbox"
                checked={tags.includes(tag)}
                onChange={(event) => setTags((current) => event.target.checked ? [...current, tag] : current.filter((item) => item !== tag))}
              />
              <span>{t(language, ('jobTag_' + tag) as 'jobTag_lightWork')}</span>
            </label>
          ))}
          <JobTagFindings job={{ id: initial?.id ?? 'draft', title, type, wage: 0, startDate, tags }} profile={profile} language={language} />
        </fieldset>
      )}
      <label className="check-row">
        <input type="checkbox" checked={incomeTaxWithheld} onChange={(event) => setIncomeTaxWithheld(event.target.checked)} />
        <span>{t(language, 'incomeTaxWithheld')}</span>
      </label>
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
