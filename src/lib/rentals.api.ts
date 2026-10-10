/**
 * Puerta de entrada a los datos de la app.
 *
 * Las páginas ya no hablan directo con las server functions: hablan con este
 * módulo, que decide de dónde salen los datos:
 *
 * - **Servidor** (lo normal): hay base de datos (Neon en el despliegue, PGlite
 *   en la vista previa) y todo se guarda ahí.
 * - **Este dispositivo** (respaldo): el servidor avisa de que su base no está
 *   (`getDataHealth` → `available: false`, por ejemplo un Vercel sin
 *   `DATABASE_URL`). En vez de fallar, la app trabaja con `localStorage`
 *   (`@/lib/local-store`) y sigue siendo usable: ver, dar de alta, editar,
 *   cobrar y exportar.
 *
 * La decisión se toma una vez por sesión y se guarda en memoria; si la base
 * vuelve, basta con recargar la página.
 */

import type { DbStatus } from "@/lib/db";
// Las server functions son la fuente principal: se importan completas para que
// este módulo sea la única puerta de entrada a los datos de la app.
import * as server from "@/lib/rentals.functions";
import {
  localAddBlacklist,
  localApplyIncrease,
  localDeleteApartment,
  localExportApartment,
  localListAdjustments,
  localListBlacklist,
  localListHistory,
  localListHolidays,
  localListIncomeTimeline,
  localListMonth,
  localListPortfolio,
  localRemoveBlacklist,
  localSaveApartment,
  localSetReceipt,
  localVacateApartment,
  hasLocalStorage,
  type ExportResult,
  type MonthResult,
  type SaveResult,
} from "@/lib/local-store";
import type {
  ApartmentInput,
  BlacklistEntry,
  Holiday,
  Portfolio,
  RentAdjustment,
  Tenancy,
} from "@/lib/rentals.logic";
import type { IncomePoint } from "@/lib/rentals.functions";

export type { IncomePoint };

type Mode = "server" | "local";

let healthPromise: Promise<DbStatus> | null = null;
let lastHealth: DbStatus | null = null;

/** Último estado conocido de la base del servidor (o `null` si no se ha sondeado). */
export function lastDbStatus(): DbStatus | null {
  return lastHealth;
}

/**
 * Estado de la base del servidor. Se sondea una sola vez por sesión y se
 * reutiliza; un fallo de red **sí** se propaga (para que la interfaz pueda
 * reintentar) a diferencia de un "la base no está", que es una respuesta
 * válida del servidor.
 */
export function dbHealth(): Promise<DbStatus> {
  healthPromise ??= server.getDataHealth()
    .then((status) => {
      lastHealth = status;
      return status;
    })
    .catch((err) => {
      healthPromise = null; // reintenta la próxima vez
      throw err;
    });
  return healthPromise;
}

async function mode(): Promise<Mode> {
  // En SSR no hay `localStorage`: ahí la única fuente posible es el servidor,
  // y las server functions se ejecutan en el mismo proceso (sin HTTP).
  if (typeof window === "undefined") return "server";
  const status = await dbHealth();
  return status.available ? "server" : "local";
}

export type SetReceiptInput = {
  apartmentId: string;
  received: boolean;
  anio: number | null;
  mes: number | null;
};

// ------------------------------------------------------------------ consultas

export async function listPortfolio(): Promise<Portfolio> {
  return (await mode()) === "local" ? localListPortfolio() : server.listPortfolio();
}

export async function listHistory(id: string): Promise<Tenancy[]> {
  return (await mode()) === "local" ? localListHistory(id) : server.listHistory({ data: id });
}

export async function listBlacklist(): Promise<BlacklistEntry[]> {
  return (await mode()) === "local" ? localListBlacklist() : server.listBlacklist();
}

export async function listHolidays(): Promise<Holiday[]> {
  return (await mode()) === "local" ? await localListHolidays() : server.listHolidays();
}

export async function listIncomeTimeline(): Promise<IncomePoint[]> {
  return (await mode()) === "local"
    ? localListIncomeTimeline()
    : server.listIncomeTimeline();
}

export async function listMonth(anio: number, mes: number): Promise<MonthResult> {
  return (await mode()) === "local"
    ? localListMonth(anio, mes)
    : server.listMonth({ data: { anio, mes } });
}

export async function exportApartment(id: string): Promise<ExportResult> {
  return (await mode()) === "local"
    ? localExportApartment(id)
    : server.exportApartment({ data: id });
}

export async function listAdjustments(id: string): Promise<RentAdjustment[]> {
  return (await mode()) === "local"
    ? localListAdjustments(id)
    : server.listAdjustments({ data: id });
}

// ----------------------------------------------------------------- escrituras

export async function saveApartment(value: ApartmentInput): Promise<SaveResult> {
  return (await mode()) === "local"
    ? localSaveApartment(value)
    : server.saveApartment({ data: value });
}

export async function vacateApartment(id: string): Promise<Result> {
  return (await mode()) === "local" ? localVacateApartment(id) : server.vacateApartment({ data: id });
}

export async function deleteApartment(id: string): Promise<Result> {
  return (await mode()) === "local" ? localDeleteApartment(id) : server.deleteApartment({ data: id });
}

export async function setReceipt(value: SetReceiptInput): Promise<Result> {
  return (await mode()) === "local" ? localSetReceipt(value) : server.setReceipt({ data: value });
}

export async function applyIncrease(value: {
  apartmentId: string;
  nuevoCentavos: number;
  vigenteDesde?: string | null;
}): Promise<Result> {
  return (await mode()) === "local"
    ? localApplyIncrease(value)
    : server.applyIncrease({ data: value });
}

export async function addBlacklist(value: {
  nombre: string;
  telefono: string;
  motivo: string;
}): Promise<Result> {
  return (await mode()) === "local" ? localAddBlacklist(value) : server.addBlacklist({ data: value });
}

export async function removeBlacklist(id: string): Promise<Result> {
  return (await mode()) === "local" ? localRemoveBlacklist(id) : server.removeBlacklist({ data: id });
}

/** ¿Puede este dispositivo guardar datos por su cuenta si el servidor no puede? */
export function canStoreLocally(): boolean {
  return hasLocalStorage();
}

type Result = { ok: true } | { ok: false; error: string };
