import 'dotenv/config';

import { Pool, type PoolClient, type QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __acoesPool: Pool | undefined;
}

function getPool() {
  if (globalThis.__acoesPool) return globalThis.__acoesPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  globalThis.__acoesPool = new Pool({ connectionString });
  return globalThis.__acoesPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  const result = await getPool().query<T>(text, values);
  return result;
}

export async function withTransaction<T>(fn: (client: Pick<PoolClient, 'query'>) => Promise<T>) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
