// Abruf eines abonnierten Kalenders über das Backend. Google und iCloud erlauben keinen Direktabruf aus dem Browser.
// Adresse und Inhalt laufen im Klartext durch den Server; er speichert und protokolliert beides nicht.
import { z } from 'zod';

export const CalendarFeedRequest = z.strictObject({
  url: z.string().min(1).max(2048),
});
export type CalendarFeedRequest = z.infer<typeof CalendarFeedRequest>;

/** Fehlercodes des Abrufs. Erfolg ist der Kalender selbst als `text/calendar`. */
export const CALENDAR_FEED_ERRORS = ['host', 'redirect', 'notFound', 'upstream', 'tooLarge', 'notCalendar', 'timeout'] as const;
export type CalendarFeedErrorCode = (typeof CALENDAR_FEED_ERRORS)[number];

export const CalendarFeedErrorResponse = z.object({ error: z.enum(CALENDAR_FEED_ERRORS) });

export const MAX_CALENDAR_BYTES = 2 * 1024 * 1024;
