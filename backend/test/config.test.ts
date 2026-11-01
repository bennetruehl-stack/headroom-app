import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config';

const secret = (bytes: number) => 'x'.repeat(bytes);
const base = {
  DATABASE_URL: 'postgres://headroom@db:5432/headroom',
  ALLOWED_ORIGINS: 'app://headroom, https://headroom.example',
  PRELOGIN_SECRET: secret(32),
};

describe('Konfiguration beim Start', () => {
  it('liest eine vollständige Konfiguration mit Standardwerten', () => {
    const config = loadConfig(base);
    expect(config.allowedOrigins).toEqual(['app://headroom', 'https://headroom.example']);
    expect(config.port).toBe(8080);
    expect(config.rateLimit).toEqual({ globalPerMinute: 300, authPerMinute: 20 });
  });

  it('bricht ohne DATABASE_URL mit klarer Meldung ab', () => {
    const { DATABASE_URL: _url, ...rest } = base;
    expect(() => loadConfig(rest)).toThrow(ConfigError);
    expect(() => loadConfig(rest)).toThrow(/DATABASE_URL/);
  });

  it('verlangt ein Server-Geheimnis von mindestens 32 Byte', () => {
    expect(() => loadConfig({ ...base, PRELOGIN_SECRET: secret(31) })).toThrow(/PRELOGIN_SECRET/);
    expect(loadConfig({ ...base, PRELOGIN_SECRET: secret(32) }).preloginSecret).toHaveLength(32);
    expect(loadConfig({ ...base, PRELOGIN_SECRET: secret(33) }).preloginSecret).toHaveLength(33);
  });

  it('nennt in Fehlermeldungen nie den Wert eines Geheimnisses', () => {
    const value = 'streng-geheim-' + secret(5);
    try {
      loadConfig({ ...base, PRELOGIN_SECRET: value });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain(value);
    }
  });

  it('liest das Geheimnis aus einer Datei (Docker-Secret)', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'headroom-')), 'secret');
    writeFileSync(file, secret(40) + '\n');
    const { PRELOGIN_SECRET: _secret, ...rest } = base;
    expect(loadConfig({ ...rest, PRELOGIN_SECRET_FILE: file }).preloginSecret).toBe(secret(40));
  });

  it('lehnt eine leere Liste erlaubter Ursprünge und Platzhalter ab', () => {
    expect(() => loadConfig({ ...base, ALLOWED_ORIGINS: '' })).toThrow(/ALLOWED_ORIGINS/);
    expect(() => loadConfig({ ...base, ALLOWED_ORIGINS: '*' })).toThrow(/ALLOWED_ORIGINS/);
  });
});
