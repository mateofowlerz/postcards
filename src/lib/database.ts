import postgres from 'postgres';
import { createHash } from 'node:crypto';

export function createDatabase(connectionString: string) {
  return postgres(connectionString, {
    max: 1,
    prepare: false,
    ssl: process.env.DATABASE_CA_CERT_BASE64
      ? { rejectUnauthorized: true, ca: Buffer.from(process.env.DATABASE_CA_CERT_BASE64, 'base64').toString('utf8') }
      : 'verify-full',
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
  });
}

const databaseGlobal = globalThis as typeof globalThis & {
  postcardDatabase?: { configuration: string; sql: ReturnType<typeof createDatabase> };
};

export function getDatabase() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for Postgres storage.');
  const configuration = createHash('sha256').update(process.env.DATABASE_URL)
    .update(process.env.DATABASE_CA_CERT_BASE64 ?? '').digest('hex');
  if (databaseGlobal.postcardDatabase?.configuration !== configuration) {
    void databaseGlobal.postcardDatabase?.sql.end({ timeout: 1 }).catch(() => {});
    databaseGlobal.postcardDatabase = { configuration, sql: createDatabase(process.env.DATABASE_URL) };
  }
  return databaseGlobal.postcardDatabase.sql;
}
