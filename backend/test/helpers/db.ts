import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import pg from 'pg';

export type TestDatabase = { url: string; stop: () => Promise<void> };

/**
 * Eine leere Datenbank je Test.
 * Mit `TEST_DATABASE_URL` (in der CI ein echtes Postgres 17) bekommt jeder Test ein eigenes Schema.
 * Ohne läuft lokal PGlite (Postgres als WebAssembly) hinter einem Socket, damit der echte `pg`-Treiber spricht.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const shared = process.env.TEST_DATABASE_URL;
  if (shared) {
    const schema = 'test_' + randomBytes(6).toString('hex');
    const admin = new pg.Client({ connectionString: shared });
    await admin.connect();
    await admin.query(`CREATE SCHEMA ${schema}`);
    await admin.end();
    const url = new URL(shared);
    url.searchParams.set('options', `-c search_path=${schema}`);
    // Ohne wirksames search_path liefen alle Tests im selben Schema und könnten sich gegenseitig grün färben.
    const check = new pg.Client({ connectionString: url.toString() });
    await check.connect();
    const { rows } = await check.query<{ search_path: string }>('SHOW search_path');
    await check.end();
    if (rows[0]?.search_path !== schema) throw new Error('TEST_DATABASE_URL does not honour search_path; isolated test schemas are not possible');
    return {
      url: url.toString(),
      stop: async () => {
        const cleanup = new pg.Client({ connectionString: shared });
        await cleanup.connect();
        await cleanup.query(`DROP SCHEMA ${schema} CASCADE`);
        await cleanup.end();
      },
    };
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
