import { sql, type Kysely } from 'kysely';

/** Grundgerüst: eine Zeile je Installation, damit die erste Migration ein echtes Schema anlegt. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('instance')
    .addColumn('id', 'integer', (column) => column.primaryKey().check(sql`id = 1`))
    .addColumn('installed_at', 'timestamptz', (column) => column.notNull().defaultTo(sql`now()`))
    .execute();
  await sql`INSERT INTO instance (id) VALUES (1)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('instance').execute();
}
