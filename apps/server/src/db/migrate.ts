import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDbPool, closeDbPool } from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(migrationsDir?: string): Promise<string[]> {
  const targetDir = migrationsDir ?? path.join(__dirname, "migrations");
  const pool = getDbPool();
  const client = await pool.connect();
  const applied: string[] = [];

  try {
    // 1. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Read existing migrations
    const res = await client.query<{ version: string }>(
      "SELECT version FROM schema_migrations ORDER BY version ASC;"
    );
    const existingVersions = new Set(res.rows.map((r) => r.version));

    // 3. Read files in migrations directory
    const files = await fs.readdir(targetDir);
    const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

    for (const file of sqlFiles) {
      if (!existingVersions.has(file)) {
        console.log(`[Migrations] Applying ${file}...`);
        const filePath = path.join(targetDir, file);
        const sql = await fs.readFile(filePath, "utf-8");

        await client.query("BEGIN;");
        try {
          await client.query(sql);
          await client.query("INSERT INTO schema_migrations (version) VALUES ($1);", [file]);
          await client.query("COMMIT;");
          applied.push(file);
          console.log(`[Migrations] Applied ${file} successfully.`);
        } catch (err) {
          await client.query("ROLLBACK;");
          throw new Error(`Failed to apply migration ${file}: ${(err as Error).message}`);
        }
      }
    }

    return applied;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution: tsx src/db/migrate.ts
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then((applied) => {
      console.log(`[Migrations Complete] Applied ${applied.length} new migrations.`);
      return closeDbPool();
    })
    .catch((err) => {
      console.error("[Migrations Failed]", err);
      process.exit(1);
    });
}
