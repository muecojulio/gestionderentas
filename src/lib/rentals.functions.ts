import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  blacklistHit,
  isUuid,
  mexicoToday,
  parseApartmentInput,
  type Apartment,
  type ApartmentInput,
  type BlacklistEntry,
  type Holiday,
  type Portfolio,
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
};

function mapApartment(row: ApartmentRow): Apartment {
  return {
    id: row.id,
    nombre: row.nombre,
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
  };
}

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
      select a.id, a.nombre, a.direccion, a.foto, a.medidor_luz, a.medidor_agua,
             a.nota_servicios, a.luz_dia, a.luz_centavos, a.agua_dia, a.agua_centavos,
             a.renta_centavos, a.inquilino, a.telefono, a.dia_pago, a.contrato_inicio,
             a.contrato_fin, a.ingreso, a.ocupado, a.notas,
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
    }>`
      select id, inquilino, renta_centavos, inicio, fin
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
      if (cached[0]) return JSON.parse(cached[0].payload) as Holiday[];
      return [];
    }
  });

async function writeApartment(sql: Sql, userId: string, input: ApartmentInput) {
  if (input.id) {
    const rows = await sql<{ id: string }>`
      update apartments set
        nombre = ${input.nombre},
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
        notas = ${input.notas}
      where id = ${input.id} and user_id = ${userId}
      returning id
    `;
    return rows[0]?.id ?? null;
  }
  const id = crypto.randomUUID();
  await sql`
    insert into apartments (
      id, user_id, nombre, direccion, foto, medidor_luz, medidor_agua, nota_servicios,
      luz_dia, luz_centavos, agua_dia, agua_centavos, renta_centavos, inquilino, telefono,
      dia_pago, contrato_inicio, contrato_fin, ingreso, ocupado, notas
    ) values (
      ${id}, ${userId}, ${input.nombre}, ${input.direccion}, ${input.foto},
      ${input.medidorLuz}, ${input.medidorAgua}, ${input.notaServicios},
      ${input.luzDia}, ${input.luzCentavos}, ${input.aguaDia}, ${input.aguaCentavos},
      ${input.rentaCentavos}, ${input.inquilino}, ${input.telefono}, ${input.diaPago},
      ${input.contratoInicio}, ${input.contratoFin}, ${input.ingreso}, ${input.ocupado},
      ${input.notas}
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
      }>`
        select ocupado, inquilino, renta_centavos, ingreso, contrato_inicio
        from apartments
        where id = ${input.id} and user_id = ${context.userId}
      `;
      const before = prev[0];
      if (before && flag(before.ocupado)) {
        await sql`
          insert into tenancies (id, user_id, apartment_id, inquilino, renta_centavos, inicio, fin)
          values (
            ${crypto.randomUUID()}, ${context.userId}, ${input.id}, ${before.inquilino ?? ""},
            ${num(before.renta_centavos)}, ${before.ingreso ?? before.contrato_inicio}, ${mexicoToday()}
          )
        `;
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
      select id, nombre, direccion, foto, medidor_luz, medidor_agua, nota_servicios,
             luz_dia, luz_centavos, agua_dia, agua_centavos, renta_centavos, inquilino,
             telefono, dia_pago, contrato_inicio, contrato_fin, ingreso, ocupado, notas,
             false as recibido
      from apartments
      where id = ${id} and user_id = ${context.userId}
    `;
    const current = rows[0];
    if (!current) return { ok: false as const, error: "No encontramos ese departamento." };
    const apt = mapApartment(current);
    if (apt.ocupado || apt.inquilino) {
      await sql`
        insert into tenancies (id, user_id, apartment_id, inquilino, renta_centavos, inicio, fin)
        values (
          ${crypto.randomUUID()}, ${context.userId}, ${id}, ${apt.inquilino},
          ${apt.rentaCentavos}, ${apt.ingreso ?? apt.contratoInicio}, ${mexicoToday()}
        )
      `;
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
        notas = ''
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
    const rows = await sql<{ id: string }>`
      delete from apartments where id = ${id} and user_id = ${context.userId} returning id
    `;
    if (!rows[0]) return { ok: false as const, error: "No encontramos ese departamento." };
    return { ok: true as const };
  });

export const setReceipt = createServerFn({ method: "POST" })
  .validator((raw: unknown) => {
    if (!raw || typeof raw !== "object") throw new Error("Datos inválidos.");
    const o = raw as { apartmentId?: unknown; received?: unknown };
    if (typeof o.apartmentId !== "string" || !isUuid(o.apartmentId)) {
      throw new Error("Departamento inválido.");
    }
    return { apartmentId: o.apartmentId, received: o.received === true };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ renta_centavos: unknown; ocupado: unknown }>`
      select renta_centavos, ocupado from apartments
      where id = ${data.apartmentId} and user_id = ${context.userId}
    `;
    const apt = rows[0];
    if (!apt || !flag(apt.ocupado)) {
      return { ok: false as const, error: "Ese departamento no está rentado." };
    }
    const today = mexicoToday();
    const anio = Number(today.slice(0, 4));
    const mes = Number(today.slice(5, 7));
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
    const centavos = num(apt.renta_centavos) ?? 0;
    await sql`
      insert into receipts (id, user_id, apartment_id, anio, mes, centavos, recibido_el)
      values (
        ${crypto.randomUUID()}, ${context.userId}, ${data.apartmentId},
        ${anio}, ${mes}, ${centavos}, ${today}
      )
      on conflict (user_id, apartment_id, anio, mes)
      do update set centavos = ${centavos}, recibido_el = ${today}
    `;
    return { ok: true as const };
  });

export const addBlacklist = createServerFn({ method: "POST" })
  .validator((raw: unknown) => raw)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!data || typeof data !== "object") return { ok: false as const, error: "Datos inválidos." };
    const o = data as Record<string, unknown>;
    const nombre = typeof o.nombre === "string" ? o.nombre.replace(/[\u0000-\u001F]/g, "").trim() : "";
    if (nombre.length < 2 || nombre.length > 80) {
      return { ok: false as const, error: "Escribe el nombre completo." };
    }
    const telefono =
      typeof o.telefono === "string" ? o.telefono.replace(/[\u0000-\u001F]/g, "").trim().slice(0, 24) : "";
    const motivo =
      typeof o.motivo === "string" ? o.motivo.replace(/[\u0000-\u001F]/g, "").trim().slice(0, 240) : "";
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
