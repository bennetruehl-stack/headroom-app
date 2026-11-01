/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import {
  AccountDeleteRequest,
  KDF_MINIMUM,
  KeysUpdateRequest,
  LoginRequest,
  PreloginRequest,
  RecoverFinishRequest,
  RegisterRequest,
} from './auth';
import { MAX_RECORD_BYTES, MAX_RECORDS_PER_PUSH, PullQuery, PushRequest } from './sync';

/** Zufällige Bytes als base64url, wie die App sie schickt. */
const b64 = (bytes: number) => Buffer.alloc(bytes, 7).toString('base64url');
const uuid = '6f1c2d3e-4b5a-4c7d-8e9f-0a1b2c3d4e5f';
const kdf = { algorithm: 'argon2id', memoryKiB: 65536, iterations: 3, parallelism: 1 } as const;
const wrap = { encVersion: 1, iv: b64(12), ciphertext: b64(48) };
const record = (ciphertextBytes = 200) => ({ id: b64(16), encVersion: 1, iv: b64(12), ciphertext: b64(ciphertextBytes), deleted: false });

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

  it('lehnt einen leeren Push und eine fehlende Übertragungs-Kennung ab', () => {
    expect(PushRequest.safeParse(push([])).success).toBe(false);
    expect(PushRequest.safeParse({ baseSeq: 0, records: [record()] }).success).toBe(false);
  });

  it('liest den Cursor aus der Adresszeile und begrenzt die Seitengröße', () => {
    expect(PullQuery.parse({ since: '12' })).toEqual({ since: 12, limit: 500 });
    expect(PullQuery.safeParse({ since: '-1' }).success).toBe(false);
    expect(PullQuery.safeParse({ since: '0', limit: '501' }).success).toBe(false);
  });
});
