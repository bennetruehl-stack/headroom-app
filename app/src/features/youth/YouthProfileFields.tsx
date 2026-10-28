import { AFTER_SCHOOL_PLANS, ageOn, BASIC_INCOME_NAME, BUNDESLAENDER, youthLaborApplies, type AfterSchoolPlan, type Bundesland, type Profile } from '@headroom/core';
import { t, type Language } from '../../i18n/translations';
import { localToday } from '../../lib/format';

const stateNames: Record<Bundesland, string> = {
  BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg',
  HE: 'Hessen', MV: 'Mecklenburg-Vorpommern', NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen',
};

/** Profilangaben für den Schüler-Modus: Geburtsdatum, Schulpflicht, Bundesland, Geld und Plan nach der Schule. */
export function YouthProfileFields({
  profile,
  language,
  onChange,
}: {
  profile: Profile;
  language: Language;
  onChange: (profile: Profile) => void;
}) {
  const update = (values: Partial<Profile>) => onChange({ ...profile, ...values });
  const youth = youthLaborApplies(profile, localToday());
  const schoolStatus = profile.status === 'Pupil' || profile.status === 'School leaver';

  return (
    <fieldset className="wide-fieldset youth-profile">
      <legend>{t(language, 'youthSection')}</legend>
      <p className="muted">{t(language, 'youthSectionIntro')}</p>

      <label className="field">
        <span>{t(language, 'birthDate')}</span>
        <input type="date" value={profile.birthDate ?? ''} onChange={(event) => {
          const birthDate = event.target.value || undefined;
          // Das gespeicherte Alter läuft mit, damit ältere Teile der App dasselbe Alter sehen.
          update(birthDate ? { birthDate, age: ageOn({ age: profile.age, birthDate }, localToday()) } : { birthDate });
        }} aria-describedby="youth-birth-hint" />
        <small id="youth-birth-hint">{t(language, 'birthDateHint')}</small>
      </label>

      {youth && <>
      <label className="check-row">
        <input
          type="checkbox"
          checked={profile.isFullTimeSchoolObligated ?? profile.status === 'Pupil'}
          onChange={(event) => update({ isFullTimeSchoolObligated: event.target.checked })}
        />
        <span>{t(language, 'fullTimeSchool')}</span>
      </label>
      <details className="row-explain">
        <summary>{t(language, 'whatDoesItMean')}</summary>
        <p>{t(language, 'fullTimeSchoolHint')}</p>
      </details>

      <label className="field">
        <span>{t(language, 'bundesland')}</span>
        <select value={profile.bundesland ?? ''} onChange={(event) => update({ bundesland: (event.target.value || undefined) as Bundesland | undefined })}>
          <option value="">{t(language, 'bundeslandNone')}</option>
          {BUNDESLAENDER.map((code) => <option key={code} value={code}>{stateNames[code]}</option>)}
        </select>
      </label>

      <label className="check-row">
        <input type="checkbox" checked={Boolean(profile.completedVocationalTraining)} onChange={(event) => update({ completedVocationalTraining: event.target.checked })} />
        <span>{t(language, 'completedTraining')}</span>
      </label>
      </>}

      {schoolStatus && (
        <>
          <label className="check-row">
            <input type="checkbox" checked={Boolean(profile.familyReceivesBasicIncome)} onChange={(event) => update({ familyReceivesBasicIncome: event.target.checked })} aria-describedby="youth-basic-income-hint" />
            <span>{t(language, 'basicIncomeToggle', { name: BASIC_INCOME_NAME.value[language] })}</span>
          </label>
          <small id="youth-basic-income-hint" className="muted">{t(language, 'basicIncomeToggleHint')}</small>
          <label className="field">
            <span>{t(language, 'afterSchoolLabel')}</span>
            <select value={profile.afterSchool ?? ''} onChange={(event) => update({ afterSchool: (event.target.value || undefined) as AfterSchoolPlan | undefined })} aria-describedby="youth-after-hint">
              <option value="">{t(language, 'bundeslandNone')}</option>
              {AFTER_SCHOOL_PLANS.map((plan) => <option key={plan} value={plan}>{t(language, ('afterSchool_' + plan) as 'afterSchool_study')}</option>)}
            </select>
            <small id="youth-after-hint">{t(language, 'afterSchoolHint')}</small>
          </label>
          <label className="field">
            <span>{t(language, 'graduationDate')}</span>
            <input type="date" value={profile.graduationDate ?? ''} onChange={(event) => update({ graduationDate: event.target.value || undefined })} />
          </label>
        </>
      )}
    </fieldset>
  );
}
