import { AFTER_SCHOOL_PLANS, ageOn, BASIC_INCOME_NAME, BUNDESLAENDER, youthLaborApplies, type AfterSchoolPlan, type Bundesland, type Profile, type SchoolLesson } from '@headroom/core';
import { t, type Language } from '../../i18n/translations';
import { localToday } from '../../lib/format';

const weekdays: SchoolLesson['weekday'][] = [1, 2, 3, 4, 5, 6];

const stateNames: Record<Bundesland, string> = {
  BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg',
  HE: 'Hessen', MV: 'Mecklenburg-Vorpommern', NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen',
};

function weekdayName(weekday: number, language: Language): string {
  // 2024-01-01 war ein Montag.
  const date = new Date(Date.UTC(2024, 0, weekday, 12));
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-GB', { weekday: 'long', timeZone: 'UTC' }).format(date);
}

/** Profilangaben für den Schüler-Modus: Geburtsdatum, Schulpflicht, Stundenplan, Ferien. */
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
  const lessons = profile.schoolSchedule ?? [];
  const holidays = profile.schoolHolidays ?? [];
  const setLesson = (index: number, values: Partial<SchoolLesson>) =>
    update({ schoolSchedule: lessons.map((lesson, position) => position === index ? { ...lesson, ...values } : lesson) });
  const setHoliday = (index: number, key: 'start' | 'end', value: string) =>
    update({ schoolHolidays: holidays.map((holiday, position) => position === index ? { ...holiday, [key]: value } : holiday) });

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

      <div className="youth-list">
        <strong>{t(language, 'schoolSchedule')}</strong>
        <small className="muted">{t(language, 'schoolScheduleHint')}</small>
        {lessons.map((lesson, index) => (
          <div className="youth-list-row" key={index}>
            <label className="field">
              <span>{t(language, 'weekdayLabel')}</span>
              <select value={lesson.weekday} onChange={(event) => setLesson(index, { weekday: Number(event.target.value) as SchoolLesson['weekday'] })}>
                {weekdays.map((day) => <option key={day} value={day}>{weekdayName(day, language)}</option>)}
              </select>
            </label>
            <label className="field"><span>{t(language, 'startTime')}</span><input type="time" value={lesson.start} onChange={(event) => setLesson(index, { start: event.target.value })} /></label>
            <label className="field"><span>{t(language, 'endTime')}</span><input type="time" value={lesson.end} onChange={(event) => setLesson(index, { end: event.target.value })} /></label>
            <button className="text-button" type="button" onClick={() => update({ schoolSchedule: lessons.filter((_, position) => position !== index) })}>{t(language, 'removeEntry')}</button>
          </div>
        ))}
        <button
          className="button button-quiet"
          type="button"
          onClick={() => {
            const used = new Set(lessons.map((lesson) => lesson.weekday));
            const next = ([1, 2, 3, 4, 5] as SchoolLesson['weekday'][]).find((day) => !used.has(day)) ?? 1;
            update({ schoolSchedule: [...lessons, { weekday: next, start: '08:00', end: '13:00' }] });
          }}
        >
          {t(language, 'addLesson')}
        </button>
      </div>

      <div className="youth-list">
        <strong>{t(language, 'schoolHolidays')}</strong>
        <small className="muted">{t(language, 'schoolHolidaysHint')}</small>
        {holidays.map((holiday, index) => (
          <div className="youth-list-row" key={index}>
            <label className="field"><span>{t(language, 'holidayStart')}</span><input type="date" value={holiday.start} onChange={(event) => setHoliday(index, 'start', event.target.value)} /></label>
            <label className="field"><span>{t(language, 'holidayEnd')}</span><input type="date" value={holiday.end} onChange={(event) => setHoliday(index, 'end', event.target.value)} /></label>
            <button className="text-button" type="button" onClick={() => update({ schoolHolidays: holidays.filter((_, position) => position !== index) })}>{t(language, 'removeEntry')}</button>
          </div>
        ))}
        <button className="button button-quiet" type="button" onClick={() => update({ schoolHolidays: [...holidays, { start: '', end: '' }] })}>
          {t(language, 'addHoliday')}
        </button>
      </div>
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
