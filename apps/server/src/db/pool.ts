import pg, { type PoolClient } from "pg";
import type { ServerConfig } from "../config.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDbPool(config?: ServerConfig): pg.Pool {
  if (!pool) {
    const connectionString = config?.databaseUrl ?? process.env.DATABASE_URL;
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000, // 2s readiness timeout
    });

    pool.on("error", (err) => {
      console.error("[Database Pool Error]", err.message);
    });
  }
  return pool;
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Health check: executes SELECT 1 with a strict 2-second timeout.
 * Used by /health/ready readiness probe.
 */
export async function checkDatabaseReadiness(poolInstance = getDbPool()): Promise<boolean> {
  let client: PoolClient | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database readiness probe timeout (2s)")), 2000)
    );

    const queryPromise = (async () => {
      client = await poolInstance.connect();
      await client.query("SELECT 1;");
      return true;
    })();

    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (_err) {
    return false;
  } finally {
    if (client) {
      try {
        (client as PoolClient).release();
      } catch {
        // Ignore release errors
      }
    }
  }
}

/**
 * Executes a callback within a strict tenant-isolated PostgreSQL transaction.
 *
 * Security Invariants:
 * 1. Sets transaction-local tenant context: app.current_community_id and app.current_workspace_id.
 * 2. RLS policies evaluate against these local session settings.
 * 3. Commits or rolls back atomically.
 * 4. Executes RESET ALL / DISCARD ALL before releasing client to prevent pooled connection leakage.
 */
export async function withTenantContext<T>(
  communityId: string,
  workspaceId: string | null,
  fn: (client: PoolClient) => Promise<T>,
  poolInstance = getDbPool()
): Promise<T> {
  const client = await poolInstance.connect();
  try {
    await client.query("BEGIN;");

    // Set transaction-local tenant context
    await client.query("SELECT set_config('app.current_community_id', $1, true);", [communityId]);
    if (workspaceId) {
      await client.query("SELECT set_config('app.current_workspace_id', $1, true);", [workspaceId]);
    } else {
      await client.query("SELECT set_config('app.current_workspace_id', '', true);");
    }

    const result = await fn(client);

    await client.query("COMMIT;");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK;");
    } catch {
      // rollback error suppressed
    }
    throw err;
  } finally {
    try {
      // Prevent connection-pool tenant leakage by resetting session variables
      await client.query("RESET ALL;");
    } catch {
      // Reset error suppressed
    }
    client.release();
  }
}
