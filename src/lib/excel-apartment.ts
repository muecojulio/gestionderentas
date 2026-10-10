import writeXlsxFile from "write-excel-file/browser";
import { exportApartment } from "@/lib/rentals.functions";
import {
  DEPOSITO_LABEL,
  diasTexto,
  formatMoney,
  longDate,
  monthTitle,
  monthsFrom,
  periodInRange,
  rowsForMonth,
  shiftMonth,
  tenureLabel,
  type Apartment,
  type Receipt,
  type RentAdjustment,
  type Tenancy,
} from "@/lib/rentals.logic";

type Cell = {
  value?: string | number;
  type?: StringConstructor | NumberConstructor;
  fontWeight?: "bold";
  format?: string;
};

function text(value: string): Cell {
  return { value, type: String };
}

function head(value: string): Cell {
  return { value, type: String, fontWeight: "bold" };
}

function pesos(centavos: number | null): Cell {
  if (centavos == null) return text("—");
  return { value: centavos / 100, type: Number, format: '"$"#,##0.00' };
}

function fileName(nombre: string): string {
  const slug = nombre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${slug || "departamento"}.xlsx`;
}

function pair(label: string, value: string): Cell[] {
  return [text(label), text(value)];
}

function ficha(apartment: Apartment, today: string): Cell[][] {
  const deposit =
    apartment.depositoCentavos == null
      ? "Sin depósito"
      : `${formatMoney(apartment.depositoCentavos)} · ${
          apartment.depositoEstado ? DEPOSITO_LABEL[apartment.depositoEstado] : "En tu poder"
        }`;
  return [
    [head("Campo"), head("Valor")],
    pair("Departamento", apartment.nombre),
    pair("Dirección", apartment.direccion || "—"),
    pair("Foto", apartment.foto ? "Sí" : "No"),
    pair("Medidor de luz", apartment.medidorLuz || "—"),
    pair("Medidor de agua", apartment.medidorAgua || "—"),
    pair("Nota de medidores", apartment.notaServicios || "—"),
    pair("Estado", apartment.ocupado ? "Rentado" : "Libre"),
    pair("Inquilino", apartment.ocupado ? apartment.inquilino || "—" : "—"),
    pair("Teléfono", apartment.ocupado ? apartment.telefono || "—" : "—"),
    pair("Renta mensual", apartment.ocupado ? formatMoney(apartment.rentaCentavos) : "—"),
    pair("Día de pago", apartment.diaPago ? `Día ${apartment.diaPago}` : "—"),
    pair("Ingresó", apartment.ingreso ? longDate(apartment.ingreso) : "—"),
    pair(
      "Lleva rentando",
      apartment.ocupado ? tenureLabel(apartment.ingreso ?? apartment.contratoInicio, today) : "—",
    ),
    pair("Inicio del contrato", apartment.contratoInicio ? longDate(apartment.contratoInicio) : "—"),
    pair("Vence el contrato", apartment.contratoFin ? longDate(apartment.contratoFin) : "—"),
    pair("Depósito", deposit),
    pair("Fecha del depósito", apartment.depositoFecha ? longDate(apartment.depositoFecha) : "—"),
    pair("Nota del depósito", apartment.depositoNota || "—"),
  ];
}

function cobros(apartment: Apartment, history: Tenancy[], receipts: Receipt[], today: string): Cell[][] {
  const end = { anio: Number(today.slice(0, 4)), mes: Number(today.slice(5, 7)) };
  const oldest = shiftMonth(end.anio, end.mes, -35);
  const dates = [
    apartment.ingreso,
    apartment.contratoInicio,
    ...history.map((stay) => stay.inicio),
    ...receipts.map((receipt) => `${receipt.anio}-${String(receipt.mes).padStart(2, "0")}-01`),
  ].filter((value): value is string => Boolean(value));
  dates.sort();
  let start = dates[0]
    ? { anio: Number(dates[0].slice(0, 4)), mes: Number(dates[0].slice(5, 7)) }
    : shiftMonth(end.anio, end.mes, -11);
  if (start.anio < oldest.anio || (start.anio === oldest.anio && start.mes < oldest.mes)) start = oldest;
  if (start.anio > end.anio || (start.anio === end.anio && start.mes > end.mes)) start = end;
  const tenancies = history.map((stay) => ({
    apartmentId: apartment.id,
    inquilino: stay.inquilino,
    rentaCentavos: stay.rentaCentavos,
    inicio: stay.inicio,
    fin: stay.fin,
  }));
  const stay = {
    id: apartment.id,
    nombre: apartment.nombre,
    ocupado: apartment.ocupado,
    inquilino: apartment.inquilino,
    rentaCentavos: apartment.rentaCentavos,
    ingreso: apartment.ingreso,
    contratoInicio: apartment.contratoInicio,
    diaPago: apartment.diaPago,
  };
  const body: Cell[][] = [[head("Mes"), head("Inquilino"), head("Renta"), head("Situación"), head("Anotado el")]];
  for (const month of monthsFrom(start, end)) {
    if (!periodInRange(month.anio, month.mes, today)) continue;
    const monthReceipts = receipts.filter((receipt) => receipt.anio === month.anio && receipt.mes === month.mes);
    const found = rowsForMonth({
      anio: month.anio,
      mes: month.mes,
      today,
      apartments: [stay],
      tenancies,
      receipts: monthReceipts,
    });
    for (const row of found) {
      const paid = monthReceipts[0];
      const situacion = row.recibido
        ? "Pagado"
        : row.diasMora
          ? `Sin pagar · ${diasTexto(row.diasMora)}`
          : "Sin anotar";
      body.push([
        text(monthTitle(month.anio, month.mes)),
        text(row.inquilino || "—"),
        pesos(row.rentaCentavos),
        text(situacion),
        text(paid?.recibidoEl ? longDate(paid.recibidoEl) : "—"),
      ]);
    }
  }
  if (body.length === 1) body.push([text("—"), text("—"), text("—"), text("Sin meses con renta"), text("—")]);
  return body;
}

function estancias(apartment: Apartment, history: Tenancy[]): Cell[][] {
  const header: Cell[] = [
    head("Inquilino"),
    head("Inicio"),
    head("Fin"),
    head("Renta"),
    head("Depósito"),
    head("Estado del depósito"),
    head("Nota"),
  ];
  const rows: Cell[][] = [header];
  if (apartment.ocupado) {
    rows.push([
      text(apartment.inquilino || "—"),
      text(apartment.ingreso ? longDate(apartment.ingreso) : "—"),
      text("Sigue aquí"),
      pesos(apartment.rentaCentavos),
      pesos(apartment.depositoCentavos),
      text(apartment.depositoEstado ? DEPOSITO_LABEL[apartment.depositoEstado] : "—"),
      text(apartment.depositoNota || "—"),
    ]);
  }
  for (const stay of history) {
    rows.push([
      text(stay.inquilino || "—"),
      text(stay.inicio ? longDate(stay.inicio) : "—"),
      text(stay.fin ? longDate(stay.fin) : "—"),
      pesos(stay.rentaCentavos),
      pesos(stay.depositoCentavos),
      text(stay.depositoEstado ? DEPOSITO_LABEL[stay.depositoEstado] : "—"),
      text(stay.depositoNota || "—"),
    ]);
  }
  if (rows.length === 1) rows.push([text("—"), text("—"), text("—"), text("—"), text("—"), text("—"), text("Sin estancias")]);
  return rows;
}

function incrementos(adjustments: RentAdjustment[]): Cell[][] {
  const rows: Cell[][] = [[head("Desde"), head("Renta anterior"), head("Renta nueva")]];
  if (adjustments.length === 0) {
    rows.push([text("—"), text("Sin incrementos"), text("—")]);
    return rows;
  }
  for (const row of adjustments) {
    rows.push([
      text(longDate(row.vigenteDesde)),
      pesos(row.anteriorCentavos),
      pesos(row.nuevoCentavos),
    ]);
  }
  return rows;
}

export async function downloadApartmentExcel(id: string): Promise<void> {
  const result = await exportApartment({ data: id });
  if (!result.ok) throw new Error(result.error);
  const { apartment, history, receipts, adjustments, today } = result;
  const book = await writeXlsxFile([
    {
      sheet: "Ficha",
      columns: [{ width: 26 }, { width: 42 }],
      data: ficha(apartment, today),
    },
    {
      sheet: "Cobros",
      columns: [{ width: 18 }, { width: 24 }, { width: 14 }, { width: 24 }, { width: 22 }],
      data: cobros(apartment, history, receipts, today),
    },
    {
      sheet: "Estancias",
      columns: [
        { width: 24 },
        { width: 18 },
        { width: 18 },
        { width: 14 },
        { width: 14 },
        { width: 22 },
        { width: 28 },
      ],
      data: estancias(apartment, history),
    },
    {
      sheet: "Incrementos",
      columns: [{ width: 22 }, { width: 18 }, { width: 18 }],
      data: incrementos(adjustments),
    },
  ]);
  await book.toFile(fileName(apartment.nombre));
}
