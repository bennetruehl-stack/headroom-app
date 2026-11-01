import { z } from 'zod';

/** Länge eines base64url-Texts ohne Auffüllung für eine Anzahl Bytes. */
const base64urlLength = (bytes: number) => Math.ceil((bytes * 4) / 3);

/** Bytes als base64url ohne Auffüllung, mit Unter- und Obergrenze in Bytes. */
export function base64urlBytes(minBytes: number, maxBytes: number) {
  return z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/, 'base64url')
    .min(base64urlLength(minBytes))
    .max(base64urlLength(maxBytes));
}

/** Genau so viele Bytes als base64url, z. B. ein abgeleiteter Schlüssel. */
export const base64urlExact = (bytes: number) => base64urlBytes(bytes, bytes).length(base64urlLength(bytes));

/** Anzahl Bytes hinter einem base64url-Text ohne Auffüllung. */
export const base64urlByteLength = (value: string) => Math.floor((value.length * 3) / 4);

/** Fehlerantwort aller Endpunkte: nur ein Code, keine Details über Konten oder Inhalte. */
export const ErrorResponse = z.object({ error: z.string().regex(/^[a-z_]+$/).max(64) });
export type ErrorResponse = z.infer<typeof ErrorResponse>;
