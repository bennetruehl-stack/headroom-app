import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import type { DestinationStream } from 'pino';
import type { Config } from './config';
import type { Db } from './db';
import { migrationsComplete } from './db/migrate';

/** Felder, die nie im Klartext ins Log dürfen. */
export const redactedPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-forwarded-for"]',
  'req.headers["x-real-ip"]',
  'req.headers["forwarded"]',
  '*.email',
  '*.authKey',
  '*.recoveryAuthKey',
  '*.ciphertext',
  '*.token',
];

const READY_TIMEOUT_MS = 2_000;

export type AppOptions = {
  config: Config;
  db: Db;
  /** Ziel der Logs; ohne Angabe die Standardausgabe. */
  logStream?: DestinationStream;
  /** Fachliche Routen, die nach den Schutzschichten registriert werden. */
  routes?: (app: FastifyInstance) => unknown;
};

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms).unref())]);

export async function buildApp({ config, db, logStream, routes }: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    trustProxy: config.trustProxy,
    bodyLimit: 1024 * 1024,
    logger: {
      level: config.logLevel,
      redact: { paths: redactedPaths, censor: '[REDACTED]' },
      // Keine IP-Adressen und Ports im Log.
      serializers: {
        req: (request) => ({ id: request.id, method: request.method, url: request.url.split('?')[0], headers: request.headers }),
      },
      ...(logStream ? { stream: logStream } : {}),
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet);
  await app.register(cors, {
    origin: (origin, callback) => callback(null, origin !== undefined && config.allowedOrigins.includes(origin)),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['content-type', 'authorization'],
    maxAge: 600,
  });
  // Anmeldung und Konto bekommen ein engeres Limit; muss vor dem Rate-Limit-Plugin stehen, damit dessen Hook die Einstellung sieht.
  app.addHook('onRoute', (route) => {
    if (route.url.startsWith('/v1/auth/')) {
      route.config = { ...route.config, rateLimit: { max: config.rateLimit.authPerMinute, timeWindow: '1 minute' } };
    }
  });
  await app.register(rateLimit, { global: true, max: config.rateLimit.globalPerMinute, timeWindow: '1 minute' });

  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'not_found' }));
  app.setErrorHandler((error: { statusCode?: number; validation?: unknown }, request, reply) => {
    if (error.validation) return reply.code(400).send({ error: 'invalid_request' });
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
    if (status === 429) return reply.code(429).send({ error: 'rate_limited' });
    if (status >= 500) request.log.error({ err: error }, 'request failed');
    return reply.code(status).send({ error: status >= 500 ? 'internal_error' : 'bad_request' });
  });

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async (_request, reply) => {
    try {
      const ready = await withTimeout(migrationsComplete(db), READY_TIMEOUT_MS);
      if (ready) return { status: 'ready' };
    } catch {
      // Datenbank nicht erreichbar.
    }
    return reply.code(503).send({ status: 'unavailable' });
  });

  if (routes) await app.register(async (instance) => { await routes(instance); });
  await app.ready();
  return app;
}
