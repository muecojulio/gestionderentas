export type PropertyTipo = "departamento" | "accesoria";

export const TIPO_LABEL: Record<PropertyTipo, string> = {
  departamento: "Departamento",
  accesoria: "Accesoria",
};

export const TIPO_PLURAL: Record<PropertyTipo, string> = {
  departamento: "Departamentos",
  accesoria: "Accesorias",
};

export const TIPOS: readonly PropertyTipo[] = ["departamento", "accesoria"] as const;

export function tipoOf(value: unknown): PropertyTipo | null {
  return value === "departamento" || value === "accesoria" ? value : null;
}

export type Apartment = {
  id: string;
  nombre: string;
  tipo: PropertyTipo;
  direccion: string;
  foto: string | null;
  medidorLuz: string;
  medidorAgua: string;
  notaServicios: string;
  luzDia: number | null;
  luzCentavos: number | null;
  aguaDia: number | null;
  aguaCentavos: number | null;
  rentaCentavos: number | null;
  inquilino: string;
  telefono: string;
  diaPago: number | null;
  contratoInicio: string | null;
  contratoFin: string | null;
  ingreso: string | null;
  ocupado: boolean;
  notas: string;
  recibido: boolean;
  depositoCentavos: number | null;
  depositoFecha: string | null;
  depositoEstado: DepositoEstado | null;
  depositoNota: string;
  ultimoIncremento: string | null;
};

export type Tenancy = {
  id: string;
  inquilino: string;
  rentaCentavos: number | null;
  inicio: string | null;
  fin: string | null;
  depositoCentavos: number | null;
  depositoFecha: string | null;
  depositoEstado: DepositoEstado | null;
  depositoNota: string;
};

export type BlacklistEntry = {
  id: string;
  nombre: string;
  telefono: string;
  motivo: string;
};

export type Holiday = { date: string; localName: string };

export type Portfolio = {
  today: string;
  anio: number;
  mes: number;
  apartments: Apartment[];
  recibidoAnio: number;
};

export type ApartmentInput = {
  id?: string;
  nombre: string;
  tipo: PropertyTipo;
  direccion: string;
  foto: string | null;
  medidorLuz: string;
  medidorAgua: string;
  notaServicios: string;
  luzDia: number | null;
  luzCentavos: number | null;
  aguaDia: number | null;
  aguaCentavos: number | null;
  rentaCentavos: number | null;
  inquilino: string;
  telefono: string;
  diaPago: number | null;
  contratoInicio: string | null;
  contratoFin: string | null;
  ingreso: string | null;
  ocupado: boolean;
  notas: string;
  forzar: boolean;
  depositoCentavos: number | null;
  depositoFecha: string | null;
  depositoEstado: DepositoEstado | null;
  depositoNota: string;
};

export type Alert = {
  key: string;
  kind: "renta" | "contrato" | "mora" | "incremento";
  apartmentId: string;
  title: string;
  detail: string;
};

export type DepositoEstado = "en_poder" | "devuelto" | "retenido";

export const DEPOSITO_LABEL: Record<DepositoEstado, string> = {
  en_poder: "En tu poder",
  devuelto: "Devuelto",
  retenido: "Retenido",
};

export type Receipt = {
  apartmentId: string;
  anio: number;
  mes: number;
  centavos: number;
  recibidoEl: string;
};

export type MonthRow = {
  apartmentId: string;
  nombre: string;
  inquilino: string;
  rentaCentavos: number;
  recibido: boolean;
  diasMora: number | null;
};

export type MonthStay = {
  id: string;
  nombre: string;
  ocupado: boolean;
  inquilino: string;
  rentaCentavos: number | null;
  ingreso: string | null;
  contratoInicio: string | null;
  diaPago: number | null;
};

export type RentAdjustment = {
  id: string;
  anteriorCentavos: number;
  nuevoCentavos: number;
  vigenteDesde: string;
};

export const INCREASE_BEFORE = 30;
export const INCREASE_AFTER = 14;

export type MonthTenancy = {
  apartmentId: string;
  inquilino: string;
  rentaCentavos: number | null;
  inicio: string | null;
  fin: string | null;
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const FOTO = /^data:image\/jpeg;base64,[a-z0-9+/=\s]+$/i;

export function mexicoToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function monthTitle(anio: number, mes: number): string {
  return `${MESES[mes - 1] ?? ""} ${anio}`;
}

export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} de ${MESES[m - 1] ?? ""} de ${y}`;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const a = Date.UTC(fy, (fm ?? 1) - 1, fd ?? 1);
  const b = Date.UTC(ty, (tm ?? 1) - 1, td ?? 1);
  return Math.round((b - a) / 86_400_000);
}

/** Formatea centavos como pesos mexicanos (MXN) — única moneda de cobro.
 *  El símbolo $ se desambigua con “MXN” para que nunca se confunda con USD. */
export function formatMoney(centavos: number | null | undefined): string {
  if (centavos == null) return "—";
  const pesos = centavos / 100;
  const base = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: centavos % 100 === 0 ? 0 : 2,
  }).format(pesos);
  // En es-MX el formato es "$12,000" sin sufijo; lo hacemos explícito: "$12,000 MXN"
  return base.includes("MXN") ? base : `${base} MXN`;
}

/** Convierte texto a centavos MXN. Solo acepta pesos mexicanos (MXN), sin USD ni otra moneda. */
export function pesosToCentavos(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(/\$/g, "").replace(/,/g, "");
  if (!t) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [whole, frac = ""] = t.split(".");
  const cent = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(cent) || cent > 50_000_000) return null;
  return cent;
}

export function centavosToInput(centavos: number | null): string {
  if (centavos == null) return "";
  const pesos = centavos / 100;
  return Number.isInteger(pesos) ? String(pesos) : pesos.toFixed(2);
}

export function normName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function blacklistHit<T extends { nombre: string }>(
  nombre: string,
  entries: T[],
): T | null {
  const n = normName(nombre);
  if (n.length < 3) return null;
  return (
    entries.find((entry) => {
      const m = normName(entry.nombre);
      return m.length >= 3 && (m === n || m.includes(n) || n.includes(m));
    }) ?? null
  );
}

export function tenureLabel(fromIso: string | null, todayIso: string): string {
  if (!fromIso) return "Sin fecha de ingreso";
  if (todayIso < fromIso) return "El ingreso todavía no llega";
  let years = Number(todayIso.slice(0, 4)) - Number(fromIso.slice(0, 4));
  let months = Number(todayIso.slice(5, 7)) - Number(fromIso.slice(5, 7));
  let days = Number(todayIso.slice(8, 10)) - Number(fromIso.slice(8, 10));
  if (days < 0) {
    months -= 1;
    const y = Number(todayIso.slice(0, 4));
    const m = Number(todayIso.slice(5, 7));
    days += new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "año" : "años"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "mes" : "meses"}`);
  if (parts.length === 0) parts.push(`${days} ${days === 1 ? "día" : "días"}`);
  return parts.join(" y ");
}

export function diasTexto(days: number): string {
  return `${days} ${days === 1 ? "día" : "días"}`;
}

export function shiftMonth(anio: number, mes: number, delta: number): { anio: number; mes: number } {
  const date = new Date(Date.UTC(anio, mes - 1 + delta, 1));
  return { anio: date.getUTCFullYear(), mes: date.getUTCMonth() + 1 };
}

export function periodInRange(anio: number, mes: number, today: string): boolean {
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) return false;
  const current = { anio: Number(today.slice(0, 4)), mes: Number(today.slice(5, 7)) };
  if (anio > current.anio || (anio === current.anio && mes > current.mes)) return false;
  const oldest = shiftMonth(current.anio, current.mes, -35);
  if (anio < oldest.anio || (anio === oldest.anio && mes < oldest.mes)) return false;
  return true;
}

export function depositoEstadoOf(value: unknown): DepositoEstado | null {
  if (value === "en_poder" || value === "devuelto" || value === "retenido") return value;
  return null;
}

export function monthStart(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}-01`;
}

export function monthEnd(anio: number, mes: number): string {
  const last = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return `${anio}-${String(mes).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

export function monthsFrom(
  from: { anio: number; mes: number },
  to: { anio: number; mes: number },
): { anio: number; mes: number }[] {
  const out: { anio: number; mes: number }[] = [];
  let cursor = from;
  while (cursor.anio < to.anio || (cursor.anio === to.anio && cursor.mes <= to.mes)) {
    out.push(cursor);
    if (out.length > 48) break;
    cursor = shiftMonth(cursor.anio, cursor.mes, 1);
  }
  return out;
}

/** A stay covers a month. An open stay with no start date covers every month (para anotar atrasos). */
export function stayOverlapsMonth(
  inicio: string | null,
  fin: string | null,
  anio: number,
  mes: number,
  open: boolean,
): boolean {
  const start = monthStart(anio, mes);
  const end = monthEnd(anio, mes);
  if (inicio && inicio > end) return false;
  if (fin && fin < start) return false;
  if (!inicio && !open) {
    if (!fin) return false;
    return fin >= start && fin <= end;
  }
  return true;
}

export function rentMora(
  apt: Pick<Apartment, "ocupado" | "diaPago" | "recibido" | "ingreso" | "contratoInicio">,
  todayIso: string,
): { days: number; due: string } | null {
  if (!apt.ocupado || !apt.diaPago || apt.recibido) return null;
  const year = Number(todayIso.slice(0, 4));
  const monthIndex = Number(todayIso.slice(5, 7)) - 1;
  const due = clampDue(year, monthIndex, apt.diaPago);
  if (todayIso <= due) return null;
  const start = apt.ingreso ?? apt.contratoInicio;
  if (start && start > due) return null;
  const days = daysBetween(due, todayIso);
  if (days < 1) return null;
  return { days, due };
}

export function rowsForMonth(input: {
  anio: number;
  mes: number;
  today: string;
  apartments: MonthStay[];
  tenancies: MonthTenancy[];
  receipts: { apartmentId: string; centavos: number }[];
}): MonthRow[] {
  const todayYear = Number(input.today.slice(0, 4));
  const todayMonth = Number(input.today.slice(5, 7));
  const current = input.anio === todayYear && input.mes === todayMonth;
  const rows: MonthRow[] = [];
  for (const apt of input.apartments) {
    type Span = { open: boolean; inquilino: string; renta: number | null; inicio: string | null };
    const spans: Span[] = [];
    if (apt.ocupado) {
      const inicio = apt.ingreso ?? apt.contratoInicio;
      if (stayOverlapsMonth(inicio, null, input.anio, input.mes, true)) {
        spans.push({ open: true, inquilino: apt.inquilino, renta: apt.rentaCentavos, inicio });
      }
    }
    for (const stay of input.tenancies) {
      if (stay.apartmentId !== apt.id) continue;
      if (!stayOverlapsMonth(stay.inicio, stay.fin, input.anio, input.mes, false)) continue;
      spans.push({
        open: false,
        inquilino: stay.inquilino,
        renta: stay.rentaCentavos,
        inicio: stay.inicio,
      });
    }
    const chosen = spans.find((span) => span.open) ?? spans.sort((a, b) => (b.inicio ?? "").localeCompare(a.inicio ?? ""))[0];
    if (!chosen || chosen.renta == null) continue;
    const paid = input.receipts.some((receipt) => receipt.apartmentId === apt.id);
    let diasMora: number | null = null;
    if (current && chosen.open && !paid) {
      diasMora =
        rentMora(
          {
            ocupado: true,
            diaPago: apt.diaPago,
            recibido: false,
            ingreso: apt.ingreso,
            contratoInicio: apt.contratoInicio,
          },
          input.today,
        )?.days ?? null;
    }
    rows.push({
      apartmentId: apt.id,
      nombre: apt.nombre,
      inquilino: chosen.inquilino,
      rentaCentavos: chosen.renta,
      recibido: paid,
      diasMora,
    });
  }
  rows.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return rows;
}

function clampDue(year: number, monthIndex: number, day: number): string {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const d = Math.min(Math.max(day, 1), last);
  const m = String(monthIndex + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${year}-${m}-${dd}`;
}

export function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type ContractYear = { date: string; daysUntil: number; years: number };

/** Next contract anniversary, including one that happened in the last 14 days. */
export function nextContractYear(
  apt: Pick<Apartment, "ocupado" | "contratoInicio" | "ingreso">,
  todayIso: string,
): ContractYear | null {
  if (!apt.ocupado) return null;
  const start = apt.contratoInicio ?? apt.ingreso;
  if (!start || !ISO.test(start) || start > todayIso) return null;
  const startYear = Number(start.slice(0, 4));
  const todayYear = Number(todayIso.slice(0, 4));
  const monthIndex = Number(start.slice(5, 7)) - 1;
  const day = Number(start.slice(8, 10));
  const options: ContractYear[] = [];
  for (let year = startYear + 1; year <= todayYear + 1; year += 1) {
    const date = clampDue(year, monthIndex, day);
    if (date <= start) continue;
    options.push({
      date,
      daysUntil: daysBetween(todayIso, date),
      years: year - startYear,
    });
  }
  return options.find((item) => item.daysUntil >= -INCREASE_AFTER) ?? null;
}

export function increaseDue(
  apt: Pick<
    Apartment,
    "ocupado" | "contratoInicio" | "ingreso" | "contratoFin" | "rentaCentavos" | "ultimoIncremento"
  >,
  todayIso: string,
): ContractYear | null {
  if (apt.rentaCentavos == null) return null;
  const next = nextContractYear(apt, todayIso);
  if (!next) return null;
  if (next.daysUntil > INCREASE_BEFORE || next.daysUntil < -INCREASE_AFTER) return null;
  if (apt.contratoFin && apt.contratoFin < next.date) return null;
  if (apt.ultimoIncremento) {
    const from = addDays(next.date, -INCREASE_BEFORE);
    const until = addDays(next.date, INCREASE_AFTER);
    if (apt.ultimoIncremento >= from && apt.ultimoIncremento <= until) return null;
  }
  return next;
}

export function isContractAnniversary(startIso: string | null, iso: string): boolean {
  if (!startIso || !ISO.test(startIso) || iso <= startIso) return false;
  const year = Number(iso.slice(0, 4));
  const monthIndex = Number(startIso.slice(5, 7)) - 1;
  const day = Number(startIso.slice(8, 10));
  return clampDue(year, monthIndex, day) === iso && year > Number(startIso.slice(0, 4));
}

export function upcomingDue(
  day: number,
  todayIso: string,
): { due: string; daysUntil: number } {
  const year = Number(todayIso.slice(0, 4));
  const monthIndex = Number(todayIso.slice(5, 7)) - 1;
  let due = clampDue(year, monthIndex, day);
  if (due < todayIso) {
    const next = new Date(Date.UTC(year, monthIndex + 1, 1));
    due = clampDue(next.getUTCFullYear(), next.getUTCMonth(), day);
  }
  return { due, daysUntil: daysBetween(todayIso, due) };
}

export function computeAlerts(
  apartments: Apartment[],
  todayIso: string,
  holidays: Holiday[] = [],
): Alert[] {
  const holidayOn = new Map(holidays.map((holiday) => [holiday.date, holiday.localName]));
  const alerts: Alert[] = [];
  for (const apt of apartments) {
    if (!apt.ocupado) continue;
    const late = rentMora(apt, todayIso);
    if (late) {
      const who = apt.inquilino || "El inquilino";
      alerts.push({
        key: `mora:${apt.id}:${todayIso.slice(0, 7)}`,
        kind: "mora",
        apartmentId: apt.id,
        title: `Lleva ${diasTexto(late.days)} sin pagar la renta de ${apt.nombre}`,
        detail: `${who} · ${formatMoney(apt.rentaCentavos)} · venció el ${longDate(late.due)}`,
      });
    } else if (apt.diaPago) {
      const { due, daysUntil } = upcomingDue(apt.diaPago, todayIso);
      if (daysUntil === 0 || daysUntil === 1) {
        const holiday = holidayOn.get(due);
        const who = apt.inquilino || "El inquilino";
        alerts.push({
          key: `renta:${apt.id}:${due.slice(0, 7)}`,
          kind: "renta",
          apartmentId: apt.id,
          title:
            daysUntil === 1
              ? `Mañana toca la renta de ${apt.nombre}`
              : `Hoy toca la renta de ${apt.nombre}`,
          detail: `${who} · ${formatMoney(apt.rentaCentavos)}${
            holiday ? ` · cae en ${holiday}` : ""
          }`,
        });
      }
    }
    if (apt.contratoFin) {
      const left = daysBetween(todayIso, apt.contratoFin);
      if (left >= 0 && left <= 35) {
        alerts.push({
          key: `contrato:${apt.id}:${apt.contratoFin}`,
          kind: "contrato",
          apartmentId: apt.id,
          title:
            left === 0
              ? `Hoy vence el contrato de ${apt.nombre}`
              : `El contrato de ${apt.nombre} está por vencer`,
          detail:
            left === 0
              ? `${apt.inquilino || "Inquilino"} · vence hoy`
              : `Faltan ${left} ${left === 1 ? "día" : "días"} · vence el ${longDate(apt.contratoFin)}`,
        });
      }
    }
    const yearDue = increaseDue(apt, todayIso);
    if (yearDue) {
      const when =
        yearDue.daysUntil > 1
          ? `En ${diasTexto(yearDue.daysUntil)} se cumple el año de ${apt.nombre}`
          : yearDue.daysUntil === 1
            ? `Mañana se cumple el año de ${apt.nombre}`
            : yearDue.daysUntil === 0
              ? `Hoy se cumple el año de ${apt.nombre}`
              : `Hace ${diasTexto(-yearDue.daysUntil)} se cumplió el año de ${apt.nombre}`;
      alerts.push({
        key: `incremento:${apt.id}:${yearDue.date}`,
        kind: "incremento",
        apartmentId: apt.id,
        title: when,
        detail: `Renta actual ${formatMoney(apt.rentaCentavos)} · anota la nueva en la ficha`,
      });
    }
  }
  return alerts;
}

export type AgendaItem = {
  id: string;
  apartmentId?: string;
  title: string;
  detail: string;
};

export function agendaOn(
  iso: string,
  apartments: Apartment[],
  holidays: Holiday[],
): AgendaItem[] {
  const items: AgendaItem[] = [];
  const day = Number(iso.slice(8, 10));
  for (const holiday of holidays) {
    if (holiday.date === iso) {
      items.push({ id: `h-${holiday.date}`, title: holiday.localName, detail: "Día feriado en México" });
    }
  }
  for (const apt of apartments) {
    if (apt.ocupado && apt.diaPago === day) {
      items.push({
        id: `r-${apt.id}`,
        apartmentId: apt.id,
        title: `Renta · ${apt.nombre}`,
        detail: `${apt.inquilino || "Sin nombre"} · ${formatMoney(apt.rentaCentavos)}`,
      });
    }
    if (apt.luzDia === day && apt.luzCentavos != null) {
      items.push({
        id: `l-${apt.id}`,
        apartmentId: apt.id,
        title: `Luz · ${apt.nombre}`,
        detail: formatMoney(apt.luzCentavos),
      });
    }
    if (apt.aguaDia === day && apt.aguaCentavos != null) {
      items.push({
        id: `a-${apt.id}`,
        apartmentId: apt.id,
        title: `Agua · ${apt.nombre}`,
        detail: formatMoney(apt.aguaCentavos),
      });
    }
    if (apt.ingreso === iso) {
      items.push({
        id: `i-${apt.id}`,
        apartmentId: apt.id,
        title: `Ingreso · ${apt.nombre}`,
        detail: apt.inquilino || "Inquilino",
      });
    }
    if (apt.contratoInicio === iso) {
      items.push({
        id: `ci-${apt.id}`,
        apartmentId: apt.id,
        title: `Inicia contrato · ${apt.nombre}`,
        detail: apt.inquilino || "Inquilino",
      });
    }
    if (apt.contratoFin === iso) {
      items.push({
        id: `cf-${apt.id}`,
        apartmentId: apt.id,
        title: `Vence contrato · ${apt.nombre}`,
        detail: apt.inquilino || "Inquilino",
      });
    }
    const start = apt.contratoInicio ?? apt.ingreso;
    if (apt.ocupado && isContractAnniversary(start, iso)) {
      const years = Number(iso.slice(0, 4)) - Number((start ?? iso).slice(0, 4));
      items.push({
        id: `an-${apt.id}`,
        apartmentId: apt.id,
        title: `Año de contrato · ${apt.nombre}`,
        detail: `${years} ${years === 1 ? "año" : "años"} · renta ${formatMoney(apt.rentaCentavos)}`,
      });
    }
  }
  return items;
}

/**
 * Quita caracteres de control (C0 + DEL + C1). Se usa para sanear todo texto
 * que entra por los formularios antes de guardarlo. `\p{Cc}` cubre
 * U+0000–U+001F, U+007F–U+009F sin literales de control en el patrón (regla
 * `no-control-regex` de ESLint).
 */
const CONTROL_CHARS = /[\p{Cc}]/gu;

export function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, "");
}

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return stripControlChars(value).trim().slice(0, max);
}

function day(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 31) return Number.NaN;
  return n;
}

function money(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 50_000_000) return Number.NaN;
  return n;
}

function dateOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !ISO.test(value)) return "invalid";
  return value;
}

export function parseApartmentInput(
  raw: unknown,
): { ok: true; value: ApartmentInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Datos inválidos." };
  const o = raw as Record<string, unknown>;
  const nombre = text(o.nombre, 80);
  if (nombre.length < 2) return { ok: false, error: "Ponle un nombre al departamento." };
  const tipoRaw = text(o.tipo, 20).toLowerCase();
  const tipo: PropertyTipo = tipoOf(tipoRaw) ?? "departamento";
  if (tipoRaw && !tipoOf(tipoRaw)) {
    return { ok: false, error: "El tipo debe ser Departamento o Accesoria." };
  }
  const id = o.id == null || o.id === "" ? undefined : text(o.id, 40);
  if (id && !UUID.test(id)) return { ok: false, error: "Departamento inválido." };
  const foto = o.foto == null || o.foto === "" ? null : String(o.foto);
  if (foto && (!FOTO.test(foto) || foto.length > 500_000)) {
    return { ok: false, error: "La foto debe ser una imagen pequeña." };
  }
  const luzDia = day(o.luzDia);
  const aguaDia = day(o.aguaDia);
  const diaPago = day(o.diaPago);
  const luzCentavos = money(o.luzCentavos);
  const aguaCentavos = money(o.aguaCentavos);
  const rentaCentavos = money(o.rentaCentavos);
  if ([luzDia, aguaDia, diaPago, luzCentavos, aguaCentavos, rentaCentavos].some(Number.isNaN)) {
    return { ok: false, error: "Revisa los días y los montos." };
  }
  const contratoInicio = dateOrNull(o.contratoInicio);
  const contratoFin = dateOrNull(o.contratoFin);
  const ingreso = dateOrNull(o.ingreso);
  if ([contratoInicio, contratoFin, ingreso].includes("invalid")) {
    return { ok: false, error: "Revisa las fechas." };
  }
  const ocupado = o.ocupado === true;
  const inquilino = text(o.inquilino, 80);
  if (ocupado && inquilino.length < 2) {
    return { ok: false, error: "Escribe el nombre del inquilino." };
  }
  if (ocupado && rentaCentavos == null) {
    return { ok: false, error: "Indica cuánto cobras de renta." };
  }
  if (ocupado && diaPago == null) {
    return { ok: false, error: "Indica qué día del mes paga la renta." };
  }
  if (
    ocupado &&
    contratoInicio &&
    contratoFin &&
    contratoInicio !== "invalid" &&
    contratoFin !== "invalid" &&
    contratoFin < contratoInicio
  ) {
    return { ok: false, error: "El contrato no puede vencer antes de iniciar." };
  }
  const depositoCentavos = money(o.depositoCentavos);
  if (depositoCentavos !== null && Number.isNaN(depositoCentavos)) {
    return { ok: false, error: "Revisa el monto del depósito." };
  }
  const depositoFecha = dateOrNull(o.depositoFecha);
  if (depositoFecha === "invalid") return { ok: false, error: "Revisa la fecha del depósito." };
  const estadoRaw = o.depositoEstado == null || o.depositoEstado === "" ? null : text(o.depositoEstado, 20);
  if (estadoRaw && estadoRaw !== "en_poder" && estadoRaw !== "devuelto" && estadoRaw !== "retenido") {
    return { ok: false, error: "El estado del depósito no es válido." };
  }
  const depositoNota = text(o.depositoNota, 240);
  const conDeposito = ocupado && depositoCentavos != null;
  const depositoEstado: DepositoEstado | null = conDeposito
    ? ((estadoRaw as DepositoEstado | null) ?? "en_poder")
    : null;
  return {
    ok: true,
    value: {
      id,
      nombre,
      tipo,
      direccion: text(o.direccion, 160),
      foto,
      medidorLuz: text(o.medidorLuz, 40),
      medidorAgua: text(o.medidorAgua, 40),
      notaServicios: text(o.notaServicios, 240),
      luzDia: luzDia ?? null,
      luzCentavos: luzCentavos ?? null,
      aguaDia: aguaDia ?? null,
      aguaCentavos: aguaCentavos ?? null,
      rentaCentavos: ocupado ? (rentaCentavos ?? null) : null,
      inquilino: ocupado ? inquilino : "",
      telefono: ocupado ? text(o.telefono, 24) : "",
      diaPago: ocupado ? (diaPago ?? null) : null,
      contratoInicio: ocupado && contratoInicio !== "invalid" ? contratoInicio : null,
      contratoFin: ocupado && contratoFin !== "invalid" ? contratoFin : null,
      ingreso: ocupado && ingreso !== "invalid" ? ingreso : null,
      ocupado,
      notas: ocupado ? text(o.notas, 500) : "",
      forzar: o.forzar === true,
      depositoCentavos: conDeposito ? depositoCentavos : null,
      depositoFecha: conDeposito && depositoFecha !== "invalid" ? depositoFecha : null,
      depositoEstado,
      depositoNota: conDeposito ? depositoNota : "",
    },
  };
}

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/**
 * Feriados oficiales de México según el art. 74 de la Ley Federal del Trabajo:
 * los de fecha fija más los tres que se observan el lunes correspondiente desde
 * 2006 (Constitución, Juárez, Revolución) y el 1 de diciembre cada seis años
 * (transmisión del Poder Ejecutivo). Es el respaldo local cuando la API pública
 * de Nager.Date no responde; las reglas son las mismas que publican los
 * repositorios abiertos `commenthol/date-holidays` (data/countries/MX.yaml) y
 * `GerardoLucero/mx-feriados`.
 */
export function mexicoOfficialHolidays(year: number): Holiday[] {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return [];
  const iso = (mes: number, dia: number) =>
    `${year}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  // weekday: 1 = lunes … 7 = domingo (ISO). Devuelve el día del mes del n-ésimo
  // día de la semana indicado.
  const nthWeekday = (mes: number, weekday: number, n: number): number => {
    const first = new Date(Date.UTC(year, mes - 1, 1)).getUTCDay();
    const offset = (weekday - first + 7) % 7;
    return 1 + offset + (n - 1) * 7;
  };
  const list: Holiday[] = [
    { date: iso(1, 1), localName: "Año Nuevo" },
    { date: iso(2, nthWeekday(2, 1, 1)), localName: "Día de la Constitución" },
    { date: iso(3, nthWeekday(3, 1, 3)), localName: "Natalicio de Benito Juárez" },
    { date: iso(5, 1), localName: "Día del Trabajo" },
    { date: iso(9, 16), localName: "Día de la Independencia" },
    { date: iso(11, nthWeekday(11, 1, 3)), localName: "Día de la Revolución" },
  ];
  if (year >= 2018 && (year - 2018) % 6 === 0) {
    list.push({ date: iso(12, 1), localName: "Transmisión del Poder Ejecutivo Federal" });
  }
  list.push({ date: iso(12, 25), localName: "Navidad" });
  return list.sort((a, b) => a.date.localeCompare(b.date));
}
