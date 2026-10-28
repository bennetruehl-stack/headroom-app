// Automatische Übergänge im Schüler-Modus: 18. Geburtstag und Schulabschluss.
// Nichts wird ohne Bestätigung umgestellt. Das Datum wird immer übergeben (testbar, kein new Date()).
import type { Profile, ProfileStatus } from '../types';
import { adultBirthday, ageOn } from './youthLabor/profile';

export type Transition =
  | { id: string; kind: 'adult'; date: string }
  | { id: string; kind: 'graduation'; date: string; suggestedStatus: ProfileStatus };

const DAY_MS = 86_400_000;
/** Wie lange ein verpasster Übergang noch angeboten wird (z. B. App lange nicht geöffnet). */
const OFFER_DAYS = 365;

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / DAY_MS);
}

export function adultTransitionId(profile: Pick<Profile, 'birthDate'>): string | null {
  const date = adultBirthday(profile);
  return date ? 'adult@' + date : null;
}

const DISMISSED = ':dismissed';

function graduationSuggestion(profile: Profile): ProfileStatus | null {
  if (profile.afterSchool === 'study') return 'Student';
  if (profile.afterSchool === 'apprenticeship') return 'Apprentice';
  return profile.status === 'Pupil' ? 'School leaver' : null;
}

/** Offene Übergänge zum Stichtag `today`. */
export function pendingTransitions(profile: Profile, today: string): Transition[] {
  const result: Transition[] = [];
  const raw = profile.handledTransitions ?? [];
  // Bestätigt (id) und abgelehnt (id:dismissed) zählen beide als erledigt.
  const handled = new Set(raw.map((id) => id.endsWith(DISMISSED) ? id.slice(0, -DISMISSED.length) : id));
  const adultDate = adultBirthday(profile);
  if (adultDate && adultDate <= today && daysBetween(adultDate, today) <= OFFER_DAYS && !handled.has('adult@' + adultDate)) {
    result.push({ id: 'adult@' + adultDate, kind: 'adult', date: adultDate });
  }
  const graduation = profile.graduationDate;
  if (
    graduation && graduation <= today && daysBetween(graduation, today) <= OFFER_DAYS &&
    (profile.status === 'Pupil' || profile.status === 'School leaver')
  ) {
    const suggestedStatus = graduationSuggestion(profile);
    const id = 'graduation@' + graduation + ':' + suggestedStatus;
    if (suggestedStatus && suggestedStatus !== profile.status && !handled.has(id)) {
      result.push({ id, kind: 'graduation', date: graduation, suggestedStatus });
    }
  }
  return result;
}

/** Bestätigt: Profil umstellen. Der Übergang wird als erledigt gemerkt. */
export function acceptTransition(profile: Profile, transition: Transition, today: string): Profile {
  const handledTransitions = [...new Set([...(profile.handledTransitions ?? []), transition.id])];
  if (transition.kind === 'adult') {
    // Jugendarbeitsschutz gilt ab 18 ohnehin nicht mehr (altersabhängig). Mit der Bestätigung endet
    // auch der Schüler-Modus für Schüler:innen über 18; die Schul-Angaben bleiben gespeichert.
    return { ...profile, age: ageOn(profile, today), handledTransitions };
  }
  return { ...profile, status: transition.suggestedStatus, handledTransitions };
}

/** Abgelehnt: nichts ändern, aber nicht noch einmal fragen. */
export function dismissTransition(profile: Profile, transition: Transition): Profile {
  return { ...profile, handledTransitions: [...new Set([...(profile.handledTransitions ?? []), transition.id + DISMISSED])] };
}
