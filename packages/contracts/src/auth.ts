// Konto und Schlüssel. Das Passwort verlässt das Gerät nie: Die App leitet daraus mit Argon2id und HKDF
// einen `authKey` (für den Server) und einen `masterKey` (bleibt auf dem Gerät) ab.
import { z } from 'zod';
import { base64urlBytes, base64urlExact } from './encoding';

/**
 * Mindestwerte für Argon2id (OWASP Password Storage Cheat Sheet). Die App lehnt schwächere Einstellungen ab,
 * damit ein manipulierter Server sie nicht absenken kann.
 */
export const KDF_MINIMUM = { memoryKiB: 19 * 1024, iterations: 2, parallelism: 1 } as const;

export const KdfParams = z.strictObject({
  algorithm: z.literal('argon2id'),
  memoryKiB: z.int().min(KDF_MINIMUM.memoryKiB).max(1024 * 1024),
  iterations: z.int().min(KDF_MINIMUM.iterations).max(20),
  parallelism: z.int().min(KDF_MINIMUM.parallelism).max(8),
});
export type KdfParams = z.infer<typeof KdfParams>;

export const AuthScheme = z.literal('argon2id-hkdf-v1');

/** E-Mail-Adresse, ohne Leerzeichen und klein geschrieben. */
export const Email = z.string().trim().toLowerCase().max(254).pipe(z.email());

/** 256 Bit aus der Schlüsselableitung. */
export const DerivedKey = base64urlExact(32);
export const Salt = base64urlBytes(16, 64);
/** Zufälliges Sitzungs-Token. Der Server speichert nur seinen Hash. */
export const SessionToken = base64urlExact(32);

/** Der Datenschlüssel, verpackt mit AES-GCM. Der Server kann ihn nicht öffnen. */
export const WrappedKey = z.strictObject({
  encVersion: z.int().min(1).max(255),
  iv: base64urlExact(12),
  ciphertext: base64urlBytes(32, 512),
});
export type WrappedKey = z.infer<typeof WrappedKey>;

export const PreloginRequest = z.strictObject({ email: Email });
export type PreloginRequest = z.infer<typeof PreloginRequest>;
/** Für unbekannte Adressen gibt es ein festes Schein-Salt, damit sich nicht prüfen lässt, ob ein Konto besteht. */
export const PreloginResponse = z.strictObject({ salt: Salt, kdf: KdfParams, authScheme: AuthScheme });
export type PreloginResponse = z.infer<typeof PreloginResponse>;

export const RegisterRequest = z.strictObject({
  email: Email,
  authKey: DerivedKey,
  recoveryAuthKey: DerivedKey,
  salt: Salt,
  kdf: KdfParams,
  authScheme: AuthScheme,
  masterKeyWrap: WrappedKey,
  recoveryKeyWrap: WrappedKey,
  /** Die Person hat bestätigt: Ohne Passwort und Wiederherstellungscode sind die Daten nicht wiederherstellbar. */
  recoveryNoticeAccepted: z.literal(true),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const SessionResponse = z.strictObject({ token: SessionToken, expiresAt: z.iso.datetime() });
export type SessionResponse = z.infer<typeof SessionResponse>;

export const LoginRequest = z.strictObject({ email: Email, authKey: DerivedKey });
export type LoginRequest = z.infer<typeof LoginRequest>;
export const LoginResponse = SessionResponse.extend({ masterKeyWrap: WrappedKey });
export type LoginResponse = z.infer<typeof LoginResponse>;

/** Wiederherstellen, Schritt 1: Mit dem Schlüssel aus dem Code gibt der Server das zweite Schlüsselpaket heraus. */
export const RecoverStartRequest = z.strictObject({ email: Email, recoveryAuthKey: DerivedKey });
export type RecoverStartRequest = z.infer<typeof RecoverStartRequest>;
export const RecoverStartResponse = z.strictObject({ recoveryKeyWrap: WrappedKey });
export type RecoverStartResponse = z.infer<typeof RecoverStartResponse>;

/** Wiederherstellen, Schritt 2: neues Passwort und neu verpackter Datenschlüssel. Alle Sitzungen werden ungültig. */
export const RecoverFinishRequest = z.strictObject({
  email: Email,
  recoveryAuthKey: DerivedKey,
  newAuthKey: DerivedKey,
  newSalt: Salt,
  newKdf: KdfParams,
  newMasterKeyWrap: WrappedKey,
});
export type RecoverFinishRequest = z.infer<typeof RecoverFinishRequest>;

/** Abmelden, Konto lesen und Schlüssel lesen haben keinen Body; das Token steht im Header. */
export const EmptyBody = z.strictObject({});

export const AccountResponse = z.strictObject({ email: Email, createdAt: z.iso.datetime() });
export type AccountResponse = z.infer<typeof AccountResponse>;

/** Konto löschen verlangt den aktuellen Schlüssel erneut. */
export const AccountDeleteRequest = z.strictObject({ authKey: DerivedKey });
export type AccountDeleteRequest = z.infer<typeof AccountDeleteRequest>;

export const KeysResponse = z.strictObject({ masterKeyWrap: WrappedKey, salt: Salt, kdf: KdfParams, authScheme: AuthScheme });
export type KeysResponse = z.infer<typeof KeysResponse>;

/** Passwort ändern: Nur das Schlüsselpaket wird neu verpackt, die Datensätze bleiben. Verlangt den aktuellen Schlüssel. */
export const KeysUpdateRequest = z.strictObject({
  authKey: DerivedKey,
  newAuthKey: DerivedKey,
  newSalt: Salt,
  newKdf: KdfParams,
  newMasterKeyWrap: WrappedKey,
});
export type KeysUpdateRequest = z.infer<typeof KeysUpdateRequest>;
