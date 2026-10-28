import { acceptTransition, dismissTransition, pendingTransitions, type Profile } from '@headroom/core';
import { profileChoices } from '../../app/constants';
import { t, type Language } from '../../i18n/translations';
import { dateText } from '../../lib/format';

/**
 * Übergänge (18. Geburtstag, Schulabschluss) im bestehenden Hinweisband der Übersicht.
 * Nichts wird ohne Bestätigung umgestellt.
 */
export function TransitionNotices({ profile, today, language, onProfile }: { profile: Profile; today: string; language: Language; onProfile: (profile: Profile) => void }) {
  const transitions = pendingTransitions(profile, today);
  if (!transitions.length) return null;
  return (
    <>
      {transitions.map((transition) => (
        <section key={transition.id} className="notice notice-lime transition-notice" role="status" aria-live="polite">
          {transition.kind === 'adult' ? (
            <div>
              <p><strong>{t(language, 'transitionAdultTitle')}</strong> {t(language, 'transitionAdultText')}</p>
              <p>{t(language, 'transitionAdultQuestion')}</p>
            </div>
          ) : (
            <div>
              <p><strong>{t(language, 'transitionGraduationTitle')}</strong></p>
              <p>{t(language, 'transitionGraduationText', {
                date: dateText(transition.date, language),
                status: t(language, profileChoices.find((choice) => choice.value === transition.suggestedStatus)?.key ?? 'profileStudent'),
              })}</p>
            </div>
          )}
          <div className="card-actions">
            <button className="button button-primary" type="button" onClick={() => onProfile(acceptTransition(profile, transition, today))}>
              {t(language, transition.kind === 'adult' ? 'transitionAdultAccept' : 'transitionGraduationAccept')}
            </button>
            <button className="text-button" type="button" onClick={() => onProfile(dismissTransition(profile, transition))}>
              {t(language, 'transitionDecline')}
            </button>
          </div>
        </section>
      ))}
    </>
  );
}
