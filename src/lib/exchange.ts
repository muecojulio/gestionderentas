/**
 * Helpers puros del tipo de cambio USD/MXN. Las fuentes son públicas, sin
 * llave ni registro:
 *
 *  1. GitHub REST API (api.github.com) sobre el repositorio abierto
 *     `AllRates-Today/central-bank-exchange-rates` (licencia CC BY 4.0), que
 *     publica diario las tasas oficiales de Banxico. No se envía ningún dato
 *     del usuario: la consulta es un archivo público del repositorio.
 *  2. Frankfurter (api.frankfurter.dev), datos del Banco Central Europeo,
 *     como respaldo cuando la primera fuente no responde.
 *
 * La capa de caché (memoria + tabla exchange_cache) vive en
 * `exchange.functions.ts`.
 */

export type ExchangeQuote = {
  rate: number;
  /** Atribución completa de la fuente (CC BY 4.0 para el dataset de Banxico). */
  source: string;
  /** Nombre corto para mostrar en la interfaz. */
  sourceLabel: string;
  /** Fecha de la tasa publicada por la fuente (puede ser de ayer). */
  rateDate: string;
};

export const EXCHANGE_PAIR = "USD_MXN" as const;

/** Ruta del dataset de Banxico dentro del repositorio público de GitHub. */
export const BANXICO_DATASET_URL =
  "https://api.github.com/repos/AllRates-Today/central-bank-exchange-rates/contents/data/banxico/latest.json";

export const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?base=USD&symbols=MXN";

function toRate(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Interpreta la respuesta de la GitHub Contents API para `latest.json` de
 * Banxico. Devuelve la tasa de referencia USD→MXN (o la de cierre como
 * respaldo), o null si el formato no es el esperado.
 */
export function parseBanxicoLatest(raw: unknown): ExchangeQuote | null {
  if (!raw || typeof raw !== "object") return null;
  const envelope = raw as { content?: unknown; encoding?: unknown };
  if (typeof envelope.content !== "string" || envelope.encoding !== "base64") return null;
  let parsed: unknown;
  try {
    const base64 = envelope.content.replace(/\s/g, "");
    parsed = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const doc = parsed as { rates?: unknown; date?: unknown };
  if (!Array.isArray(doc.rates)) return null;
  const usdMxn = doc.rates.filter(
    (row): row is { base: string; quote: string; type?: string; value: unknown } =>
      Boolean(row) &&
      typeof row === "object" &&
      (row as { base?: unknown }).base === "USD" &&
      (row as { quote?: unknown }).quote === "MXN",
  );
  const chosen =
    usdMxn.find((row) => row.type === "reference") ??
    usdMxn.find((row) => row.type === "close") ??
    usdMxn[0];
  const rate = chosen ? toRate(chosen.value) : null;
  if (rate == null) return null;
  const rateDate = typeof doc.date === "string" ? doc.date : "";
  return {
    rate,
    source: "Banxico · GitHub: AllRates-Today/central-bank-exchange-rates (CC BY 4.0)",
    sourceLabel: "Banxico",
    rateDate,
  };
}

/** Interpreta la respuesta de Frankfurter (tasas del BCE) para USD→MXN. */
export function parseFrankfurterLatest(raw: unknown): ExchangeQuote | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as { rates?: unknown; date?: unknown };
  if (!doc.rates || typeof doc.rates !== "object") return null;
  const rates = doc.rates as Record<string, unknown>;
  const rate = toRate(rates.MXN);
  if (rate == null) return null;
  return {
    rate,
    source: "Frankfurter · datos del Banco Central Europeo",
    sourceLabel: "BCE",
    rateDate: typeof doc.date === "string" ? doc.date : "",
  };
}

/** Formatea una tasa para mostrarla (ej. 18.4163 → "18.42"). */
export function formatRate(rate: number): string {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate);
}

/** Convierte un monto en pesos (centavos) a dólares según la tasa. */
export function centavosToUsd(centavos: number, rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return centavos / 100 / rate;
}

/** Formatea un monto en pesos (centavos) como dólares (≈ $1,234 USD). */
export function formatUsd(centavos: number, rate: number): string {
  const usd = centavosToUsd(centavos, rate);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: usd > 0 && usd < 100 ? 2 : 0,
  }).format(usd);
}
