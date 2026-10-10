/**
 * Respaldo local de los datos, en el navegador (`localStorage`).
 *
 * ¿Por qué existe? En un despliegue (Vercel) la base de datos puede no estar
 * disponible: sin `DATABASE_URL`, con la conexión caída o sin migraciones
 * aplicadas, cada consulta al servidor falla y la app se queda en "no se
 * pudieron cargar los departamentos". Este módulo guarda la misma información
 * en el dispositivo, con las mismas operaciones y las mismas reglas de
 * negocio (reutiliza `rentals.logic`), para que la app **siga funcionando**:
 * ver, dar de alta, editar, cobrar y exportar departamentos.
 *
 * Solo se usa cuando el servidor avisa de que su base no está disponible
 * (`getDataHealth`). En cuanto la base responde, los datos vuelven a servirse
 * desde ahí. Es un almacén de un solo usuario (la app no tiene inicio de
 * sesión), así que no lleva `user_id`: todo lo que hay en este navegador es de
 * quien lo usa.
 *
 * Nunca se importa desde código que corre en el servidor sin comprobar
 * `window`: en SSR todas las operaciones de lectura devuelven el estado vacío.
 */

import {
  addDays,
  blacklistHit,
  isUuid,
  mexicoOfficialHolidays,
  mexicoToday,
  monthsFrom,
  parseApartmentInput,
  periodInRange,
  tipoOf,
  rowsForMonth,
  shiftMonth,
  type Apartment,
  type ApartmentInput,
  type BlacklistEntry,
  type Holiday,
  type MonthRow,
  type MonthStay,
  type MonthTenancy,
  type Portfolio,
  type Receipt,
  type RentAdjustment,
  type Tenancy,
} from "@/lib/rentals.logic";
import type { IncomePoint } from "@/lib/rentals.functions";

const KEY = "gr:datos:v1";
const HOLIDAY_TTL = 86_400_000; // 24 h, igual que la caché del servidor

/** Departamento guardado: `recibido` y `ultimoIncremento` se calculan al leer. */
type StoredApartment = Omit<Apartment, "recibido" | "ultimoIncremento">;
type StoredTenancy = Tenancy & { apartmentId: string; createdAt: string };
type StoredReceipt = Receipt & { id: string };
type StoredAdjustment = RentAdjustment & { apartmentId: string };
type HolidayCache = { anio: number; payload: string; fetchedAt: string };

type LocalDb = {
  version: 1;
  apartments: StoredApartment[];
  tenancies: StoredTenancy[];
  blacklist: BlacklistEntry[];
  receipts: StoredReceipt[];
  adjustments: StoredAdjustment[];
  holidayCache: HolidayCache[];
};

const EMPTY: LocalDb = {
  version: 1,
  apartments: [],
  tenancies: [],
  blacklist: [],
  receipts: [],
  adjustments: [],
  holidayCache: [],
};

type Result = { ok: true } | { ok: false; error: string };

export type MonthResult =
  | {
      ok: true;
      anio: number;
      mes: number;
      rows: MonthRow[];
      esperado: number;
      recibido: number;
      porCobrar: number;
    }
  | { ok: false; error: string };

export type ExportResult =
  | {
      ok: true;
      apartment: Apartment;
      history: Tenancy[];
      receipts: Receipt[];
      adjustments: RentAdjustment[];
      today: string;
    }
  | { ok: false; error: string };

/** `localStorage` usable (puede no estarlo: modo privado, cuota llena, SSR). */
function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const store = window.localStorage;
    const probe = "__gr_probe__";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

/** ¿Este navegador puede guardar datos aunque el servidor no tenga base? */
export function hasLocalStorage(): boolean {
  return storage() !== null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Lee el documento entero; tolera versiones viejas o datos corruptos. */
export function readDb(): LocalDb {
  const store = storage();
  if (!store) return structuredClone(EMPTY);
  try {
    const raw = store.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return structuredClone(EMPTY);
    return {
      version: 1,
      apartments: asArray(parsed.apartments).filter(isRecord).map((r: any) => ({
        ...r,
        tipo: tipoOf((r as any).tipo) ?? "departamento",
      })) as StoredApartment[],
      tenancies: asArray(parsed.tenancies).filter(isRecord) as StoredTenancy[],
      blacklist: asArray(parsed.blacklist).filter(isRecord) as BlacklistEntry[],
      receipts: asArray(parsed.receipts).filter(isRecord) as StoredReceipt[],
      adjustments: asArray(parsed.adjustments).filter(isRecord) as StoredAdjustment[],
      holidayCache: asArray(parsed.holidayCache).filter(isRecord) as HolidayCache[],
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function writeDb(db: LocalDb): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify(db));
  } catch {
    // Cuota llena o almacenamiento bloqueado: la app sigue en memoria.
  }
}

/** Aplica un cambio y lo guarda. Devuelve lo que devuelva `fn`. */
function mutate<T>(fn: (db: LocalDb) => T): T {
  const db = readDb();
  const out = fn(db);
  writeDb(db);
  return out;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Fecha de vigencia más alta de los incrementos de un departamento. */
function lastIncrease(db: LocalDb, apartmentId: string): string | null {
  const dates = db.adjustments
    .filter((item) => item.apartmentId === apartmentId)
    .map((item) => item.vigenteDesde)
    .filter((value): value is string => typeof value === "string");
  return dates.length > 0 ? dates.reduce((a, b) => (b > a ? b : a)) : null;
}

/** Departamento con los campos derivados (`recibido`, `ultimoIncremento`). */
function hydrate(db: LocalDb, apt: StoredApartment, anio: number, mes: number): Apartment {
  return {
    ...apt,
    tipo: tipoOf((apt as any).tipo) ?? "departamento",
    recibido: db.receipts.some(
      (receipt) =>
        receipt.apartmentId === apt.id && receipt.anio === anio && receipt.mes === mes,
    ),
    ultimoIncremento: lastIncrease(db, apt.id),
  };
}

function sortedByName(rows: StoredApartment[]): StoredApartment[] {
  return [...rows].sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? "", "es"));
}

// ---------------------------------------------------------------- consultas

export function localListPortfolio(): Portfolio {
  const db = readDb();
  const today = mexicoToday();
  const anio = Number(today.slice(0, 4));
  const mes = Number(today.slice(5, 7));
  const apartments = sortedByName(db.apartments).map((apt) => hydrate(db, apt, anio, mes));
  const recibidoAnio = db.receipts
    .filter((receipt) => receipt.anio === anio)
    .reduce((sum, receipt) => sum + (Number(receipt.centavos) || 0), 0);
  return { today, anio, mes, apartments, recibidoAnio };
}

export function localListHistory(apartmentId: string): Tenancy[] {
  const db = readDb();
  return db.tenancies
    .filter((stay) => stay.apartmentId === apartmentId)
    .slice()
    .sort(
      (a, b) =>
        (b.fin ?? "").localeCompare(a.fin ?? "") ||
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    )
    .map(({ apartmentId: _apartmentId, createdAt: _createdAt, ...stay }) => stay);
}

export function localListBlacklist(): BlacklistEntry[] {
  const db = readDb();
  return [...db.blacklist].sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? "", "es"));
}

export function localListAdjustments(apartmentId: string): RentAdjustment[] {
  const db = readDb();
  return db.adjustments
    .filter((item) => item.apartmentId === apartmentId)
    .slice()
    .sort((a, b) => (b.vigenteDesde ?? "").localeCompare(a.vigenteDesde ?? ""))
    .map(({ apartmentId: _apartmentId, ...item }) => item);
}

export function localListIncomeTimeline(): IncomePoint[] {
  const db = readDb();
  const today = mexicoToday();
  const end = { anio: Number(today.slice(0, 4)), mes: Number(today.slice(5, 7)) };
  const start = shiftMonth(end.anio, end.mes, -11);
  const byKey = new Map<string, number>();
  for (const receipt of db.receipts) {
    const key = `${receipt.anio}-${receipt.mes}`;
    byKey.set(key, (byKey.get(key) ?? 0) + (Number(receipt.centavos) || 0));
  }
  return monthsFrom(start, end).map(({ anio, mes }) => ({
    anio,
    mes,
    centavos: byKey.get(`${anio}-${mes}`) ?? 0,
  }));
}

/** Filas de un mes con las mismas reglas que el servidor (`rowsForMonth`). */
function monthRows(
  db: LocalDb,
  anio: number,
  mes: number,
  today: string,
  receipts: { apartmentId: string; centavos: number }[],
): MonthRow[] {
  const apartments: MonthStay[] = db.apartments.map((apt) => ({
    id: apt.id,
    nombre: apt.nombre,
    ocupado: apt.ocupado,
    inquilino: apt.inquilino,
    rentaCentavos: apt.rentaCentavos,
    ingreso: apt.ingreso,
    contratoInicio: apt.contratoInicio,
    diaPago: apt.diaPago,
  }));
  const tenancies: MonthTenancy[] = db.tenancies.map((stay) => ({
    apartmentId: stay.apartmentId,
    inquilino: stay.inquilino,
    rentaCentavos: stay.rentaCentavos,
    inicio: stay.inicio,
    fin: stay.fin,
  }));
  return rowsForMonth({ anio, mes, today, apartments, tenancies, receipts });
}

export function localListMonth(anio: number, mes: number): MonthResult {
  const today = mexicoToday();
  if (!periodInRange(anio, mes, today)) {
    return { ok: false, error: "Ese mes está fuera del archivo." };
  }
  const db = readDb();
  const receipts = db.receipts
    .filter((receipt) => receipt.anio === anio && receipt.mes === mes)
    .map((receipt) => ({
      apartmentId: receipt.apartmentId,
      centavos: Number(receipt.centavos) || 0,
    }));
  const rows = monthRows(db, anio, mes, today, receipts);
  const esperado = rows.reduce((sum, row) => sum + row.rentaCentavos, 0);
  const recibido = rows
    .filter((row) => row.recibido)
    .reduce((sum, row) => sum + row.rentaCentavos, 0);
  return { ok: true, anio, mes, rows, esperado, recibido, porCobrar: esperado - recibido };
}

export function localExportApartment(id: string): ExportResult {
  const db = readDb();
  const today = mexicoToday();
  const anio = Number(today.slice(0, 4));
  const mes = Number(today.slice(5, 7));
  const found = db.apartments.find((apt) => apt.id === id);
  if (!found) return { ok: false, error: "No encontramos ese departamento." };
  const history = localListHistory(id);
  const receipts = db.receipts
    .filter((receipt) => receipt.apartmentId === id)
    .slice()
    .sort((a, b) => a.anio - b.anio || a.mes - b.mes)
    .map((receipt) => ({
      apartmentId: receipt.apartmentId,
      anio: receipt.anio,
      mes: receipt.mes,
      centavos: receipt.centavos,
      recibidoEl: receipt.recibidoEl,
    }));
  return {
    ok: true,
    apartment: hydrate(db, found, anio, mes),
    history,
    receipts,
    adjustments: localListAdjustments(id),
    today,
  };
}

/**
 * Feriados: el navegador los pide directo a la API pública de Nager.Date y los
 * guarda 24 h; si no hay red, se calculan con las reglas oficiales (art. 74
 * LFT), igual que hace el servidor.
 */
export async function localListHolidays(): Promise<Holiday[]> {
  const year = Number(mexicoToday().slice(0, 4));
  const db = readDb();
  const cached = db.holidayCache.find((entry) => entry.anio === year);
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < HOLIDAY_TTL) {
    try {
      return JSON.parse(cached.payload) as Holiday[];
    } catch {
      // caché corrupta: se vuelve a pedir
    }
  }
  let slim: Holiday[] = [];
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/MX`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(String(response.status));
    const data = (await response.json()) as { date?: string; localName?: string }[];
    slim = data
      .filter((item) => typeof item.date === "string" && typeof item.localName === "string")
      .map((item) => ({ date: item.date as string, localName: item.localName as string }));
  } catch {
    slim = mexicoOfficialHolidays(year);
  }
  if (slim.length > 0 || !cached) {
    const payload = JSON.stringify(slim);
    const fetchedAt = new Date().toISOString();
    mutate((current) => {
      const rest = current.holidayCache.filter((entry) => entry.anio !== year);
      current.holidayCache = [...rest, { anio: year, payload, fetchedAt }];
    });
  }
  if (slim.length === 0 && cached) {
    try {
      return JSON.parse(cached.payload) as Holiday[];
    } catch {
      return [];
    }
  }
  return slim;
}

// ---------------------------------------------------------------- escrituras

function toStored(input: ApartmentInput, id: string): StoredApartment {
  return {
    id,
    nombre: input.nombre,
    tipo: input.tipo,
    direccion: input.direccion,
    foto: input.foto,
    medidorLuz: input.medidorLuz,
    medidorAgua: input.medidorAgua,
    notaServicios: input.notaServicios,
    luzDia: input.luzDia,
    luzCentavos: input.luzCentavos,
    aguaDia: input.aguaDia,
    aguaCentavos: input.aguaCentavos,
    rentaCentavos: input.rentaCentavos,
    inquilino: input.inquilino,
    telefono: input.telefono,
    diaPago: input.diaPago,
    contratoInicio: input.contratoInicio,
    contratoFin: input.contratoFin,
    ingreso: input.ingreso,
    ocupado: input.ocupado,
    notas: input.notas,
    depositoCentavos: input.depositoCentavos,
    depositoFecha: input.depositoFecha,
    depositoEstado: input.depositoEstado,
    depositoNota: input.depositoNota,
  };
}

function archiveStay(db: LocalDb, apartmentId: string, apt: StoredApartment): void {
  db.tenancies.push({
    id: newId(),
    apartmentId,
    inquilino: apt.inquilino ?? "",
    rentaCentavos: apt.rentaCentavos ?? null,
    inicio: apt.ingreso ?? apt.contratoInicio ?? null,
    fin: mexicoToday(),
    depositoCentavos: apt.depositoCentavos ?? null,
    depositoFecha: apt.depositoFecha ?? null,
    depositoEstado: apt.depositoEstado ?? null,
    depositoNota: apt.depositoNota ?? "",
    createdAt: new Date().toISOString(),
  });
}

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | { ok: false; code: "blacklist"; error: string };

export function localSaveApartment(raw: unknown): SaveResult {
  const parsed = parseApartmentInput(raw);
  if (!parsed.ok) return parsed;
  const input = parsed.value;
  const db = readDb();
  if (input.ocupado && input.inquilino && !input.forzar) {
    const hit = blacklistHit(input.inquilino, db.blacklist);
    if (hit) {
      return {
        ok: false,
        code: "blacklist",
        error: `${hit.nombre} está en tu lista de personas a las que no volverías a rentar.`,
      };
    }
  }
  if (input.id && !input.ocupado) {
    const before = db.apartments.find((apt) => apt.id === input.id);
    if (before && before.ocupado) archiveStay(db, input.id, before);
  }
  const id = input.id ?? newId();
  const stored = toStored(input, id);
  const index = db.apartments.findIndex((apt) => apt.id === id);
  if (index >= 0) db.apartments[index] = stored;
  else db.apartments.push(stored);
  writeDb(db);
  return { ok: true, id };
}

export function localVacateApartment(id: string): Result {
  if (typeof id !== "string" || !isUuid(id)) return { ok: false, error: "Departamento inválido." };
  return mutate((db): Result => {
    const index = db.apartments.findIndex((apt) => apt.id === id);
    if (index < 0) return { ok: false, error: "No encontramos ese departamento." };
    const current = db.apartments[index];
    if (current.ocupado || current.inquilino) archiveStay(db, id, current);
    db.apartments[index] = {
      ...current,
      luzDia: null,
      luzCentavos: null,
      aguaDia: null,
      aguaCentavos: null,
      rentaCentavos: null,
      inquilino: "",
      telefono: "",
      diaPago: null,
      contratoInicio: null,
      contratoFin: null,
      ingreso: null,
      ocupado: false,
      notas: "",
      depositoCentavos: null,
      depositoFecha: null,
      depositoEstado: null,
      depositoNota: "",
    };
    return { ok: true };
  });
}

export function localDeleteApartment(id: string): Result {
  if (typeof id !== "string" || !isUuid(id)) return { ok: false, error: "Departamento inválido." };
  return mutate((db): Result => {
    const index = db.apartments.findIndex((apt) => apt.id === id);
    if (index < 0) return { ok: false, error: "No encontramos ese departamento." };
    db.apartments.splice(index, 1);
    db.tenancies = db.tenancies.filter((stay) => stay.apartmentId !== id);
    db.receipts = db.receipts.filter((receipt) => receipt.apartmentId !== id);
    db.adjustments = db.adjustments.filter((item) => item.apartmentId !== id);
    return { ok: true };
  });
}

export function localSetReceipt(input: {
  apartmentId: string;
  received: boolean;
  anio: number | null;
  mes: number | null;
}): Result {
  const today = mexicoToday();
  const anio = input.anio ?? Number(today.slice(0, 4));
  const mes = input.mes ?? Number(today.slice(5, 7));
  if (!periodInRange(anio, mes, today)) {
    return { ok: false, error: "Ese mes está fuera del archivo." };
  }
  return mutate((db): Result => {
    // Sin recibos: así la fila existe aunque se esté desmarcando el cobro.
    const month = monthRows(db, anio, mes, today, []);
    const row = month.find((item) => item.apartmentId === input.apartmentId);
    if (!row) return { ok: false, error: "Ese mes no tiene renta en este departamento." };
    const others = db.receipts.filter(
      (receipt) =>
        !(
          receipt.apartmentId === input.apartmentId &&
          receipt.anio === anio &&
          receipt.mes === mes
        ),
    );
    if (!input.received) {
      db.receipts = others;
      return { ok: true };
    }
    db.receipts = [
      ...others,
      {
        id: newId(),
        apartmentId: input.apartmentId,
        anio,
        mes,
        centavos: row.rentaCentavos,
        recibidoEl: today,
      },
    ];
    return { ok: true };
  });
}

export function localApplyIncrease(raw: unknown): Result {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Datos inválidos." };
  const o = raw as { apartmentId?: unknown; nuevoCentavos?: unknown; vigenteDesde?: unknown };
  if (typeof o.apartmentId !== "string" || !isUuid(o.apartmentId)) {
    return { ok: false, error: "Departamento inválido." };
  }
  const nuevo = Number(o.nuevoCentavos);
  if (!Number.isInteger(nuevo) || nuevo < 1 || nuevo > 50_000_000) {
    return { ok: false, error: "Revisa el monto de la nueva renta." };
  }
  const today = mexicoToday();
  const vigente = o.vigenteDesde == null || o.vigenteDesde === "" ? today : String(o.vigenteDesde);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vigente)) {
    return { ok: false, error: "Revisa la fecha de la nueva renta." };
  }
  return mutate((db): Result => {
    const index = db.apartments.findIndex((apt) => apt.id === o.apartmentId);
    if (index < 0) return { ok: false, error: "No encontramos ese departamento." };
    const apt = db.apartments[index];
    if (!apt.ocupado) return { ok: false, error: "Ese departamento no está rentado." };
    const anterior = apt.rentaCentavos;
    if (anterior == null) return { ok: false, error: "Primero anota la renta actual." };
    if (anterior === nuevo) return { ok: false, error: "La nueva renta es igual a la actual." };
    const start = apt.ingreso ?? apt.contratoInicio;
    if (start && vigente < start) {
      return { ok: false, error: "La fecha no puede ser anterior al ingreso." };
    }
    if (vigente > addDays(today, 60)) {
      return { ok: false, error: "La fecha no puede pasar de 60 días." };
    }
    db.apartments[index] = { ...apt, rentaCentavos: nuevo };
    db.adjustments.push({
      id: newId(),
      apartmentId: o.apartmentId as string,
      anteriorCentavos: anterior,
      nuevoCentavos: nuevo,
      vigenteDesde: vigente,
    });
    return { ok: true };
  });
}

export function localAddBlacklist(raw: unknown): Result {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Datos inválidos." };
  const o = raw as { nombre?: unknown; telefono?: unknown; motivo?: unknown };
  const nombre = typeof o.nombre === "string" ? o.nombre.trim() : "";
  if (nombre.length < 2 || nombre.length > 80) {
    return { ok: false, error: "Escribe el nombre completo." };
  }
  return mutate((db): Result => {
    if (blacklistHit(nombre, db.blacklist)) {
      return { ok: false, error: "Ese nombre ya está en la lista." };
    }
    db.blacklist.push({
      id: newId(),
      nombre,
      telefono: typeof o.telefono === "string" ? o.telefono.trim().slice(0, 24) : "",
      motivo: typeof o.motivo === "string" ? o.motivo.trim().slice(0, 240) : "",
    });
    return { ok: true };
  });
}

export function localRemoveBlacklist(id: unknown): Result {
  if (typeof id !== "string" || !isUuid(id)) return { ok: false, error: "Registro inválido." };
  return mutate((db): Result => {
    const before = db.blacklist.length;
    db.blacklist = db.blacklist.filter((entry) => entry.id !== id);
    return db.blacklist.length === before ? { ok: false, error: "Registro inválido." } : { ok: true };
  });
}

/** Vacía el respaldo local (se usa desde la interfaz, con confirmación). */
export function localClearAll(): void {
  writeDb(structuredClone(EMPTY));
}

/** Departamento suelto, con los campos derivados (lo usa la ficha/Excel). */
export function localApartment(id: string): Apartment | null {
  const db = readDb();
  const today = mexicoToday();
  const anio = Number(today.slice(0, 4));
  const mes = Number(today.slice(5, 7));
  const found = db.apartments.find((apt) => apt.id === id);
  return found ? hydrate(db, found, anio, mes) : null;
}
