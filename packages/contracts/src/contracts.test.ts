/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import {
  AccountDeleteRequest,
  AccountResponse,
  KDF_MINIMUM,
  KeysResponse,
  KeysUpdateRequest,
  LoginRequest,
  LoginResponse,
  PreloginRequest,
  PreloginResponse,
  RecoverFinishRequest,
  RegisterRequest,
} from './auth';
import { MAX_PUSH_CIPHERTEXT_BYTES, MAX_RECORD_BYTES, MAX_RECORDS_PER_PUSH, PullQuery, PullResponse, PushRequest } from './sync';
import { CalendarFeedRequest } from './calendar';

/** Zufällige Bytes als base64url, wie die App sie schickt. */
const b64 = (bytes: number) => Buffer.alloc(bytes, 7).toString('base64url');
const uuid = '6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f';
const kdf = { algorithm: 'argon2id', memoryKiB: 65536, iterations: 3, parallelism: 1 } as const;
const wrap = { encVersion: 1, iv: b64(12), ciphertext: b64(48) };
let nextId = 0;
/** Jeder Datensatz bekommt eine eigene Kennung. */
const record = (ciphertextBytes = 200) => ({ id: Buffer.from(String(nextId++).padStart(16, '0')).toString('base64url'), encVersion: 1, iv: b64(12), ciphertext: b64(ciphertextBytes), deleted: false });

const registration = {
  email: 'Mia@Example.org ',
  authKey: b64(32),
  recoveryAuthKey: b64(32),
  salt: b64(16),
  kdf,
  authScheme: 'argon2id-hkdf-v1',
  masterKeyWrap: wrap,
  recoveryKeyWrap: wrap,
  recoveryNoticeAccepted: true,
};

describe('Anmeldung', () => {
  it('nimmt eine vollständige Registrierung an und schreibt die Adresse klein', () => {
    const parsed = RegisterRequest.parse(registration);
    expect(parsed.email).toBe('mia@example.org');
  });

  it('lehnt eine Anmeldung ohne authKey ab', () => {
    expect(LoginRequest.safeParse({ email: 'mia@example.org' }).success).toBe(false);
    expect(LoginRequest.safeParse({ email: 'mia@example.org', authKey: b64(32) }).success).toBe(true);
  });

  it('lehnt ein Passwort im Klartext statt eines abgeleiteten Schlüssels ab', () => {
    expect(LoginRequest.safeParse({ email: 'mia@example.org', authKey: 'geheim123' }).success).toBe(false);
    expect(LoginRequest.safeParse({ email: 'mia@example.org', authKey: b64(32), password: 'geheim123' }).success).toBe(false);
  });

  it('verlangt die ausdrückliche Bestätigung zum Wiederherstellungscode', () => {
    expect(RegisterRequest.safeParse({ ...registration, recoveryNoticeAccepted: false }).success).toBe(false);
  });

  it('lehnt Schlüssel-Einstellungen unter den Mindestwerten ab, genau auf der Grenze werden sie angenommen', () => {
    const at = { ...kdf, memoryKiB: KDF_MINIMUM.memoryKiB, iterations: KDF_MINIMUM.iterations };
    expect(RegisterRequest.safeParse({ ...registration, kdf: at }).success).toBe(true);
    expect(RegisterRequest.safeParse({ ...registration, kdf: { ...at, memoryKiB: KDF_MINIMUM.memoryKiB - 1 } }).success).toBe(false);
    expect(RegisterRequest.safeParse({ ...registration, kdf: { ...at, iterations: KDF_MINIMUM.iterations - 1 } }).success).toBe(false);
  });

  it('lehnt eine ungültige Adresse ab', () => {
    expect(PreloginRequest.safeParse({ email: 'keine-adresse' }).success).toBe(false);
  });

  it('verlangt beim Löschen, Passwortwechsel und Wiederherstellen den passenden Schlüssel', () => {
    expect(AccountDeleteRequest.safeParse({}).success).toBe(false);
    expect(AccountDeleteRequest.safeParse({ authKey: b64(32) }).success).toBe(true);
    expect(KeysUpdateRequest.safeParse({ authKey: b64(32), newAuthKey: b64(32), newSalt: b64(16), newKdf: kdf, newMasterKeyWrap: wrap }).success).toBe(true);
    expect(RecoverFinishRequest.safeParse({ email: 'mia@example.org', newAuthKey: b64(32), newSalt: b64(16), newKdf: kdf, newMasterKeyWrap: wrap }).success).toBe(false);
    expect(RecoverFinishRequest.safeParse({ email: 'mia@example.org', recoveryAuthKey: b64(32), newAuthKey: b64(32), newSalt: b64(16), newKdf: kdf, newMasterKeyWrap: wrap }).success).toBe(true);
  });
});

describe('Antworten des Servers', () => {
  const userId = '0f9e8d7c-6b5a-4c3d-9e1f-2a3b4c5d6e7f';
  const session = { userId, token: b64(32), expiresAt: '2026-12-01T12:00:00Z' };

  it('liefert bei der Anmeldung eine feste Konto-Kennung für die Verschlüsselung', () => {
    expect(LoginResponse.safeParse({ ...session, masterKeyWrap: wrap }).success).toBe(true);
    const { userId: _userId, ...withoutUserId } = session;
    expect(LoginResponse.safeParse({ ...withoutUserId, masterKeyWrap: wrap }).success).toBe(false);
    expect(AccountResponse.parse({ userId, email: 'mia@example.org', createdAt: '2026-11-01T10:00:00Z' }).userId).toBe(userId);
  });

  it('lehnt vom Server gelieferte Schlüssel-Einstellungen unter den Mindestwerten ab', () => {
    const response = { salt: b64(16), authScheme: 'argon2id-hkdf-v1' };
    const weak = [
      { ...kdf, memoryKiB: KDF_MINIMUM.memoryKiB - 1 },
      { ...kdf, iterations: KDF_MINIMUM.iterations - 1 },
      { ...kdf, parallelism: 0 },
      { ...kdf, algorithm: 'pbkdf2' },
    ];
    for (const params of weak) {
      expect(PreloginResponse.safeParse({ ...response, kdf: params }).success).toBe(false);
      expect(KeysResponse.safeParse({ ...response, masterKeyWrap: wrap, kdf: params }).success).toBe(false);
    }
    expect(PreloginResponse.safeParse({ ...response, kdf: { ...kdf, memoryKiB: KDF_MINIMUM.memoryKiB } }).success).toBe(true);
  });

  it('übersteht ein zusätzliches Feld in einer Antwort, damit ältere App-Stände weiter funktionieren', () => {
    const parsed = LoginResponse.parse({ ...session, masterKeyWrap: wrap, neuesFeld: 1 });
    expect(parsed).not.toHaveProperty('neuesFeld');
    expect(PullResponse.safeParse({ status: 'ok', records: [{ ...record(), seq: 1, neuesFeld: true }], cursor: 1, hasMore: false }).success).toBe(true);
    expect(PullResponse.safeParse({ status: 'resync' }).success).toBe(true);
  });
});

describe('Abgleich', () => {
  const push = (records: unknown[]) => ({ mutationId: uuid, baseSeq: 0, records });

  it('nimmt 500 Datensätze an und lehnt 501 ab', () => {
    expect(MAX_RECORDS_PER_PUSH).toBe(500);
    expect(PushRequest.safeParse(push(Array.from({ length: 500 }, () => record(16)))).success).toBe(true);
    expect(PushRequest.safeParse(push(Array.from({ length: 501 }, () => record(16)))).success).toBe(false);
  });

  it('nimmt genau 64 KB Ciphertext an und lehnt 65 KB ab', () => {
    expect(MAX_RECORD_BYTES).toBe(64 * 1024);
    expect(PushRequest.safeParse(push([record(64 * 1024)])).success).toBe(true);
    expect(PushRequest.safeParse(push([record(64 * 1024 + 1)])).success).toBe(false);
    expect(PushRequest.safeParse(push([record(65 * 1024)])).success).toBe(false);
  });

  it('lehnt unbekannte Schlüssel im Body ab, auch in einem Datensatz', () => {
    expect(PushRequest.safeParse({ ...push([record()]), kind: 'shift' }).success).toBe(false);
    expect(PushRequest.safeParse(push([{ ...record(), kind: 'shift' }])).success).toBe(false);
  });

  it('begrenzt die Gesamtgröße eines Pushs, damit der Server ihn annehmen kann', () => {
    const perRecord = 64 * 1024;
    const fits = Math.floor(MAX_PUSH_CIPHERTEXT_BYTES / perRecord);
    expect(PushRequest.safeParse(push(Array.from({ length: fits }, () => record(perRecord)))).success).toBe(true);
    expect(PushRequest.safeParse(push(Array.from({ length: fits + 1 }, () => record(perRecord)))).success).toBe(false);
  });

  it('lehnt denselben Datensatz zweimal in einem Push ab', () => {
    const one = record();
    expect(PushRequest.safeParse(push([one, { ...one, deleted: true }])).success).toBe(false);
  });

  it('lehnt einen leeren Push und eine fehlende Übertragungs-Kennung ab', () => {
    expect(PushRequest.safeParse(push([])).success).toBe(false);
    expect(PushRequest.safeParse({ baseSeq: 0, records: [record()] }).success).toBe(false);
  });

  it('liest den Cursor aus der Adresszeile und begrenzt die Seitengröße', () => {
    expect(PullQuery.parse({ since: '12' })).toEqual({ since: 12, limit: 500 });
    expect(PullQuery.safeParse({ since: '-1' }).success).toBe(false);
    expect(PullQuery.safeParse({ since: '0', limit: '501' }).success).toBe(false);
    for (const since of ['', ' ', '1e3', '0x10', '1.5', '01']) expect(PullQuery.safeParse({ since }).success).toBe(false);
    expect(PullQuery.safeParse({}).success).toBe(false);
  });
});

describe('Kalender-Abruf', () => {
  it('nimmt nur eine Adresse bis 2048 Zeichen und keine weiteren Felder an', () => {
    expect(CalendarFeedRequest.safeParse({ url: 'https://calendar.google.com/x.ics' }).success).toBe(true);
    expect(CalendarFeedRequest.safeParse({ url: '' }).success).toBe(false);
    expect(CalendarFeedRequest.safeParse({ url: 'a'.repeat(2048) }).success).toBe(true);
    expect(CalendarFeedRequest.safeParse({ url: 'a'.repeat(2049) }).success).toBe(false);
    expect(CalendarFeedRequest.safeParse({ url: 'https://calendar.google.com/x.ics', token: 'x' }).success).toBe(false);
  });
});
