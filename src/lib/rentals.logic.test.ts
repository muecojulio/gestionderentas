import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeAlerts,
  increaseDue,
  mexicoOfficialHolidays,
  rentMora,
  rowsForMonth,
  stripControlChars,
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
    ultimoIncremento: null,
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

describe("increaseDue", () => {
  it("avisa dentro de los 30 días previos al aniversario", () => {
    const due = increaseDue(
      apt({ id: "1", nombre: "Roma", contratoInicio: "2025-10-15", ingreso: "2025-10-15" }),
      "2026-10-09",
    );
    assert.equal(due?.date, "2026-10-15");
    assert.equal(due?.daysUntil, 6);
    assert.equal(due?.years, 1);
  });

  it("no avisa si falta mucho o si ya anotaste la renta nueva", () => {
    assert.equal(
      increaseDue(apt({ id: "1", nombre: "Roma", contratoInicio: "2026-01-05" }), "2026-10-09"),
      null,
    );
    assert.equal(
      increaseDue(
        apt({
          id: "1",
          nombre: "Roma",
          contratoInicio: "2025-10-15",
          ingreso: "2025-10-15",
          ultimoIncremento: "2026-10-01",
        }),
        "2026-10-09",
      ),
      null,
    );
  });
});

describe("computeAlerts", () => {
  it("avisa la mora y no el recordatorio de mañana a la vez", () => {
    const alerts = computeAlerts([apt({ id: "11111111-1111-1111-1111-111111111111", nombre: "Roma" })], "2026-10-09");
    assert.equal(alerts.some((alert) => alert.kind === "mora"), true);
    assert.equal(alerts.some((alert) => alert.kind === "renta"), false);
  });
});

describe("mexicoOfficialHolidays", () => {
  it("calcula los feriados oficiales de 2026 con sus lunes de observancia", () => {
    const holidays = mexicoOfficialHolidays(2026);
    const byDate = new Map(holidays.map((holiday) => [holiday.date, holiday.localName]));
    assert.equal(byDate.get("2026-01-01"), "Año Nuevo");
    // Primer lunes de febrero de 2026.
    assert.equal(byDate.get("2026-02-02"), "Día de la Constitución");
    // Tercer lunes de marzo de 2026.
    assert.equal(byDate.get("2026-03-16"), "Natalicio de Benito Juárez");
    assert.equal(byDate.get("2026-05-01"), "Día del Trabajo");
    assert.equal(byDate.get("2026-09-16"), "Día de la Independencia");
    // Tercer lunes de noviembre de 2026.
    assert.equal(byDate.get("2026-11-16"), "Día de la Revolución");
    assert.equal(byDate.get("2026-12-25"), "Navidad");
    // 2026 no es año de transmisión del poder (1 de diciembre cada 6 años).
    assert.equal(byDate.has("2026-12-01"), false);
    // Ordenados y sin duplicados.
    const dates = holidays.map((holiday) => holiday.date);
    assert.deepEqual(dates, [...dates].sort());
    assert.equal(new Set(dates).size, dates.length);
  });

  it("incluye la transmisión del poder cada seis años desde 2018", () => {
    assert.equal(
      mexicoOfficialHolidays(2024).some((holiday) => holiday.date === "2024-12-01"),
      true,
    );
    assert.equal(
      mexicoOfficialHolidays(2018).some((holiday) => holiday.date === "2018-12-01"),
      true,
    );
    assert.equal(
      mexicoOfficialHolidays(2030).some((holiday) => holiday.date === "2030-12-01"),
      true,
    );
  });

  it("rechaza años fuera de rango", () => {
    assert.deepEqual(mexicoOfficialHolidays(1800), []);
    assert.deepEqual(mexicoOfficialHolidays(2200), []);
  });
});

describe("stripControlChars", () => {
  it("quita caracteres de control que entraban por los formularios", () => {
    assert.equal(stripControlChars("Ana\u0000López\u001F"), "AnaLópez");
    assert.equal(stripControlChars("tel\u0007é\u007Ffono"), "teléfono");
    assert.equal(stripControlChars("sin cambios"), "sin cambios");
  });
});
