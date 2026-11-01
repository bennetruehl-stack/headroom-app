// Abgleich verschlüsselter Datensätze. Der Server sieht je Datensatz nur zufällige ID, Nummer,
// Löschkennzeichen und Ciphertext, nicht die Art des Eintrags.
import { z } from 'zod';
import { base64urlBytes, base64urlExact } from './encoding';

export const MAX_RECORDS_PER_PUSH = 500;
export const MAX_RECORD_BYTES = 64 * 1024;
export const MAX_RECORDS_PER_PULL = 500;

/** Laufende Nummer je Konto, vom Server vergeben. */
const Seq = z.int().min(0).max(Number.MAX_SAFE_INTEGER);

export const RecordEnvelope = z.strictObject({
  /** Zufällige Kennung, aus der sich die Art des Eintrags nicht ablesen lässt. */
  id: base64urlBytes(16, 32),
  encVersion: z.int().min(1).max(255),
  iv: base64urlExact(12),
  /** AES-GCM über den Inhalt; Zusatzdaten sind `encVersion|userId|recordId`. */
  ciphertext: base64urlBytes(1, MAX_RECORD_BYTES),
  deleted: z.boolean(),
});
export type RecordEnvelope = z.infer<typeof RecordEnvelope>;

export const PushRequest = z.strictObject({
  /** Wiederholt die App einen Push mit derselben Kennung, speichert der Server ihn nicht doppelt. */
  mutationId: z.uuid(),
  /** Stand, auf dem die Änderungen beruhen. Passt er nicht, lehnt der Server ab. */
  baseSeq: Seq,
  records: z.array(RecordEnvelope).min(1).max(MAX_RECORDS_PER_PUSH),
});
export type PushRequest = z.infer<typeof PushRequest>;

export const PushResponse = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('ok'), seq: Seq }),
  /** Ein anderes Gerät war schneller: erst abholen, zusammenführen, dann mit neuer `mutationId` erneut senden. */
  z.strictObject({ status: z.literal('conflict'), currentSeq: Seq }),
]);
export type PushResponse = z.infer<typeof PushResponse>;

/** Werte aus der Adresszeile kommen als Text an. */
const QuerySeq = z.coerce.number().pipe(Seq);

export const PullQuery = z.strictObject({
  since: QuerySeq,
  limit: z.coerce.number().pipe(z.int().min(1).max(MAX_RECORDS_PER_PULL)).default(MAX_RECORDS_PER_PULL),
});
export type PullQuery = z.infer<typeof PullQuery>;

export const PulledRecord = RecordEnvelope.extend({ seq: Seq });
export type PulledRecord = z.infer<typeof PulledRecord>;

export const PullResponse = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('ok'), records: z.array(PulledRecord).max(MAX_RECORDS_PER_PULL), cursor: Seq, hasMore: z.boolean() }),
  /** Der Cursor liegt vor der Bereinigung der Löschvermerke: alles ab 0 neu holen und zusammenführen. */
  z.strictObject({ status: z.literal('resync') }),
]);
export type PullResponse = z.infer<typeof PullResponse>;
