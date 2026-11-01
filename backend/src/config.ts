import { readFileSync } from 'node:fs';
import { z } from 'zod';

export class ConfigError extends Error {
  override name = 'ConfigError';
}

const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback);

const Env = z.object({
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgres:// URL'),
  ALLOWED_ORIGINS: z
    .string()
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.string().regex(/^[a-z][a-z0-9+.-]*:\/\/[^\s/*]+$/, 'exact origin, no wildcard')).min(1)),
  PRELOGIN_SECRET: z.string().min(32, 'at least 32 bytes'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  HOST: z.string().min(1).default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Nur hinter einem eigenen Reverse-Proxy einschalten, sonst kann jede Anfrage ihre Adresse fälschen. */
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  RATE_LIMIT_GLOBAL_PER_MINUTE: positiveInt(300),
  RATE_LIMIT_AUTH_PER_MINUTE: positiveInt(20),
});

export type Config = {
  databaseUrl: string;
  allowedOrigins: string[];
  preloginSecret: string;
  port: number;
  host: string;
  logLevel: z.infer<typeof Env>['LOG_LEVEL'];
  trustProxy: boolean;
  rateLimit: { globalPerMinute: number; authPerMinute: number };
};

/** Ein Docker-Secret liegt als Datei vor; die Umgebung nennt dann nur den Pfad. */
function withSecretFile(env: Record<string, string | undefined>): Record<string, string | undefined> {
  const file = env.PRELOGIN_SECRET_FILE;
  if (!file || env.PRELOGIN_SECRET) return env;
  try {
    return { ...env, PRELOGIN_SECRET: readFileSync(file, 'utf8').trim() };
  } catch {
    throw new ConfigError('Invalid configuration: PRELOGIN_SECRET_FILE cannot be read');
  }
}

/**
 * Prüft die Umgebung beim Start. Fehlt etwas, startet das Backend nicht.
 * Die Meldung nennt nur Namen und Regel, nie einen Wert.
 */
export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = Env.safeParse(withSecretFile(env));
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.code === 'invalid_type' ? 'missing' : issue.message}`);
    throw new ConfigError('Invalid configuration: ' + problems.join('; '));
  }
  const value = parsed.data;
  return {
    databaseUrl: value.DATABASE_URL,
    allowedOrigins: value.ALLOWED_ORIGINS,
    preloginSecret: value.PRELOGIN_SECRET,
    port: value.PORT,
    host: value.HOST,
    logLevel: value.LOG_LEVEL,
    trustProxy: value.TRUST_PROXY,
    rateLimit: { globalPerMinute: value.RATE_LIMIT_GLOBAL_PER_MINUTE, authPerMinute: value.RATE_LIMIT_AUTH_PER_MINUTE },
  };
}
