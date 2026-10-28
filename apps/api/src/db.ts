import { attachDatabasePool } from "@vercel/functions";
import pg from "pg";
import { env } from "./env.js";

// pg already treats sslmode=require as verify-full; saying so explicitly silences its warning.
const connectionString = env.DATABASE_URL.replace("sslmode=require", "sslmode=verify-full");

export const pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 10_000 });
attachDatabasePool(pool);

export type Db = pg.Pool | pg.PoolClient;

export async function withTransaction<T>(work: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local lock_timeout = '10s'");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export function isUniqueViolation(error: unknown, constraint: string): boolean {
  return error instanceof pg.DatabaseError && error.code === "23505" && error.constraint === constraint;
}

export function isBusy(error: unknown): boolean {
  const lockTimedOut = error instanceof pg.DatabaseError && error.code === "55P03";
  const noConnection = error instanceof Error && error.message.includes("timeout exceeded when trying to connect");
  return lockTimedOut || noConnection;
}
