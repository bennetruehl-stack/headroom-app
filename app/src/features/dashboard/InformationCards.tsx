import { t, type Language } from '../../i18n/translations';
import type { AppState } from '../../lib/storage';

export function InformationCards({
  data,
  language,
  familyAge,
  familyCap,
  familyMonthTotal,
}: {
  data: AppState;
  language: Language;
  familyAge: number | null;
  familyCap: number;
  familyMonthTotal: number;
}) {
  // Steuerklasse VI und Jugendarbeitsschutz stehen jetzt rollenbasiert unter „Für dich wichtig“.
  const showFamilyInfo =
    data.profile.familyInsured &&
    (familyAge !== null && data.profile.age >= familyAge ||
      familyCap > 0 && familyMonthTotal > familyCap);
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
