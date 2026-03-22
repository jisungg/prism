import { Pool } from "pg";

declare global {
  var prismPool: Pool | undefined;
}

function getDatabaseUrl() {
  const value = process.env.DATABASE_URL;

  if (!value) {
    throw new Error("DATABASE_URL is not set.");
  }

  return value;
}

export const db =
  globalThis.prismPool ??
  new Pool({
    connectionString: getDatabaseUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismPool = db;
}
