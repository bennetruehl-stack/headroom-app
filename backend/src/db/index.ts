import { Kysely, PostgresDialect, type Generated } from 'kysely';
import pg from 'pg';

/** Tabellen des Backends. Fachliche Tabellen kommen mit den Konto- und Sync-Migrationen dazu. */
export interface Database {
  instance: { id: Generated<number>; installed_at: Generated<Date> };
}

export type Db = Kysely<Database>;

export function createDb(databaseUrl: string, options: { maxConnections?: number } = {}): Db {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: options.maxConnections ?? 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
  // Ein abgebrochener Leerlauf-Client darf den Prozess nicht beenden; die nächste Anfrage öffnet einen neuen.
  pool.on('error', () => undefined);
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}
