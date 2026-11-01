import { buildApp } from './app';
import { ConfigError, loadConfig } from './config';
import { createDb } from './db';
import { migrateToLatest } from './db/migrate';

async function main() {
  const config = loadConfig(process.env);
  const db = createDb(config.databaseUrl);
  await migrateToLatest(db);
  const app = await buildApp({ config, db });
  const shutdown = async () => {
    await app.close();
    await db.destroy();
    process.exit(0);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  await app.listen({ port: config.port, host: config.host });
}

main().catch((error: unknown) => {
  // Nur Art und Meldung; die Konfigurationsmeldung nennt nie Werte.
  console.error(error instanceof ConfigError ? error.message : 'Startup failed: ' + (error instanceof Error ? error.message : 'unknown error'));
  process.exit(1);
});
