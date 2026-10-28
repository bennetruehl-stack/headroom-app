import { useState, type CSSProperties } from 'react';
import { consentAgeRule, inputRules, validateDateRange, validateNumber, type Profile } from '@headroom/core';
import { profileChoices } from '../../app/constants';
import { RadioChoice } from '../../components/RadioChoice';
import { bafoegRelevant } from '../../config/studentMode';
import { t, type Language } from '../../i18n/translations';
import { dateError, numberError } from '../../lib/inputErrors';
import type { ExampleProfile } from '../../lib/storage';

export function Onboarding({
  profile,
  language,
  onLanguage,
  onContinue,
  onReadLimits,
  onExample,
}: {
  profile: Profile;
  language: Language;
  onLanguage: (language: Language) => void;
  onContinue: (profile: Profile) => void;
  onReadLimits: () => void;
  onExample: (example: ExampleProfile) => void;
}) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [ageText, setAgeText] = useState(String(profile.age));
  const [error, setError] = useState('');
  const update = (values: Partial<Profile>) => setDraft((current) => ({ ...current, ...values }));
  const currentPeriod = draft.semesterPeriods?.[0] ?? { start: '', end: '' };
  const setSemester = (key: 'start' | 'end', value: string) =>
    update({
      semesterPeriods: [
        { ...currentPeriod, [key]: value },
        ...(draft.semesterPeriods ?? []).slice(1),
      ],
    });

  return (
    <section className="onboarding page-enter" aria-labelledby="onboarding-title">
      <div className="onboarding-intro">
        <p className="eyebrow">{t(language, 'onboardingKicker')}</p>
        <h1 id="onboarding-title">{t(language, 'onboardingTitle')}</h1>
        <p>{t(language, 'onboardingIntro')}</p>
      </div>

      <div className="surface onboarding-panel">
        <h2>{t(language, 'onboardingProfile')}</h2>
        <div className="choice-grid">
          {profileChoices.map((choice) => (
            <RadioChoice
              key={choice.value}
              checked={draft.status === choice.value}
              title={t(language, choice.key)}
              onClick={() => update({ status: choice.value })}
            />
          ))}
        </div>

        <div className="form-grid onboarding-fields">
          <label className="field">
            <span>{t(language, 'age')}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={ageText}
              onChange={(event) => {
                setAgeText(event.target.value);
                const parsed = validateNumber(event.target.value, inputRules.age);
                if (parsed.ok && parsed.value !== null) update({ age: parsed.value });
              }}
            />
          </label>

          {(draft.status === 'Student' ||
            draft.status === 'Working student' ||
            draft.status === 'Mini-jobber' ||
            draft.status === 'Pupil' ||
            draft.status === 'School leaver') && (
            <fieldset className="toggle-field">
              <legend>{t(language, 'familyInsured')}</legend>
              <div className="segmented segmented-sliding" style={{ '--count': 2, '--index': draft.familyInsured ? 0 : 1 } as CSSProperties}>
                <button
                  type="button"
                  aria-pressed={draft.familyInsured}
                  className={draft.familyInsured ? 'selected' : ''}
                  onClick={() => update({ familyInsured: true })}
                >
                  {t(language, 'yes')}
                </button>
                <button
                  type="button"
                  aria-pressed={!draft.familyInsured}
                  className={!draft.familyInsured ? 'selected' : ''}
                  onClick={() => update({ familyInsured: false })}
                >
                  {t(language, 'no')}
                </button>
              </div>
            </fieldset>
          )}

          {bafoegRelevant(draft.status) && (
            <fieldset className="toggle-field">
              <legend>{t(language, 'bafoeg')}</legend>
              <div className="segmented segmented-sliding" style={{ '--count': 2, '--index': draft.bafoeg ? 0 : 1 } as CSSProperties}>
                <button
                  type="button"
                  aria-pressed={draft.bafoeg}
                  className={draft.bafoeg ? 'selected' : ''}
                  onClick={() => update({ bafoeg: true })}
                >
                  {t(language, 'yes')}
                </button>
                <button
                  type="button"
                  aria-pressed={!draft.bafoeg}
                  className={!draft.bafoeg ? 'selected' : ''}
                  onClick={() => update({ bafoeg: false })}
                >
                  {t(language, 'no')}
                </button>
              </div>
            </fieldset>
          )}

          {draft.status === 'Working student' && (
            <fieldset className="wide-fieldset">
              <legend>{t(language, 'lecturePeriod')}</legend>
              <div className="form-grid two-columns">
                <label className="field">
                  <span>{t(language, 'lectureStart')}</span>
                  <input
                    type="date"
                    value={currentPeriod.start}
                    onChange={(event) => setSemester('start', event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{t(language, 'lectureEnd')}</span>
                  <input
                    type="date"
                    value={currentPeriod.end}
                    onChange={(event) => setSemester('end', event.target.value)}
                  />
                </label>
              </div>
            </fieldset>
          )}

          {draft.status === 'Employee' && (
            <fieldset className="toggle-field">
              <legend>{t(language, 'mainJob')}</legend>
              <div className="segmented segmented-sliding" style={{ '--count': 2, '--index': draft.hasMainJob !== false ? 0 : 1 } as CSSProperties}>
                <button
                  type="button"
                  aria-pressed={draft.hasMainJob !== false}
                  className={draft.hasMainJob !== false ? 'selected' : ''}
                  onClick={() => update({ hasMainJob: true })}
                >
                  {t(language, 'yes')}
                </button>
                <button
                  type="button"
                  aria-pressed={draft.hasMainJob === false}
                  className={draft.hasMainJob === false ? 'selected' : ''}
                  onClick={() => update({ hasMainJob: false })}
                >
                  {t(language, 'no')}
                </button>
              </div>
            </fieldset>
          )}
        </div>

        {draft.age < consentAgeRule.minimumAge && (
          <p className="notice notice-neutral">{t(language, 'optInsBlocked')}</p>
        )}

        {error && <p role="alert" className="form-error">{error}</p>}
        <button
          className="button button-primary button-wide"
          type="button"
          onClick={() => {
            const ageMessage = numberError(validateNumber(ageText, inputRules.age), t(language, 'age'), language);
            const semester = draft.status === 'Working student' && (currentPeriod.start || currentPeriod.end)
              ? dateError(validateDateRange(currentPeriod.start, currentPeriod.end, false), t(language, 'lecturePeriod'), language)
              : '';
            const message = ageMessage || semester;
            setError(message);
            if (!message) onContinue(draft);
          }}
        >
          {t(language, 'start')}
          <span aria-hidden="true">↗</span>
        </button>
        <button className="text-button" type="button" onClick={onReadLimits}>
          {t(language, 'readLimits')}
        </button>
      </div>

      <section className="example-picker" aria-labelledby="example-title">
        <h2 id="example-title">{t(language, 'exampleTitle')}</h2>
        <p className="muted">{t(language, 'exampleIntro')}</p>
        <div className="example-options">
          <button className="button button-quiet button-wide" type="button" onClick={() => onExample('standard')}>
            <span>{t(language, 'exampleStandard')}</span><span aria-hidden="true">→</span>
          </button>
          <button className="button button-quiet button-wide" type="button" onClick={() => onExample('lena')}>
            <span>{t(language, 'exampleLena')}</span><span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </section>
  );
}
