import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  BANXICO_DATASET_URL,
  EXCHANGE_PAIR,
  FRANKFURTER_URL,
  parseBanxicoLatest,
  parseFrankfurterLatest,
  type ExchangeQuote,
} from "@/lib/exchange";

export type ExchangeRate = {
  pair: typeof EXCHANGE_PAIR;
  /** Pesos mexicanos por 1 USD. */
  rate: number;
  /** Atribución completa de la fuente. */
  source: string;
  /** Nombre corto para la interfaz. */
  sourceLabel: string;
  rateDate: string;
  fetchedAt: string;
  /** True cuando se sirvió de la caché porque las fuentes no respondieron. */
  stale: boolean;
};

/** La tasa se considera vigente 12 horas; la caché en memoria, 5 minutos. */
const DB_TTL_MS = 12 * 60 * 60 * 1000;
const MEMORY_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

type MemoryEntry = { quote: ExchangeQuote; at: number };

// Sobrevive a recargas de módulo (HMR) para no pedir la tasa en cada recarga.
const globalRef = globalThis as typeof globalThis & {
  __exchangeMemory__?: Map<string, MemoryEntry>;
};
const memory = (globalRef.__exchangeMemory__ ??= new Map());

function toExchangeRate(
  quote: ExchangeQuote,
  fetchedAt: string,
  stale: boolean,
): ExchangeRate {
  return {
    pair: EXCHANGE_PAIR,
    rate: quote.rate,
    source: quote.source,
    sourceLabel: quote.sourceLabel,
    rateDate: quote.rateDate,
    fetchedAt,
    stale,
  };
}

async function fetchQuote(): Promise<ExchangeQuote | null> {
  // 1) API pública de GitHub (sin llave) sobre el dataset de Banxico.
  try {
    const response = await fetch(BANXICO_DATASET_URL, {
      headers: {
        accept: "application/vnd.github+json",
        // La API de GitHub rechaza solicitudes sin User-Agent.
        "user-agent": "gestionderentas (consulta pública de tasas Banxico)",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (response.ok) {
      const quote = parseBanxicoLatest(await response.json());
      if (quote) return quote;
    }
  } catch {
    /* la fuente pública no respondió — se intenta la siguiente */
  }
  // 2) Frankfurter (datos del BCE), también pública y sin llave.
  try {
    const response = await fetch(FRANKFURTER_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (response.ok) {
      const quote = parseFrankfurterLatest(await response.json());
      if (quote) return quote;
    }
  } catch {
    /* sin conexión a fuentes públicas */
  }
  return null;
}

/**
 * Tipo de cambio USD→MXN. Caché en tres niveles: memoria (5 min) → tabla
 * `exchange_cache` (12 h) → fuentes públicas. Si todo falla, se sirve la
 * última tasa conocida marcada como `stale` para no dejar la UI vacía.
 */
export const getExchangeRate = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<ExchangeRate | null> => {
    const now = Date.now();
    const mem = memory.get(EXCHANGE_PAIR);
    if (mem && now - mem.at < MEMORY_TTL_MS) {
      return toExchangeRate(mem.quote, new Date(mem.at).toISOString(), false);
    }

    // Sin base de datos (por ejemplo un despliegue sin `DATABASE_URL`) la
    // caché no existe, pero la tasa se puede consultar igual: este dato es
    // informativo y no debe tumbar la pantalla.
    let sql: Sql | null = null;
    try {
      sql = await getSql();
    } catch {
      sql = null;
    }
    const cached = sql
      ? await sql<{
          rate: unknown;
          source: string;
          source_label: string;
          rate_date: string;
          fetched_at: string | Date;
        }>`
          select rate, source, source_label, rate_date, fetched_at
          from exchange_cache
          where pair = ${EXCHANGE_PAIR}
        `
      : [];
    const row = cached[0];
    const cachedAt = row ? new Date(row.fetched_at).getTime() : 0;
    const rate = row ? Number(row.rate) : NaN;
    const valid = row && Number.isFinite(rate) && rate > 0;
    if (valid && now - cachedAt < DB_TTL_MS) {
      const quote: ExchangeQuote = {
        rate,
        source: row.source,
        sourceLabel: row.source_label,
        rateDate: row.rate_date,
      };
      memory.set(EXCHANGE_PAIR, { quote, at: now });
      return toExchangeRate(quote, new Date(cachedAt).toISOString(), false);
    }

    const quote = await fetchQuote();
    if (quote) {
      memory.set(EXCHANGE_PAIR, { quote, at: now });
      if (sql) await sql`
        insert into exchange_cache (pair, rate, source, source_label, rate_date, fetched_at)
        values (${EXCHANGE_PAIR}, ${quote.rate}, ${quote.source}, ${quote.sourceLabel}, ${quote.rateDate}, now())
        on conflict (pair) do update
          set rate = ${quote.rate}, source = ${quote.source},
              source_label = ${quote.sourceLabel},
              rate_date = ${quote.rateDate}, fetched_at = now()
      `;
      return toExchangeRate(quote, new Date(now).toISOString(), false);
    }

    // Sin fuentes: último valor conocido, marcado como desactualizado.
    if (valid) {
      return toExchangeRate(
        { rate, source: row.source, sourceLabel: row.source_label, rateDate: row.rate_date },
        new Date(cachedAt).toISOString(),
        true,
      );
    }
    return null;
  });
