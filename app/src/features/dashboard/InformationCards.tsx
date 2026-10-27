import { t, type Language } from '../../i18n/translations';
import type { AppState } from '../../lib/storage';

export function InformationCards({
  data,
  language,
  familyAge,
  familyOver,
}: {
  data: AppState;
  language: Language;
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
    </section>
  );
}
