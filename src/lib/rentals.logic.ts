export type Apartment = {
  id: string;
  nombre: string;
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
};

export type Tenancy = {
  id: string;
  inquilino: string;
  rentaCentavos: number | null;
  inicio: string | null;
  fin: string | null;
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
};

export type Alert = {
  key: string;
  kind: "renta" | "contrato";
  apartmentId: string;
  title: string;
  detail: string;
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

export function formatMoney(centavos: number | null | undefined): string {
  if (centavos == null) return "—";
  const pesos = centavos / 100;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: centavos % 100 === 0 ? 0 : 2,
  }).format(pesos);
}

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

function clampDue(year: number, monthIndex: number, day: number): string {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const d = Math.min(Math.max(day, 1), last);
  const m = String(monthIndex + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${year}-${m}-${dd}`;
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
    if (apt.diaPago) {
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
  }
  return items;
}

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
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
  return {
    ok: true,
    value: {
      id,
      nombre,
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
    },
  };
}

export function isUuid(value: string): boolean {
  return UUID.test(value);
}
