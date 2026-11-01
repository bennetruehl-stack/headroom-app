// Abgleich verschlüsselter Datensätze. Der Server sieht je Datensatz nur zufällige ID, Nummer,
// Löschkennzeichen und Ciphertext, nicht die Art des Eintrags.
import { z } from 'zod';
import { base64urlByteLength, base64urlBytes, base64urlExact } from './encoding';

export const MAX_RECORDS_PER_PUSH = 500;
export const MAX_RECORD_BYTES = 64 * 1024;
export const MAX_RECORDS_PER_PULL = 500;
/** Gesamter Ciphertext je Push bzw. Abruf-Seite. Der Server setzt sein Body-Limit danach, die App teilt größere Mengen auf. */
export const MAX_PUSH_CIPHERTEXT_BYTES = 4 * 1024 * 1024;

/** Laufende Nummer je Konto, vom Server vergeben. */
const Seq = z.int().min(0).max(Number.MAX_SAFE_INTEGER);

const envelopeFields = {
  /** Zufällige Kennung, aus der sich die Art des Eintrags nicht ablesen lässt. Zusammen mit `userId` Teil der Zusatzdaten. */
  id: base64urlBytes(16, 32),
  encVersion: z.int().min(1).max(255),
  iv: base64urlExact(12),
  /** AES-GCM über den Inhalt; Zusatzdaten sind `encVersion|userId|recordId`. */
  ciphertext: base64urlBytes(1, MAX_RECORD_BYTES),
  deleted: z.boolean(),
};

export const RecordEnvelope = z.strictObject(envelopeFields);
export type RecordEnvelope = z.infer<typeof RecordEnvelope>;

export const PushRequest = z.strictObject({
  /** Wiederholt die App einen Push mit derselben Kennung, speichert der Server ihn nicht doppelt. */
  mutationId: z.uuid(),
  /** Stand, auf dem die Änderungen beruhen. Passt er nicht, lehnt der Server ab. */
  baseSeq: Seq,
  records: z
    .array(RecordEnvelope)
    .min(1)
    .max(MAX_RECORDS_PER_PUSH)
    .refine((records) => new Set(records.map((record) => record.id)).size === records.length, 'duplicate record id')
    .refine(
      (records) => records.reduce((sum, record) => sum + base64urlByteLength(record.ciphertext), 0) <= MAX_PUSH_CIPHERTEXT_BYTES,
      'push too large',
    ),
});
export type PushRequest = z.infer<typeof PushRequest>;

export const PushResponse = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), seq: Seq }),
  /** Ein anderes Gerät war schneller: erst abholen, zusammenführen, dann mit neuer `mutationId` erneut senden. */
  z.object({ status: z.literal('conflict'), currentSeq: Seq }),
]);
export type PushResponse = z.infer<typeof PushResponse>;

/** Werte aus der Adresszeile kommen als Text an. Nur Dezimalziffern ohne führende Null; leer ist ein Fehler, nicht 0. */
const QueryInt = z.string().regex(/^(0|[1-9][0-9]{0,15})$/).transform(Number);
const QuerySeq = QueryInt.pipe(Seq);

export const PullQuery = z.strictObject({
  since: QuerySeq,
  limit: QueryInt.pipe(z.int().min(1).max(MAX_RECORDS_PER_PULL)).default(MAX_RECORDS_PER_PULL),
});
export type PullQuery = z.infer<typeof PullQuery>;

export const PulledRecord = z.object({ ...envelopeFields, seq: Seq });
export type PulledRecord = z.infer<typeof PulledRecord>;

export const PullResponse = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), records: z.array(PulledRecord).max(MAX_RECORDS_PER_PULL), cursor: Seq, hasMore: z.boolean() }),
  /** Der Cursor liegt vor der Bereinigung der Löschvermerke: alles ab 0 neu holen und zusammenführen. */
  z.object({ status: z.literal('resync') }),
]);
export type PullResponse = z.infer<typeof PullResponse>;
