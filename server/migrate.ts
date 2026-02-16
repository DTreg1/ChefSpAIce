import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { logger } from "./lib/logger";

export async function runDrizzleMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set, skipping migrations");
    return;
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "./migrations" });
    logger.info("Database migrations applied successfully");
  } catch (error) {
    logger.error("Database migration failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    await client.end();
  }
}
