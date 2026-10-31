import { detectedCombinations, possibleCombinations, usableLimitValue, type JobCombinationId } from '@headroom/core';
import type { ActiveFeatures } from '@headroom/core';
import { t, type Language, type MessageKey } from '../../i18n/translations';
import { money } from '../../lib/format';
import type { AppState } from '../../lib/storage';

const comboText: Record<JobCombinationId, { name: MessageKey; rule: MessageKey }> = {
  miniMini: { name: 'comboMiniMiniName', rule: 'comboMiniMiniRule' },
  workingStudentMini: { name: 'comboWorkingStudentMiniName', rule: 'comboWorkingStudentMiniRule' },
  workingStudentShort: { name: 'comboWorkingStudentShortName', rule: 'comboWorkingStudentShortRule' },
  miniShort: { name: 'comboMiniShortName', rule: 'comboMiniShortRule' },
  mainMini: { name: 'comboMainMiniName', rule: 'comboMainMiniRule' },
  mainShort: { name: 'comboMainShortName', rule: 'comboMainShortRule' },
};

const noteText = { familyTotal: 'comboNoteFamilyTotal', bafoeg: 'comboNoteBafoeg', youth: 'comboNoteYouth' } as const;

/** Advanced: welche Jobkombis zum Profil passen. Ohne passende Kombi erscheint nichts. */
function CombinationInfo({ data, language, year }: { data: AppState; language: Language; year: number }) {
  const list = possibleCombinations(data.profile, year);
  if (list.length === 0) return null;
  const own = new Set(detectedCombinations(data.profile, data.jobs, year).map((combo) => combo.id));
  const miniCap = usableLimitValue('miniJobMonthly', year);
  const days = usableLimitValue('shortTermEmployment', year);
  const values = {
    cap: miniCap !== null ? money(miniCap, language) : t(language, 'miniJobCap'),
    days: days ?? '–',
  };
  const notes = list[0].notes;
  return (
    <details className="notice notice-neutral info-details combo-info">
      <summary>
        <span className="info-mark" aria-hidden="true">i</span>
        <strong>{t(language, 'comboInfoTitle')}</strong>
      </summary>
      <p>{t(language, 'comboInfoIntro')}</p>
      <ul className="combo-info-list">
        {list.map(({ combo }) => (
          <li key={combo.id}>
            <strong>{t(language, comboText[combo.id].name)}</strong>
            {own.has(combo.id) && <span className="pill-subtle">{t(language, 'comboYours')}</span>}
            <span>{t(language, comboText[combo.id].rule, values)}</span>
          </li>
        ))}
      </ul>
      {notes.map((note) => <p key={note} className="combo-info-note">{t(language, noteText[note])}</p>)}
    </details>
  );
}

export function InformationCards({
  data,
  language,
  familyAge,
  familyOver,
  features,
  year,
}: {
  data: AppState;
  language: Language;
  features: ActiveFeatures;
  year: number;
  familyAge: number | null;
  /** Brutto-Orientierung liegt über dem Vergleichswert (nur mit geprüftem Wert). */
  familyOver: boolean;
}) {
  // Steuerklasse VI und Jugendarbeitsschutz stehen jetzt rollenbasiert unter „Für dich wichtig“.
  const showFamilyInfo =
    data.profile.familyInsured &&
    (familyAge !== null && data.profile.age >= familyAge ||
      familyOver);
  return (
    <section className="info-card-list">
      {showFamilyInfo && (
        <article className="notice notice-neutral">
          <span className="info-mark" aria-hidden="true">i</span>
          <p>{t(language, 'familyInfo')}</p>
        </article>
      )}
      <details className="notice notice-neutral info-details">
        <summary>
          <span className="info-mark" aria-hidden="true">i</span>
          <strong>{t(language, 'employmentInfoTitle')}</strong>
        </summary>
        <p>{t(language, 'employmentInfo')}</p>
      </details>
      {features.jobCombinations && <CombinationInfo data={data} language={language} year={year} />}
    </section>
  );
}
