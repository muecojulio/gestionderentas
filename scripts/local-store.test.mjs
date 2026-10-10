/**
 * Pruebas del respaldo local (`src/lib/local-store.ts`): el almacén que mantiene
 * la app funcionando —ver, dar de alta, cobrar, exportar— cuando el servidor no
 * tiene base de datos disponible.
 *
 * Se corre con `node --test` (ver el script `test` del package.json). Los
 * módulos se cargan con el cargador SSR de Vite porque viven en TypeScript y
 * usan el alias `@/`; no se levanta ningún servidor ni se toca la base.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createServer } from "vite";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** `localStorage` mínimo: `local-store` solo usa getItem/setItem/removeItem. */
class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

let server;
let store;

before(async () => {
  server = await createServer({
    root: ROOT,
    configFile: false,
    logLevel: "error",
    server: { middlewareMode: true },
    resolve: { alias: { "@": resolve(ROOT, "src") } },
  });
  // `window` se define DESPUÉS de crear el servidor de Vite y antes de cargar el
  // módulo: así `local-store` encuentra `localStorage` como en un navegador.
  globalThis.window = { localStorage: new MemoryStorage() };
  store = await server.ssrLoadModule("/src/lib/local-store.ts");
});

after(async () => {
  delete globalThis.window;
  await server?.close();
});

describe("respaldo local", () => {
  it("está disponible y arranca vacío", () => {
    assert.equal(store.hasLocalStorage(), true);
    const portfolio = store.localListPortfolio();
    assert.equal(portfolio.apartments.length, 0);
    assert.equal(portfolio.recibidoAnio, 0);
    assert.match(portfolio.today, /^\d{4}-\d{2}-\d{2}$/);
  });

  it("guarda, lista y cobra un departamento", () => {
    const saved = store.localSaveApartment({
      nombre: "Depto A",
      direccion: "Calle 1",
      ocupado: true,
      inquilino: "Ana Pérez",
      rentaCentavos: 500000,
      diaPago: 5,
      ingreso: "2024-01-15",
      contratoInicio: "2024-01-15",
      telefono: "5512345678",
    });
    assert.equal(saved.ok, true);

    let portfolio = store.localListPortfolio();
    assert.equal(portfolio.apartments.length, 1);
    assert.equal(portfolio.apartments[0].nombre, "Depto A");
    assert.equal(portfolio.apartments[0].recibido, false);

    const month = store.localListMonth(portfolio.anio, portfolio.mes);
    assert.equal(month.ok, true);
    assert.equal(month.rows.length, 1);
    assert.equal(month.esperado, 500000);

    assert.equal(
      store.localSetReceipt({
        apartmentId: saved.id,
        received: true,
        anio: portfolio.anio,
        mes: portfolio.mes,
      }).ok,
      true,
    );
    portfolio = store.localListPortfolio();
    assert.equal(portfolio.apartments[0].recibido, true);
    assert.equal(portfolio.recibidoAnio, 500000);

    const timeline = store.localListIncomeTimeline();
    assert.ok(
      timeline.some(
        (point) =>
          point.anio === portfolio.anio &&
          point.mes === portfolio.mes &&
          point.centavos === 500000,
      ),
    );

    assert.equal(
      store.localSetReceipt({
        apartmentId: saved.id,
        received: false,
        anio: portfolio.anio,
        mes: portfolio.mes,
      }).ok,
      true,
    );
    assert.equal(store.localListPortfolio().apartments[0].recibido, false);
  });

  it("aplica incrementos de renta", () => {
    const { id } = store.localSaveApartment({
      nombre: "Depto B",
      ocupado: true,
      inquilino: "Luis Gómez",
      rentaCentavos: 400000,
      diaPago: 3,
      ingreso: "2025-01-01",
    });
    const today = store.localListPortfolio().today;
    const result = store.localApplyIncrease({
      apartmentId: id,
      nuevoCentavos: 440000,
      vigenteDesde: today,
    });
    assert.equal(result.ok, true);
    const apt = store.localListPortfolio().apartments.find((item) => item.id === id);
    assert.equal(apt.rentaCentavos, 440000);
    assert.equal(apt.ultimoIncremento, today);
    assert.equal(store.localListAdjustments(id).length, 1);
    // La misma renta no cuenta como incremento.
    assert.equal(
      store.localApplyIncrease({ apartmentId: id, nuevoCentavos: 440000 }).ok,
      false,
    );
    assert.equal(store.localDeleteApartment(id).ok, true);
  });

  it("respeta la lista de personas a las que no se vuelve a rentar", () => {
    assert.equal(
      store.localAddBlacklist({ nombre: "Juan Malo", telefono: "", motivo: "" }).ok,
      true,
    );
    assert.equal(
      store.localAddBlacklist({ nombre: "Juan Malo", telefono: "", motivo: "" }).ok,
      false,
    );
    const blocked = store.localSaveApartment({
      nombre: "Depto C",
      ocupado: true,
      inquilino: "Juan Malo",
      rentaCentavos: 100,
      diaPago: 1,
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.code, "blacklist");
    // Con `forzar` se acepta igual.
    const forced = store.localSaveApartment({
      nombre: "Depto C",
      ocupado: true,
      inquilino: "Juan Malo",
      rentaCentavos: 100,
      diaPago: 1,
      forzar: true,
    });
    assert.equal(forced.ok, true);
    assert.equal(store.localDeleteApartment(forced.id).ok, true);
    assert.equal(
      store.localRemoveBlacklist(store.localListBlacklist()[0].id).ok,
      true,
    );
    assert.equal(store.localListBlacklist().length, 0);
  });

  it("exporta la ficha de un departamento", () => {
    const { id } = store.localSaveApartment({
      nombre: "Depto D",
      ocupado: true,
      inquilino: "Sofía Ruiz",
      rentaCentavos: 700000,
      diaPago: 8,
      ingreso: "2025-06-01",
    });
    const exported = store.localExportApartment(id);
    assert.equal(exported.ok, true);
    assert.equal(exported.apartment.nombre, "Depto D");
    assert.equal(exported.apartment.id, id);
    assert.ok(Array.isArray(exported.history));
    assert.ok(Array.isArray(exported.receipts));
    assert.ok(Array.isArray(exported.adjustments));
    assert.match(exported.today, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(store.localDeleteApartment(id).ok, true);
  });

  it("archiva la estancia al desocupar y borra en cascada", () => {
    const { id } = store.localSaveApartment({
      nombre: "Depto E",
      ocupado: true,
      inquilino: "Pedro Ruiz",
      rentaCentavos: 300000,
      diaPago: 2,
      ingreso: "2025-02-01",
    });
    assert.equal(store.localVacateApartment(id).ok, true);
    assert.equal(store.localListHistory(id).length, 1);
    const apt = store.localListPortfolio().apartments.find((item) => item.id === id);
    assert.equal(apt.ocupado, false);
    assert.equal(apt.inquilino, "");
    assert.equal(store.localDeleteApartment(id).ok, true);
    assert.equal(store.localListHistory(id).length, 0);
    assert.equal(store.localDeleteApartment(id).ok, false);
  });
});
