import { CalendarFeedErrorResponse, CalendarFeedRequest, ErrorResponse, MAX_CALENDAR_BYTES, type CalendarFeedErrorCode } from '@headroom/contracts';
import { z } from 'zod';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

const CALENDAR_HOSTS = [/^calendar\.google\.com$/i, /(^|\.)icloud\.com$/i];
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
/** Ungültige Anfragen beantwortet die allgemeine Fehlerbehandlung mit `invalid_request`. */
const BadRequest = z.union([CalendarFeedErrorResponse, ErrorResponse]);

export type CalendarFetch = (input: string, init: RequestInit) => Promise<Response>;

/** Nur https zu Google oder iCloud, ohne Zugangsdaten in der Adresse und ohne fremden Port. `webcal://` wird zu `https://`. */
export function calendarUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim().replace(/^webcals?:\/\//i, 'https://'));
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null;
    return CALENDAR_HOSTS.some((host) => host.test(url.hostname)) ? url : null;
  } catch {
    return null;
  }
}

async function readLimited(body: ReadableStream<Uint8Array>): Promise<string | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_CALENDAR_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Reicht einen Kalender von Google oder iCloud durch. Adresse und Inhalt werden weder gespeichert noch geloggt;
 * die Logs enthalten nur den Pfad. Jede Weiterleitung muss wieder auf einen erlaubten Host zeigen.
 */
export function calendarFeedRoutes(app: FastifyInstance, deps: { fetch: CalendarFetch }) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const fail = (reply: FastifyReply, status: number, error: CalendarFeedErrorCode) => reply.code(status).send({ error });

  routes.post(
    '/v1/calendar/feed',
    { schema: { body: CalendarFeedRequest, response: { 200: z.string(), 400: BadRequest, 413: CalendarFeedErrorResponse, 502: CalendarFeedErrorResponse, 504: CalendarFeedErrorResponse } } },
    async (request, reply) => {
      let url = calendarUrl(request.body.url);
      if (!url) return fail(reply, 400, 'host');
      const signal = AbortSignal.timeout(TIMEOUT_MS);
      try {
        for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
          const upstream = await deps.fetch(url.toString(), {
            redirect: 'manual',
            signal,
            headers: { Accept: 'text/calendar, text/plain;q=0.8', 'User-Agent': 'Headroom/1.0' },
          });
          if (upstream.status >= 300 && upstream.status < 400) {
            const next = calendarUrl(new URL(upstream.headers.get('location') ?? '', url).toString());
            if (!next) return fail(reply, 502, 'redirect');
            url = next;
            continue;
          }
          if (!upstream.ok || !upstream.body) return fail(reply, 502, upstream.status === 404 || upstream.status === 403 ? 'notFound' : 'upstream');
          const text = await readLimited(upstream.body);
          if (text === null) return fail(reply, 413, 'tooLarge');
          if (!text.includes('BEGIN:VCALENDAR')) return fail(reply, 502, 'notCalendar');
          return reply.type('text/calendar; charset=utf-8').header('cache-control', 'no-store').send(text);
        }
        return fail(reply, 502, 'redirect');
      } catch {
        // Fehlertexte von fetch können die Adresse enthalten; deshalb hier nichts loggen.
        return fail(reply, 504, 'timeout');
      }
    },
  );
}
