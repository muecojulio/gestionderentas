import { pendingMigrations } from "../../scripts/migration-plan.mjs";

/** Which database backend is active. */
export type DbSource = "neon" | "pglite";

// An empty/whitespace DATABASE_URL (an easy misconfig in deploy UIs) must mean
// "unset" — otherwise production would silently run on the PGLite fallback.
const rawDatabaseUrl =
  typeof process !== "undefined" ? process.env.DATABASE_URL : undefined;
const databaseUrl =
  rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : undefined;

/**
 * Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
 * sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
 * the app has a working database even with nothing configured — the live preview
 * included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
 */
export const dbSource: DbSource = databaseUrl ? "neon" : "pglite";

/**
 * Vercel sets `VERCEL` on its builds and functions. A deployed function with no
 * `DATABASE_URL` cannot use the PGLite fallback: the WASM data file
 * (`pglite.data`) is not part of the serverless bundle, so the bootstrap fails
 * and takes the whole function down. Data must live in Postgres (Neon) there, so
 * we fail each request with a clear message instead of crashing the process.
 */
const deployedWithoutDatabase = !databaseUrl && Boolean(process.env.VERCEL);

/** The embedded PGLite fallback is usable here (local dev, preview builds). */
const pgliteFallbackUsable = dbSource === "pglite" && !deployedWithoutDatabase;

/**
 * La base de datos no está disponible (falta `DATABASE_URL`, no se puede
 * conectar o el esquema no existe). Se lanza como error propio para que cada
 * capa pueda distinguirla de un fallo de red o de un error de la app.
 */
export class DbUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbUnavailableError";
  }
}

/** Motivo legible de cualquier error (sin volcar el stack al navegador). */
function errText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return typeof err === "string" ? err : "Error desconocido.";
}

/**
 * Estado de la base de datos, tal como lo ve el servidor. El cliente lo usa
 * para decidir si puede confiar en los datos del servidor o si debe trabajar
 * con el respaldo local del navegador.
 */
export type DbStatus = {
  available: boolean;
  source: DbSource | "none";
  /** `false` cuando la conexión responde pero faltan las tablas de la app. */
  schemaReady: boolean;
  reason?: string;
};

/**
 * `migrations/*.sql` incrustadas en el bundle por el bundler (sin leer el
 * sistema de archivos en tiempo de ejecución, que en Vercel no existe).
 */
const migrationFiles = import.meta.glob("/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * Minimal shared SQL surface, satisfied by both Neon and PGLite. Both the
 * tagged-template and `.query()` forms resolve to an array of row objects:
 *
 *   const sql = await getSql();
 *   const rows = await sql`select * from todos where id = ${id}`; // parameterized
 *   const rows2 = await sql.query("select * from todos where id = $1", [id]);
 */
export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
  /** Ejecuta `fn` en una única transacción (un solo cliente/conexión). */
  transaction<T>(fn: (sql: Sql) => Promise<T>): Promise<T>;
  /** Varias sentencias de una vez (solo para SQL propio: las migraciones). */
  exec(text: string): Promise<void>;
}

/**
 * Init state lives on globalThis as promises: dev HMR creates new instances of
 * this module, and two instances racing module-level state would open a second
 * pool or run two concurrent PGLite migration passes (whose duplicate
 * `_migrations` insert rejects — and would get memoized, poisoning every later
 * `getSql()`). A failed init clears its slot so the next call retries.
 */
const globalRef = globalThis as typeof globalThis & {
  __pgSqlPromise__?: Promise<Sql>;
  __pgliteInstance__?: Promise<import("@electric-sql/pglite").PGlite>;
  __pgliteMigrateChain__?: Promise<void>;
};

/**
 * Result-type parity: Postgres sends every value as text plus a type OID — the
 * JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
 * int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
 * JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
 * production return identical, JSON-safe shapes:
 *   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
 *                                   `::text` if you ever need huge integers)
 *   date                         -> 'YYYY-MM-DD' string
 *   interval                     -> Postgres interval text
 * numeric already comes back as a string on both (arbitrary precision).
 */
const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (v: string) => v;

type Run = <T>(text: string, params?: unknown[]) => Promise<T[]>;
type Tx = <T>(fn: (sql: Sql) => Promise<T>) => Promise<T>;
type Exec = (text: string) => Promise<void>;

/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run: Run, exec: Exec, tx: Tx): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    // Rebuild with $1, $2, … placeholders so values stay parameterized.
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  // `params` se reenvía tal cual: sin parámetros el driver usa el protocolo
  // simple, que es lo que permite ejecutar un archivo .sql con varias
  // sentencias (necesario para las migraciones).
  sql.query = <T = Record<string, unknown>>(text: string, params?: unknown[]) =>
    run<T>(text, params);
  sql.exec = exec;
  sql.transaction = tx;
  return sql;
}

/**
 * Aplica las migraciones pendientes de `migrations/*.sql` (la única fuente del
 * esquema) y las anota en `_migrations`. Idempotente: se puede llamar en cada
 * arranque, en el preview (PGlite) y en producción (Neon), así una base ya
 * creada sigue al día aunque el migrador del build no haya corrido.
 */
async function applyPendingMigrations(sql: Sql): Promise<void> {
  if (Object.keys(migrationFiles).length === 0) return;
  await sql.query(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const doneRows = await sql.query<{ name: string }>("select name from _migrations");
  const pending = pendingMigrations(
    Object.keys(migrationFiles),
    doneRows.map((row) => row.name),
  );
  for (const { name, path } of pending) {
    // Cada archivo se aplica y se anota junto: si falla a medias, la siguiente
    // ejecución lo reintenta. `on conflict` evita que dos instancias serverless
    // que arrancan a la vez se bloqueen entre sí.
    await sql.transaction(async (tx) => {
      await tx.exec(migrationFiles[path]);
      await tx.query(
        "insert into _migrations (name) values ($1) on conflict (name) do nothing",
        [name],
      );
    });
  }
}

/**
 * Neon solo acepta conexiones cifradas. Si la cadena de conexión no trae
 * `sslmode`, `pg` intenta conectar en claro y el servidor rechaza la conexión
 * (y con ella, todas las consultas). Se activa SSL solo en ese caso: si la URL
 * ya define `sslmode`/`ssl`, manda la URL y nada cambia.
 */
function sslOption(): { ssl: Record<string, unknown> } | Record<string, never> {
  if (!databaseUrl) return {};
  try {
    const url = new URL(databaseUrl);
    const neonHost = /(^|\.)neon\.tech$/i.test(url.hostname);
    if (!neonHost) return {};
    if (url.searchParams.has("sslmode") || url.searchParams.has("ssl")) return {};
    return { ssl: { rejectUnauthorized: true } };
  } catch {
    return {};
  }
}

function createNeonSql(): Promise<Sql> {
  globalRef.__pgSqlPromise__ ??= (async () => {
    // Regular Postgres driver: node-postgres (`pg`) — works directly with Neon's
    // pooled endpoint. One pool per process; warm serverless instances reuse it.
    const { Pool, types } = await import("pg");
    types.setTypeParser(OID_INT8, Number);
    types.setTypeParser(OID_DATE, identity);
    types.setTypeParser(OID_INTERVAL, identity);
    const pool = new Pool({ connectionString: databaseUrl, max: 3, ...sslOption() });
    const one = (
      run: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>,
    ): Sql =>
      toSql(
        async <R>(text: string, params?: unknown[]) =>
          (await run(text, params)).rows as R[],
        async (text) => {
          await run(text);
        },
        async <R>(fn: (sql: Sql) => Promise<R>): Promise<R> => {
          // Una transacción necesita SIEMPRE el mismo cliente: `pool.query`
          // toma uno distinto en cada llamada y partiría el BEGIN/COMMIT.
          const client = await pool.connect();
          try {
            await client.query("begin");
            const out = await fn(one(async (t, p) => await client.query(t, p as unknown[])));
            await client.query("commit");
            return out;
          } catch (err) {
            try {
              await client.query("rollback");
            } catch {
              // ROLLBACK falla si la conexión se cayó: conserva el error real.
            }
            throw err;
          } finally {
            client.release();
          }
        },
      );
    const sql = one(async (text, params) => await pool.query(text, params as unknown[]));
    // El esquema se aplica aquí además de en el build: si el migrador de
    // `npm run build` se saltó (p. ej. sin DATABASE_URL en tiempo de build), la
    // primer petición deja la base al día en vez de fallar para siempre.
    await applyPendingMigrations(sql);
    return sql;
  })().catch((err) => {
    globalRef.__pgSqlPromise__ = undefined;
    throw err;
  });
  return globalRef.__pgSqlPromise__;
}

async function createPgliteSql(): Promise<Sql> {
  // Embedded Postgres, imported on demand so it never loads on the Neon path.
  // One in-memory instance per process, shared across HMR module instances, so
  // data survives source edits (it resets on dev-server restart).
  globalRef.__pgliteInstance__ ??= (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite({
      parsers: {
        [OID_INT8]: Number,
        [OID_DATE]: identity,
        [OID_INTERVAL]: identity,
      },
    });
    await pg.waitReady;
    await pg.exec(
      "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    return pg;
  })().catch((err) => {
    globalRef.__pgliteInstance__ = undefined;
    throw err;
  });
  const pg = await globalRef.__pgliteInstance__;

  /** Superficie `Sql` de una transacción de PGlite (`tx.query` / `tx.exec`). */
  const txSql = (tx: import("@electric-sql/pglite").Transaction): Sql =>
    toSql(
      async <T>(text: string, params?: unknown[]) => {
        const result = await tx.query<T>(text, params);
        return result.rows;
      },
      async (text: string) => {
        await tx.exec(text);
      },
      async () => {
        throw new Error("PGlite no soporta transacciones anidadas.");
      },
    );

  const sql = toSql(
    async <T>(text: string, params?: unknown[]) => {
      const result = await pg.query<T>(text, params);
      return result.rows;
    },
    async (text: string) => {
      await pg.exec(text);
    },
    async <T>(fn: (tx: Sql) => Promise<T>): Promise<T> =>
      pg.transaction(async (tx) => fn(txSql(tx))),
  );

  // El esquema sale de `migrations/*.sql` (misma fuente que producción): el SQL
  // va incrustado en el bundle con import.meta.glob, sin leer archivos en
  // tiempo de ejecución, y los archivos aplicados quedan en `_migrations`. El
  // glob no baja a subcarpetas, así que el esquema de auth queda fuera. Corre
  // una vez por instancia del módulo (un recargado por HMR aplica lo nuevo) con
  // las pasadas serializadas en una cadena global para que dos llamadas a la vez
  // nunca lo apliquen dos veces.
  const migrate = async (): Promise<void> => {
    await applyPendingMigrations(sql);
  };
  const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve())
    .catch(() => undefined) // an earlier failed pass must not wedge the chain
    .then(migrate);
  globalRef.__pgliteMigrateChain__ = pass;
  await pass;

  return sql;
}

let sqlPromise: Promise<Sql> | null = null;

async function createSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getSql() from a createServerFn handler " +
        "or a server route loader, never from client code.",
    );
  }
  if (deployedWithoutDatabase) {
    throw new DbUnavailableError(
      "DATABASE_URL no está configurada en Vercel. Agrega la cadena de conexión de " +
        "Postgres (Neon) en Project Settings → Environment Variables y vuelve a desplegar.",
    );
  }
  return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}

let dbStatusPromise: Promise<DbStatus> | null = null;

/** Estado real de la base: se conecta y comprueba que el esquema exista. */
async function probeDatabase(): Promise<DbStatus> {
  if (deployedWithoutDatabase) {
    return {
      available: false,
      source: "none",
      schemaReady: false,
      reason:
        "Falta DATABASE_URL en el proyecto desplegado. La app usa el respaldo de este dispositivo.",
    };
  }
  const sql = await getSql();
  const rows = await sql<{ ok: boolean }>`select to_regclass('public.apartments') is not null as ok`;
  const schemaReady = rows[0]?.ok !== false;
  if (!schemaReady) {
    return {
      available: false,
      source: dbSource,
      schemaReady: false,
      reason: "La base de datos no tiene las tablas de la app (migraciones pendientes).",
    };
  }
  return { available: true, source: dbSource, schemaReady: true };
}

/**
 * ¿Se puede usar la base de datos ahora mismo? Nunca lanza: devuelve
 * `available: false` con el motivo. El cliente lo consulta una vez por sesión
 * para saber si los datos viven en el servidor o en este dispositivo.
 *
 * Un resultado negativo NO se memoiza: si la base vuelve, la siguiente
 * consulta lo detecta sin reiniciar nada.
 */
export function checkDatabase(): Promise<DbStatus> {
  dbStatusPromise ??= probeDatabase()
    .catch((err): DbStatus => {
      dbStatusPromise = null;
      return { available: false, source: dbSource, schemaReady: false, reason: errText(err) };
    })
    .then((status) => {
      if (!status.available) dbStatusPromise = null;
      return status;
    });
  return dbStatusPromise;
}

/**
 * Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
 * otherwise the local PGLite fallback. Memoized — safe to call per request.
 *
 * Schema comes from `migrations/*.sql`, auto-applied before the first query on
 * both backends — define tables there, never inline in server functions.
 */
export function getSql(): Promise<Sql> {
  sqlPromise ??= createSql().catch((err) => {
    sqlPromise = null; // don't memoize failures — let the next call retry
    throw err;
  });
  return sqlPromise;
}

/**
 * The shared PGLite instance (preview only), with `migrations/*.sql` applied.
 * Lets Better Auth persist to the SAME embedded DB as app data in preview (via a
 * Kysely dialect). Throws when `DATABASE_URL` is set (that path uses Neon).
 */
export async function getPglite(): Promise<import("@electric-sql/pglite").PGlite> {
  if (dbSource !== "pglite") {
    throw new Error("getPglite() is only available on the PGLite fallback (no DATABASE_URL)");
  }
  await getSql();
  const pg = await globalRef.__pgliteInstance__;
  if (!pg) throw new Error("PGLite instance failed to initialize");
  return pg;
}

/**
 * Finish DB bootstrap before the server handles traffic.
 *
 * - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
 *   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
 * - **Neon**: no-op (pool is created lazily on first query).
 *
 * Vite `configureServer` awaits this at dev startup; production imports of this
 * module kick it off immediately (see bottom of file).
 */
export function ensureDbReady(): Promise<void> {
  // Neon: lazy pool. Deployed without a database: nothing to boot here — each
  // `getSql()` reports the missing DATABASE_URL on its own request.
  if (!pgliteFallbackUsable) return Promise.resolve();
  return getSql().then(() => undefined);
}

// Server-only eager start: kick PGLite bootstrap as soon as this module loads in
// Node. Client bundles never hit this path (`getSql` throws in the browser).
const globalBoot = globalThis as typeof globalThis & {
  __pgBootstrapPromise__?: Promise<void>;
};
if (typeof window === "undefined" && pgliteFallbackUsable) {
  // Log, don't rethrow: a rethrow here is an unhandled rejection that kills the
  // Node process. Callers that need the database still get the error from
  // `getSql()`, which clears its memo so the next request retries.
  globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
    globalBoot.__pgBootstrapPromise__ = undefined;
    console.error("[db] PGLite bootstrap failed:", err);
  });
}
