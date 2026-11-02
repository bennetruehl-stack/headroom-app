import { Migrator, type Migration, type MigrationProvider } from 'kysely/migration';
import type { Db } from './index';
import * as init from './migrations/001_init';

/** Alle Migrationen in fester Reihenfolge. Neue Dateien hier eintragen. */
const migrations: Record<string, Migration> = {
  '001_init': init,
};

const provider: MigrationProvider = { getMigrations: async () => migrations };

function migrator(db: Db): Migrator {
  return new Migrator({ db, provider });
}

export async function migrateToLatest(db: Db): Promise<void> {
  const { error, results } = await migrator(db).migrateToLatest();
  const failed = results?.find((result) => result.status === 'Error');
  if (error || failed) throw new Error('Database migration failed' + (failed ? ': ' + failed.migrationName : ''), { cause: error });
}

export async function migrationsComplete(db: Db): Promise<boolean> {
  const all = await migrator(db).getMigrations();
  return all.every((migration) => migration.executedAt !== undefined);
}
