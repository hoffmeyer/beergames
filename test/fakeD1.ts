// Uses process.getBuiltinModule instead of `import "node:sqlite"` because
// vite-node's static externalization doesn't yet recognize the experimental
// node:sqlite builtin, causing it to try (and fail) to resolve it as a file.
type DatabaseSyncCtor = new (location: string) => {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  };
};

const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as {
  DatabaseSync: DatabaseSyncCtor;
};
const { readFileSync } = process.getBuiltinModule("node:fs") as {
  readFileSync: (path: string, encoding: string) => string;
};
const { fileURLToPath } = process.getBuiltinModule("node:url") as {
  fileURLToPath: (url: URL) => string;
};

function makeStatement(db: InstanceType<DatabaseSyncCtor>, sql: string, params: unknown[]) {
  return {
    bind: (...args: unknown[]) => makeStatement(db, sql, args),
    all: async <T>() => ({
      results: db.prepare(sql).all(...params) as T[],
      success: true,
    }),
    first: async <T>() => (db.prepare(sql).get(...params) as T | undefined) ?? null,
    run: async () => {
      db.prepare(sql).run(...params);
      return { success: true };
    },
  };
}

/** A D1Database-shaped wrapper around node:sqlite, seeded with the real migrations. */
export function createFakeD1() {
  const db = new DatabaseSync(":memory:");
  const migrationUrl = new URL("../migrations/0001_teams.sql", import.meta.url);
  db.exec(readFileSync(fileURLToPath(migrationUrl), "utf-8"));

  return {
    prepare: (sql: string) => makeStatement(db, sql, []),
  } as unknown as D1Database;
}
