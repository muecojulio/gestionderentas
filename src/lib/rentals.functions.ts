import { createServerFn } from "@tanstack/react-start";
import { checkDatabase, getSql, type DbStatus, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  blacklistHit,
  depositoEstadoOf,
  addDays,
  isUuid,
  mexicoOfficialHolidays,
  mexicoToday,
  monthsFrom,
  parseApartmentInput,
  periodInRange,
  rowsForMonth,
  shiftMonth,
  stripControlChars,
  tipoOf,
  type Apartment,
  type ApartmentInput,
  type BlacklistEntry,
  type DepositoEstado,
  type Holiday,
  type MonthStay,
  type MonthTenancy,
  type Portfolio,
  type PropertyTipo,
  type Receipt,
  type RentAdjustment,
  type Tenancy,
} from "@/lib/rentals.logic";

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function flag(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

function str(value: unknown): string {
  return value == null ? "" : String(value);
}

type ApartmentRow = {
  id: string;
  nombre: string;
  tipo?: string | null;
  direccion: string;
  foto: string | null;
  medidor_luz: string;
  medidor_agua: string;
  nota_servicios: string;
  luz_dia: unknown;
  luz_centavos: unknown;
  agua_dia: unknown;
  agua_centavos: unknown;
  renta_centavos: unknown;
  inquilino: string;
  telefono: string;
  dia_pago: unknown;
  contrato_inicio: string | null;
  contrato_fin: string | null;
  ingreso: string | null;
  ocupado: unknown;
  notas: string;
  recibido: unknown;
  deposito_centavos: unknown;
  deposito_fecha: string | null;
  deposito_estado: string | null;
  deposito_nota: string;
  ultimo_incremento?: string | null;
};

function mapApartment(row: ApartmentRow): Apartment {
  return {
    id: row.id,
    nombre: row.nombre,
    tipo: (tipoOf(row.tipo) ?? "departamento") as PropertyTipo,
    direccion: row.direccion ?? "",
    foto: row.foto || null,
    medidorLuz: row.medidor_luz ?? "",
    medidorAgua: row.medidor_agua ?? "",
    notaServicios: row.nota_servicios ?? "",
    luzDia: num(row.luz_dia),
    luzCentavos: num(row.luz_centavos),
    aguaDia: num(row.agua_dia),
    aguaCentavos: num(row.agua_centavos),
    rentaCentavos: num(row.renta_centavos),
    inquilino: row.inquilino ?? "",
    telefono: row.telefono ?? "",
    diaPago: num(row.dia_pago),
    contratoInicio: row.contrato_inicio || null,
    contratoFin: row.contrato_fin || null,
    ingreso: row.ingreso || null,
    ocupado: flag(row.ocupado),
    notas: row.notas ?? "",
    recibido: flag(row.recibido),
    depositoCentavos: num(row.deposito_centavos),
    depositoFecha: row.deposito_fecha || null,
    depositoEstado: depositoEstadoOf(row.deposito_estado),
    depositoNota: row.deposito_nota ?? "",
    ultimoIncremento: row.ultimo_incremento || null,
  };
}

/**
 * ¿Puede el servidor servir los datos? El navegador lo pregunta antes de cada
 * tanda de consultas: si la base no está (por ejemplo un despliegue en Vercel
 * sin `DATABASE_URL`), la app sigue funcionando con el respaldo local del
 * dispositivo en vez de quedarse en "no se pudieron cargar".
 *
 * Nunca falla por sí misma: devuelve el motivo.
 */
export const getDataHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<DbStatus> => checkDatabase(),
);

async function namesBlocked(sql: Sql, userId: string, nombre: string) {
  const rows = await sql<{ nombre: string }>`
    select nombre from blacklist where user_id = ${userId}
  `;
  return blacklistHit(nombre, rows);
}

export const listPortfolio = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Portfolio> => {
    const sql = await getSql();
    const today = mexicoToday();
    const anio = Number(today.slice(0, 4));
    const mes = Number(today.slice(5, 7));
    const rows = await sql<ApartmentRow>`
      select a.id, a.nombre, a.tipo, a.direccion, a.foto, a.medidor_luz, a.medidor_agua,
             a.nota_servicios, a.luz_dia, a.luz_centavos, a.agua_dia, a.agua_centavos,
             a.renta_centavos, a.inquilino, a.telefono, a.dia_pago, a.contrato_inicio,
             a.contrato_fin, a.ingreso, a.ocupado, a.notas,
             a.deposito_centavos, a.deposito_fecha, a.deposito_estado, a.deposito_nota,
             (select max(vigente_desde) from rent_adjustments ra
               where ra.apartment_id = a.id and ra.user_id = a.user_id) as ultimo_incremento,
             (r.id is not null) as recibido
      from apartments a
      left join receipts r
        on r.apartment_id = a.id
       and r.user_id = a.user_id
       and r.anio = ${anio}
       and r.mes = ${mes}
      where a.user_id = ${context.userId}
      order by lower(a.nombre)
    `;
    const sums = await sql<{ total: unknown }>`
      select coalesce(sum(centavos), 0) as total
      from receipts
      where user_id = ${context.userId} and anio = ${anio}
    `;
    return {
      today,
      anio,
      mes,
      apartments: rows.map(mapApartment),
      recibidoAnio: num(sums[0]?.total) ?? 0,
    };
  });

export const listHistory = createServerFn({ method: "GET" })
  .validator((id: unknown) => {
    if (typeof id !== "string" || !isUuid(id)) throw new Error("Departamento inválido.");
    return id;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }): Promise<Tenancy[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      inquilino: string;
      renta_centavos: unknown;
      inicio: string | null;
      fin: string | null;
      deposito_centavos: unknown;
      deposito_fecha: string | null;
      deposito_estado: string | null;
      deposito_nota: string;
    }>`
      select id, inquilino, renta_centavos, inicio, fin,
             deposito_centavos, deposito_fecha, deposito_estado, deposito_nota
      from tenancies
      where user_id = ${context.userId} and apartment_id = ${id}
      order by fin desc, created_at desc
    `;
    return rows.map((row) => ({
      id: row.id,
      inquilino: row.inquilino ?? "",
      rentaCentavos: num(row.renta_centavos),
      inicio: row.inicio || null,
      fin: row.fin || null,
      depositoCentavos: num(row.deposito_centavos),
      depositoFecha: row.deposito_fecha || null,
      depositoEstado: depositoEstadoOf(row.deposito_estado),
      depositoNota: row.deposito_nota ?? "",
    }));
  });

export const listBlacklist = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BlacklistEntry[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      nombre: string;
      telefono: string;
      motivo: string;
    }>`
      select id, nombre, telefono, motivo
      from blacklist
      where user_id = ${context.userId}
      order by lower(nombre)
    `;
    return rows.map((row) => ({
      id: row.id,
      nombre: str(row.nombre),
      telefono: str(row.telefono),
      motivo: str(row.motivo),
    }));
  });

export const listHolidays = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<Holiday[]> => {
    const sql = await getSql();
    const year = Number(mexicoToday().slice(0, 4));
    const cached = await sql<{ payload: string; fetched_at: string | Date }>`
      select payload, fetched_at from holiday_cache where anio = ${year}
    `;
    const fresh = cached[0]
      ? Date.now() - new Date(cached[0].fetched_at).getTime() < 86_400_000
      : false;
    if (cached[0] && fresh) return JSON.parse(cached[0].payload) as Holiday[];
    // Fuente pública sin llave ni registro: Nager.Date (feriados oficiales MX).
    try {
      const response = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/MX`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { date?: string; localName?: string }[];
      const slim: Holiday[] = data
        .filter((item) => typeof item.date === "string" && typeof item.localName === "string")
        .map((item) => ({ date: item.date as string, localName: item.localName as string }));
      const payload = JSON.stringify(slim);
      await sql`
        insert into holiday_cache (anio, payload, fetched_at)
        values (${year}, ${payload}, now())
        on conflict (anio) do update set payload = ${payload}, fetched_at = now()
      `;
      return slim;
    } catch {
      // Respaldo local: reglas oficiales del art. 74 LFT (ver
      // mexicoOfficialHolidays). La agenda sigue funcionando sin conexión.
      const fallback = mexicoOfficialHolidays(year);
      if (fallback.length > 0) {
        const payload = JSON.stringify(fallback);
        await sql`
          insert into holiday_cache (anio, payload, fetched_at)
          values (${year}, ${payload}, now())
          on conflict (anio) do update set payload = ${payload}, fetched_at = now()
        `;
        return fallback;
      }
      if (cached[0]) return JSON.parse(cached[0].payload) as Holiday[];
      return [];
    }
  });

export type IncomePoint = { anio: number; mes: number; centavos: number };

/**
 * Lo cobrado por mes en los últimos 12 meses (para la gráfica de Ingresos).
 * Se apoya en el índice receipts_user_anio_idx (migración 0005).
 */
export const listIncomeTimeline = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<IncomePoint[]> => {
    const sql = await getSql();
    const today = mexicoToday();
    const end = { anio: Number(today.slice(0, 4)), mes: Number(today.slice(5, 7)) };
    const start = shiftMonth(end.anio, end.mes, -11);
    const rows = await sql<{ anio: unknown; mes: unknown; total: unknown }>`
      select anio, mes, coalesce(sum(centavos), 0) as total
      from receipts
      where user_id = ${context.userId}
        and (anio > ${start.anio} or (anio = ${start.anio} and mes >= ${start.mes}))
      group by anio, mes
      order by anio, mes
    `;
    const byKey = new Map(rows.map((row) => [`${row.anio}-${row.mes}`, num(row.total) ?? 0]));
    return monthsFrom(start, end).map(({ anio, mes }) => ({
      anio,
      mes,
      centavos: byKey.get(`${anio}-${mes}`) ?? 0,
    }));
  });

async function archiveStay(
  sql: Sql,
  userId: string,
  apartmentId: string,
  stay: {
    inquilino: string;
    rentaCentavos: number | null;
    inicio: string | null;
    depositoCentavos: number | null;
    depositoFecha: string | null;
    depositoEstado: DepositoEstado | null;
    depositoNota: string;
  },
) {
  await sql`
    insert into tenancies (
      id, user_id, apartment_id, inquilino, renta_centavos, inicio, fin,
      deposito_centavos, deposito_fecha, deposito_estado, deposito_nota
    ) values (
      ${crypto.randomUUID()}, ${userId}, ${apartmentId}, ${stay.inquilino},
      ${stay.rentaCentavos}, ${stay.inicio}, ${mexicoToday()},
      ${stay.depositoCentavos}, ${stay.depositoFecha}, ${stay.depositoEstado}, ${stay.depositoNota}
    )
  `;
}

async function writeApartment(sql: Sql, userId: string, input: ApartmentInput) {
  if (input.id) {
    const rows = await sql<{ id: string }>`
      update apartments set
        nombre = ${input.nombre},
        tipo = ${input.tipo},
        direccion = ${input.direccion},
        foto = ${input.foto},
        medidor_luz = ${input.medidorLuz},
        medidor_agua = ${input.medidorAgua},
        nota_servicios = ${input.notaServicios},
        luz_dia = ${input.luzDia},
        luz_centavos = ${input.luzCentavos},
        agua_dia = ${input.aguaDia},
        agua_centavos = ${input.aguaCentavos},
        renta_centavos = ${input.rentaCentavos},
        inquilino = ${input.inquilino},
        telefono = ${input.telefono},
        dia_pago = ${input.diaPago},
        contrato_inicio = ${input.contratoInicio},
        contrato_fin = ${input.contratoFin},
        ingreso = ${input.ingreso},
        ocupado = ${input.ocupado},
        notas = ${input.notas},
        deposito_centavos = ${input.depositoCentavos},
        deposito_fecha = ${input.depositoFecha},
        deposito_estado = ${input.depositoEstado},
        deposito_nota = ${input.depositoNota}
      where id = ${input.id} and user_id = ${userId}
      returning id
    `;
    return rows[0]?.id ?? null;
  }
  const id = crypto.randomUUID();
  await sql`
    insert into apartments (
      id, user_id, nombre, tipo, direccion, foto, medidor_luz, medidor_agua, nota_servicios,
      luz_dia, luz_centavos, agua_dia, agua_centavos, renta_centavos, inquilino, telefono,
      dia_pago, contrato_inicio, contrato_fin, ingreso, ocupado, notas,
      deposito_centavos, deposito_fecha, deposito_estado, deposito_nota
    ) values (
      ${id}, ${userId}, ${input.nombre}, ${input.tipo}, ${input.direccion}, ${input.foto},
      ${input.medidorLuz}, ${input.medidorAgua}, ${input.notaServicios},
      ${input.luzDia}, ${input.luzCentavos}, ${input.aguaDia}, ${input.aguaCentavos},
      ${input.rentaCentavos}, ${input.inquilino}, ${input.telefono}, ${input.diaPago},
      ${input.contratoInicio}, ${input.contratoFin}, ${input.ingreso}, ${input.ocupado},
      ${input.notas}, ${input.depositoCentavos}, ${input.depositoFecha},
      ${input.depositoEstado}, ${input.depositoNota}
    )
  `;
  return id;
}

export const saveApartment = createServerFn({ method: "POST" })
  .validator((raw: unknown) => raw)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const parsed = parseApartmentInput(data);
    if (!parsed.ok) return parsed;
    const input = parsed.value;
    const sql = await getSql();
    if (input.ocupado && input.inquilino && !input.forzar) {
      const hit = await namesBlocked(sql, context.userId, input.inquilino);
      if (hit) {
        return {
          ok: false as const,
          code: "blacklist" as const,
          error: `${hit.nombre} está en tu lista de personas a las que no volverías a rentar.`,
        };
      }
    }
    if (input.id && !input.ocupado) {
      const prev = await sql<{
        ocupado: unknown;
        inquilino: string;
        renta_centavos: unknown;
        ingreso: string | null;
        contrato_inicio: string | null;
        deposito_centavos: unknown;
        deposito_fecha: string | null;
        deposito_estado: string | null;
        deposito_nota: string;
      }>`
        select ocupado, inquilino, renta_centavos, ingreso, contrato_inicio,
               deposito_centavos, deposito_fecha, deposito_estado, deposito_nota
        from apartments
        where id = ${input.id} and user_id = ${context.userId}
      `;
      const before = prev[0];
      if (before && flag(before.ocupado)) {
        await archiveStay(sql, context.userId, input.id, {
          inquilino: before.inquilino ?? "",
          rentaCentavos: num(before.renta_centavos),
          inicio: before.ingreso ?? before.contrato_inicio,
          depositoCentavos: num(before.deposito_centavos),
          depositoFecha: before.deposito_fecha || null,
          depositoEstado: depositoEstadoOf(before.deposito_estado),
          depositoNota: before.deposito_nota ?? "",
        });
      }
    }
    const id = await writeApartment(sql, context.userId, input);
    if (!id) return { ok: false as const, error: "No encontramos ese departamento." };
    return { ok: true as const, id };
  });

export const vacateApartment = createServerFn({ method: "POST" })
  .validator((id: unknown) => {
    if (typeof id !== "string" || !isUuid(id)) throw new Error("Departamento inválido.");
    return id;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const rows = await sql<ApartmentRow>`
      select id, nombre, tipo, direccion, foto, medidor_luz, medidor_agua, nota_servicios,
             luz_dia, luz_centavos, agua_dia, agua_centavos, renta_centavos, inquilino,
             telefono, dia_pago, contrato_inicio, contrato_fin, ingreso, ocupado, notas,
             deposito_centavos, deposito_fecha, deposito_estado, deposito_nota,
             false as recibido
      from apartments
      where id = ${id} and user_id = ${context.userId}
    `;
    const current = rows[0];
    if (!current) return { ok: false as const, error: "No encontramos ese departamento." };
    const apt = mapApartment(current);
    if (apt.ocupado || apt.inquilino) {
      await archiveStay(sql, context.userId, id, {
        inquilino: apt.inquilino,
        rentaCentavos: apt.rentaCentavos,
        inicio: apt.ingreso ?? apt.contratoInicio,
        depositoCentavos: apt.depositoCentavos,
        depositoFecha: apt.depositoFecha,
        depositoEstado: apt.depositoEstado,
        depositoNota: apt.depositoNota,
      });
    }
    await sql`
      update apartments set
        luz_dia = null,
        luz_centavos = null,
        agua_dia = null,
        agua_centavos = null,
        renta_centavos = null,
        inquilino = '',
        telefono = '',
        dia_pago = null,
        contrato_inicio = null,
        contrato_fin = null,
        ingreso = null,
        ocupado = false,
        notas = '',
        deposito_centavos = null,
        deposito_fecha = null,
        deposito_estado = null,
        deposito_nota = ''
      where id = ${id} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });

export const deleteApartment = createServerFn({ method: "POST" })
  .validator((id: unknown) => {
    if (typeof id !== "string" || !isUuid(id)) throw new Error("Departamento inválido.");
    return id;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from receipts where apartment_id = ${id} and user_id = ${context.userId}`;
    await sql`delete from tenancies where apartment_id = ${id} and user_id = ${context.userId}`;
    await sql`delete from rent_adjustments where apartment_id = ${id} and user_id = ${context.userId}`;
    const rows = await sql<{ id: string }>`
      delete from apartments where id = ${id} and user_id = ${context.userId} returning id
    `;
    if (!rows[0]) return { ok: false as const, error: "No encontramos ese departamento." };
    return { ok: true as const };
  });

async function loadStays(sql: Sql, userId: string): Promise<MonthStay[]> {
  const rows = await sql<{
    id: string;
    nombre: string;
    ocupado: unknown;
    inquilino: string;
    renta_centavos: unknown;
    ingreso: string | null;
    contrato_inicio: string | null;
    dia_pago: unknown;
  }>`
    select id, nombre, ocupado, inquilino, renta_centavos, ingreso, contrato_inicio, dia_pago
    from apartments
    where user_id = ${userId}
  `;
  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    ocupado: flag(row.ocupado),
    inquilino: row.inquilino ?? "",
    rentaCentavos: num(row.renta_centavos),
    ingreso: row.ingreso || null,
    contratoInicio: row.contrato_inicio || null,
    diaPago: num(row.dia_pago),
  }));
}

async function loadTenancies(sql: Sql, userId: string): Promise<MonthTenancy[]> {
  const rows = await sql<{
    apartment_id: string;
    inquilino: string;
    renta_centavos: unknown;
    inicio: string | null;
    fin: string | null;
  }>`
    select apartment_id, inquilino, renta_centavos, inicio, fin
    from tenancies
    where user_id = ${userId}
  `;
  return rows.map((row) => ({
    apartmentId: row.apartment_id,
    inquilino: row.inquilino ?? "",
    rentaCentavos: num(row.renta_centavos),
    inicio: row.inicio || null,
    fin: row.fin || null,
  }));
}

export const listMonth = createServerFn({ method: "POST" })
  .validator((raw: unknown) => {
    if (!raw || typeof raw !== "object") throw new Error("Mes inválido.");
    const o = raw as { anio?: unknown; mes?: unknown };
    const anio = Number(o.anio);
    const mes = Number(o.mes);
    if (!Number.isInteger(anio) || !Number.isInteger(mes)) throw new Error("Mes inválido.");
    return { anio, mes };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const today = mexicoToday();
    if (!periodInRange(data.anio, data.mes, today)) {
      return { ok: false as const, error: "Ese mes está fuera del archivo." };
    }
    const sql = await getSql();
    const [apartments, tenancies, receipts] = await Promise.all([
      loadStays(sql, context.userId),
      loadTenancies(sql, context.userId),
      sql<{ apartment_id: string; centavos: unknown }>`
        select apartment_id, centavos from receipts
        where user_id = ${context.userId} and anio = ${data.anio} and mes = ${data.mes}
      `,
    ]);
    const rows = rowsForMonth({
      anio: data.anio,
      mes: data.mes,
      today,
      apartments,
      tenancies,
      receipts: receipts.map((row) => ({
        apartmentId: row.apartment_id,
        centavos: num(row.centavos) ?? 0,
      })),
    });
    const esperado = rows.reduce((sum, row) => sum + row.rentaCentavos, 0);
    const recibido = rows.filter((row) => row.recibido).reduce((sum, row) => sum + row.rentaCentavos, 0);
    return { ok: true as const, anio: data.anio, mes: data.mes, rows, esperado, recibido, porCobrar: esperado - recibido };
  });

export const exportApartment = createServerFn({ method: "POST" })
  .validator((id: unknown) => {
    if (typeof id !== "string" || !isUuid(id)) throw new Error("Departamento inválido.");
    return id;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const today = mexicoToday();
    const anio = Number(today.slice(0, 4));
    const mes = Number(today.slice(5, 7));
    const rows = await sql<ApartmentRow>`
      select a.id, a.nombre, a.tipo, a.direccion, a.foto, a.medidor_luz, a.medidor_agua,
             a.nota_servicios, a.luz_dia, a.luz_centavos, a.agua_dia, a.agua_centavos,
             a.renta_centavos, a.inquilino, a.telefono, a.dia_pago, a.contrato_inicio,
             a.contrato_fin, a.ingreso, a.ocupado, a.notas,
             a.deposito_centavos, a.deposito_fecha, a.deposito_estado, a.deposito_nota,
             (r.id is not null) as recibido
      from apartments a
      left join receipts r
        on r.apartment_id = a.id and r.user_id = a.user_id and r.anio = ${anio} and r.mes = ${mes}
      where a.id = ${id} and a.user_id = ${context.userId}
    `;
    const current = rows[0];
    if (!current) return { ok: false as const, error: "No encontramos ese departamento." };
    const historyRows = await sql<{
      id: string;
      inquilino: string;
      renta_centavos: unknown;
      inicio: string | null;
      fin: string | null;
      deposito_centavos: unknown;
      deposito_fecha: string | null;
      deposito_estado: string | null;
      deposito_nota: string;
    }>`
      select id, inquilino, renta_centavos, inicio, fin,
             deposito_centavos, deposito_fecha, deposito_estado, deposito_nota
      from tenancies
      where user_id = ${context.userId} and apartment_id = ${id}
      order by fin desc
    `;
    const receiptRows = await sql<{
      anio: unknown;
      mes: unknown;
      centavos: unknown;
      recibido_el: string;
    }>`
      select anio, mes, centavos, recibido_el
      from receipts
      where user_id = ${context.userId} and apartment_id = ${id}
      order by anio, mes
    `;
    const history: Tenancy[] = historyRows.map((row) => ({
      id: row.id,
      inquilino: row.inquilino ?? "",
      rentaCentavos: num(row.renta_centavos),
      inicio: row.inicio || null,
      fin: row.fin || null,
      depositoCentavos: num(row.deposito_centavos),
      depositoFecha: row.deposito_fecha || null,
      depositoEstado: depositoEstadoOf(row.deposito_estado),
      depositoNota: row.deposito_nota ?? "",
    }));
    const receipts: Receipt[] = receiptRows.map((row) => ({
      apartmentId: id,
      anio: num(row.anio) ?? 0,
      mes: num(row.mes) ?? 0,
      centavos: num(row.centavos) ?? 0,
      recibidoEl: row.recibido_el,
    }));
    const adjustmentRows = await sql<{
      id: string;
      anterior_centavos: unknown;
      nuevo_centavos: unknown;
      vigente_desde: string;
    }>`
      select id, anterior_centavos, nuevo_centavos, vigente_desde
      from rent_adjustments
      where user_id = ${context.userId} and apartment_id = ${id}
      order by vigente_desde desc
    `;
    const adjustments: RentAdjustment[] = adjustmentRows.map((row) => ({
      id: row.id,
      anteriorCentavos: num(row.anterior_centavos) ?? 0,
      nuevoCentavos: num(row.nuevo_centavos) ?? 0,
      vigenteDesde: row.vigente_desde,
    }));
    return { ok: true as const, apartment: mapApartment(current), history, receipts, adjustments, today };
  });

export const listAdjustments = createServerFn({ method: "GET" })
  .validator((id: unknown) => {
    if (typeof id !== "string" || !isUuid(id)) throw new Error("Departamento inválido.");
    return id;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }): Promise<RentAdjustment[]> => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      anterior_centavos: unknown;
      nuevo_centavos: unknown;
      vigente_desde: string;
    }>`
      select id, anterior_centavos, nuevo_centavos, vigente_desde
      from rent_adjustments
      where user_id = ${context.userId} and apartment_id = ${id}
      order by vigente_desde desc
    `;
    return rows.map((row) => ({
      id: row.id,
      anteriorCentavos: num(row.anterior_centavos) ?? 0,
      nuevoCentavos: num(row.nuevo_centavos) ?? 0,
      vigenteDesde: row.vigente_desde,
    }));
  });

export const applyIncrease = createServerFn({ method: "POST" })
  .validator((raw: unknown) => raw)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data || typeof data !== "object") return { ok: false as const, error: "Datos inválidos." };
    const o = data as { apartmentId?: unknown; nuevoCentavos?: unknown; vigenteDesde?: unknown };
    if (typeof o.apartmentId !== "string" || !isUuid(o.apartmentId)) {
      return { ok: false as const, error: "Departamento inválido." };
    }
    const nuevo = num(o.nuevoCentavos);
    if (nuevo == null || !Number.isInteger(nuevo) || nuevo < 1 || nuevo > 50_000_000) {
      return { ok: false as const, error: "Revisa el monto de la nueva renta." };
    }
    const today = mexicoToday();
    const vigente =
      o.vigenteDesde == null || o.vigenteDesde === "" ? today : String(o.vigenteDesde);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vigente)) {
      return { ok: false as const, error: "Revisa la fecha de la nueva renta." };
    }
    const sql = await getSql();
    const rows = await sql<{
      renta_centavos: unknown;
      ocupado: unknown;
      ingreso: string | null;
      contrato_inicio: string | null;
    }>`
      select renta_centavos, ocupado, ingreso, contrato_inicio
      from apartments
      where id = ${o.apartmentId} and user_id = ${context.userId}
    `;
    const apt = rows[0];
    if (!apt || !flag(apt.ocupado)) {
      return { ok: false as const, error: "Ese departamento no está rentado." };
    }
    const anterior = num(apt.renta_centavos);
    if (anterior == null) return { ok: false as const, error: "Primero anota la renta actual." };
    if (anterior === nuevo) return { ok: false as const, error: "La nueva renta es igual a la actual." };
    const start = apt.ingreso ?? apt.contrato_inicio;
    if (start && vigente < start) {
      return { ok: false as const, error: "La fecha no puede ser anterior al ingreso." };
    }
    if (vigente > addDays(today, 60)) {
      return { ok: false as const, error: "La fecha no puede pasar de 60 días." };
    }
    await sql`
      update apartments set renta_centavos = ${nuevo}
      where id = ${o.apartmentId} and user_id = ${context.userId}
    `;
    await sql`
      insert into rent_adjustments (
        id, user_id, apartment_id, anterior_centavos, nuevo_centavos, vigente_desde
      ) values (
        ${crypto.randomUUID()}, ${context.userId}, ${o.apartmentId},
        ${anterior}, ${nuevo}, ${vigente}
      )
    `;
    return { ok: true as const };
  });

export const setReceipt = createServerFn({ method: "POST" })
  .validator((raw: unknown) => {
    if (!raw || typeof raw !== "object") throw new Error("Datos inválidos.");
    const o = raw as { apartmentId?: unknown; received?: unknown; anio?: unknown; mes?: unknown };
    if (typeof o.apartmentId !== "string" || !isUuid(o.apartmentId)) {
      throw new Error("Departamento inválido.");
    }
    const anio = o.anio == null ? null : Number(o.anio);
    const mes = o.mes == null ? null : Number(o.mes);
    if (anio != null && (!Number.isInteger(anio) || mes == null || !Number.isInteger(mes))) {
      throw new Error("Mes inválido.");
    }
    return { apartmentId: o.apartmentId, received: o.received === true, anio, mes };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const today = mexicoToday();
    const anio = data.anio ?? Number(today.slice(0, 4));
    const mes = data.mes ?? Number(today.slice(5, 7));
    if (!periodInRange(anio, mes, today)) {
      return { ok: false as const, error: "Ese mes está fuera del archivo." };
    }
    const apartments = await loadStays(sql, context.userId);
    const tenancies = await loadTenancies(sql, context.userId);
    const row = rowsForMonth({
      anio,
      mes,
      today,
      apartments,
      tenancies,
      receipts: [],
    }).find((item) => item.apartmentId === data.apartmentId);
    if (!row) return { ok: false as const, error: "Ese mes no tiene renta en este departamento." };
    if (!data.received) {
      await sql`
        delete from receipts
        where user_id = ${context.userId}
          and apartment_id = ${data.apartmentId}
          and anio = ${anio}
          and mes = ${mes}
      `;
      return { ok: true as const };
    }
    await sql`
      insert into receipts (id, user_id, apartment_id, anio, mes, centavos, recibido_el)
      values (
        ${crypto.randomUUID()}, ${context.userId}, ${data.apartmentId},
        ${anio}, ${mes}, ${row.rentaCentavos}, ${today}
      )
      on conflict (user_id, apartment_id, anio, mes)
      do update set centavos = ${row.rentaCentavos}, recibido_el = ${today}
    `;
    return { ok: true as const };
  });

export const addBlacklist = createServerFn({ method: "POST" })
  .validator((raw: unknown) => raw)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data || typeof data !== "object") return { ok: false as const, error: "Datos inválidos." };
    const o = data as Record<string, unknown>;
    const nombre = typeof o.nombre === "string" ? stripControlChars(o.nombre).trim() : "";
    if (nombre.length < 2 || nombre.length > 80) {
      return { ok: false as const, error: "Escribe el nombre completo." };
    }
    const telefono =
      typeof o.telefono === "string" ? stripControlChars(o.telefono).trim().slice(0, 24) : "";
    const motivo =
      typeof o.motivo === "string" ? stripControlChars(o.motivo).trim().slice(0, 240) : "";
    const sql = await getSql();
    const existing = await namesBlocked(sql, context.userId, nombre);
    if (existing) return { ok: false as const, error: "Ese nombre ya está en la lista." };
    await sql`
      insert into blacklist (id, user_id, nombre, telefono, motivo)
      values (${crypto.randomUUID()}, ${context.userId}, ${nombre}, ${telefono}, ${motivo})
    `;
    return { ok: true as const };
  });

export const removeBlacklist = createServerFn({ method: "POST" })
  .validator((id: unknown) => {
    if (typeof id !== "string" || !isUuid(id)) throw new Error("Registro inválido.");
    return id;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await sql`delete from blacklist where id = ${id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });
