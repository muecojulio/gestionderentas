import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeAlerts,
  rentMora,
  rowsForMonth,
  type Apartment,
} from "./rentals.logic.ts";

function apt(partial: Partial<Apartment> & Pick<Apartment, "id" | "nombre">): Apartment {
  return {
    direccion: "",
    foto: null,
    medidorLuz: "",
    medidorAgua: "",
    notaServicios: "",
    luzDia: null,
    luzCentavos: null,
    aguaDia: null,
    aguaCentavos: null,
    rentaCentavos: 1_200_000,
    inquilino: "Ana López",
    telefono: "",
    diaPago: 5,
    contratoInicio: "2026-01-01",
    contratoFin: null,
    ingreso: "2026-01-05",
    ocupado: true,
    notas: "",
    recibido: false,
    depositoCentavos: null,
    depositoFecha: null,
    depositoEstado: null,
    depositoNota: "",
    ...partial,
  };
}

describe("rentMora", () => {
  it("cuenta los días después del día de pago si no está anotada", () => {
    const late = rentMora(apt({ id: "1", nombre: "3" }), "2026-10-09");
    assert.equal(late?.days, 4);
    assert.equal(late?.due, "2026-10-05");
  });

  it("el mismo día de pago todavía no es mora", () => {
    assert.equal(rentMora(apt({ id: "1", nombre: "3" }), "2026-10-05"), null);
  });

  it("no marca mora si ya se anotó el pago o si ingresó después del día", () => {
    assert.equal(rentMora(apt({ id: "1", nombre: "3", recibido: true }), "2026-10-09"), null);
    assert.equal(
      rentMora(apt({ id: "1", nombre: "3", ingreso: "2026-10-07", contratoInicio: "2026-10-07" }), "2026-10-09"),
      null,
    );
  });
});

describe("rowsForMonth", () => {
  const base = {
    id: "apt-1",
    nombre: "Interior 3",
    ocupado: true,
    inquilino: "Ana",
    rentaCentavos: 1_000_000,
    ingreso: "2026-08-15",
    contratoInicio: "2026-08-15",
    diaPago: 5,
  };

  it("incluye agosto y no julio si ingresó el 15 de agosto", () => {
    const july = rowsForMonth({
      anio: 2026,
      mes: 7,
      today: "2026-10-09",
      apartments: [base],
      tenancies: [],
      receipts: [],
    });
    const august = rowsForMonth({
      anio: 2026,
      mes: 8,
      today: "2026-10-09",
      apartments: [base],
      tenancies: [],
      receipts: [{ apartmentId: "apt-1", centavos: 1_000_000 }],
    });
    assert.equal(july.length, 0);
    assert.equal(august.length, 1);
    assert.equal(august[0]?.recibido, true);
  });

  it("muestra la estancia cerrada en los meses que cubrió", () => {
    const rows = rowsForMonth({
      anio: 2026,
      mes: 2,
      today: "2026-10-09",
      apartments: [{ ...base, ocupado: false, inquilino: "", rentaCentavos: null, ingreso: null }],
      tenancies: [
        {
          apartmentId: "apt-1",
          inquilino: "Luis",
          rentaCentavos: 800_000,
          inicio: "2026-01-01",
          fin: "2026-03-10",
        },
      ],
      receipts: [],
    });
    assert.equal(rows[0]?.inquilino, "Luis");
    assert.equal(rows[0]?.recibido, false);
  });
});

describe("computeAlerts", () => {
  it("avisa la mora y no el recordatorio de mañana a la vez", () => {
    const alerts = computeAlerts([apt({ id: "11111111-1111-1111-1111-111111111111", nombre: "Roma" })], "2026-10-09");
    assert.equal(alerts.some((alert) => alert.kind === "mora"), true);
    assert.equal(alerts.some((alert) => alert.kind === "renta"), false);
  });
});
