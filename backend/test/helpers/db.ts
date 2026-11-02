import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import pg from 'pg';

export type TestDatabase = { url: string; stop: () => Promise<void> };

/**
 * Eine leere Datenbank je Test.
 * Mit `TEST_DATABASE_URL` (in der CI ein echtes Postgres 17) bekommt jeder Test eine eigene Datenbank. Eigene Schemas
 * reichen nicht: Kysely sucht seine Migrationstabelle in allen Schemas und sähe die eines anderen Tests.
 * Ohne läuft lokal PGlite (Postgres als WebAssembly) hinter einem Socket, damit der echte `pg`-Treiber spricht.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const shared = process.env.TEST_DATABASE_URL;
  if (shared) {
    const name = 'test_' + randomBytes(6).toString('hex');
    const run = async (statement: string) => {
      const admin = new pg.Client({ connectionString: shared });
      await admin.connect();
      try {
        await admin.query(statement);
      } finally {
        await admin.end();
      }
    };
    await run(`CREATE DATABASE ${name}`);
    const url = new URL(shared);
    url.pathname = '/' + name;
    return { url: url.toString(), stop: () => run(`DROP DATABASE ${name} WITH (FORCE)`) };
  }
  const db = await PGlite.create();
  const server = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1', maxConnections: 10 });
  await server.start();
  return {
    url: `postgres://postgres@${server.getServerConn()}/postgres?sslmode=disable`,
    stop: async () => {
      await server.stop();
      await db.close();
    },
  };
}
