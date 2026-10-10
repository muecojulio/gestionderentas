import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTRATO_AVISO_DIAS,
  RENTA_AVISO_DIAS,
  activateNotifications,
  alertsToPush,
  notifState,
  notificationsOn,
  pushAlerts,
  pushedKey,
  sendTestNotification,
  stalePushedKeys,
} from "./notifications.ts";
import type { Alert } from "./rentals.logic.ts";

function alert(partial: Partial<Alert> & Pick<Alert, "key">): Alert {
  return {
    kind: "renta",
    apartmentId: "11111111-1111-1111-1111-111111111111",
    title: "Mañana toca la renta de Roma",
    detail: "Ana López · $12,000 MXN",
    ...partial,
  };
}

describe("reglas de los avisos", () => {
  it("avisa un día antes de la renta y 35 antes del vencimiento", () => {
    assert.equal(RENTA_AVISO_DIAS, 1);
    assert.equal(CONTRATO_AVISO_DIAS, 35);
  });
});

describe("pushedKey", () => {
  it("marca cada aviso por su periodo", () => {
    assert.equal(pushedKey(alert({ key: "renta:1:2026-10" })), "gr-pushed:renta:1:2026-10");
    assert.equal(
      pushedKey(alert({ key: "contrato:1:2026-11-14", kind: "contrato" })),
      "gr-pushed:contrato:1:2026-11-14",
    );
  });
});

describe("alertsToPush", () => {
  it("descarta los avisos que ya sonaron", () => {
    const renta = alert({ key: "renta:1:2026-10" });
    const contrato = alert({ key: "contrato:1:2026-11-14", kind: "contrato" });
    assert.deepEqual(alertsToPush([renta, contrato], []), [renta, contrato]);
    assert.deepEqual(alertsToPush([renta, contrato], [pushedKey(renta)]), [contrato]);
    assert.deepEqual(alertsToPush([renta, contrato], [pushedKey(renta), pushedKey(contrato)]), []);
  });
});

describe("stalePushedKeys", () => {
  const today = "2026-10-10";

  it("limpia las marcas de meses ya muy lejanos", () => {
    const keys = [
      "gr-pushed:renta:1:2025-01", // enero de 2025: quedó atrás hace mucho
      "gr-pushed:mora:2:2026-09", // mes pasado: se conserva
      "gr-pushed:contrato:3:2026-11-14", // todavía no vence
      "gr-pushed:incremento:4:2026-10-01", // hace pocos días
    ];
    assert.deepEqual(stalePushedKeys(keys, today), ["gr-pushed:renta:1:2025-01"]);
  });

  it("conserva el aviso mensual todo su mes y lo limpia después", () => {
    // La marca de octubre sigue viva a finales de octubre…
    assert.deepEqual(stalePushedKeys(["gr-pushed:renta:1:2026-10"], "2026-10-31"), []);
    // …y se limpia cuando ya pasaron más de 75 días del fin de ese mes.
    assert.deepEqual(stalePushedKeys(["gr-pushed:renta:1:2026-10"], "2027-02-20"), [
      "gr-pushed:renta:1:2026-10",
    ]);
  });

  it("no toca llaves que no reconoce ni ajenas a los avisos", () => {
    assert.deepEqual(
      stalePushedKeys(["gr-notif", "gr:datos:v1", "gr-pushed:sin-fecha"], today),
      [],
    );
  });

  it("respeta la ventana que se le pida", () => {
    assert.deepEqual(stalePushedKeys(["gr-pushed:renta:1:2026-08"], today, 10), [
      "gr-pushed:renta:1:2026-08",
    ]);
  });
});

describe("sin navegador", () => {
  it("no intenta avisar cuando no hay API de notificaciones", async () => {
    assert.equal(notifState(), "unsupported");
    assert.equal(notificationsOn(), false);
    assert.equal(await activateNotifications(), false);
    assert.equal(await pushAlerts([alert({ key: "renta:1:2026-10" })], "2026-10-10"), 0);
  });
});

/** Doble de `localStorage` para probar la entrega sin navegador real. */
function fakeStorage(initial: Record<string, string>) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

describe("con navegador simulado", () => {
  it("entrega el aviso una sola vez y limpia las marcas viejas", async () => {
    const shown: { title: string; body?: string }[] = [];
    class FakeNotification {
      static permission = "granted";
      constructor(title: string, options?: NotificationOptions) {
        shown.push({ title, body: options?.body });
      }
    }
    const store = fakeStorage({
      "gr-notif": "on",
      "gr-pushed:renta:1:2026-01": "1", // marca vieja: debe limpiarse
    });
    const globals = globalThis as Record<string, unknown>;
    globals.window = { localStorage: store };
    globals.Notification = FakeNotification;
    try {
      assert.equal(notifState(), "on");
      const renta = alert({ key: "renta:2:2026-10", title: "Mañana toca la renta de Roma" });

      assert.equal(await pushAlerts([renta], "2026-10-09"), 1);
      assert.deepEqual(shown, [
        { title: "Mañana toca la renta de Roma", body: "Ana López · $12,000 MXN" },
      ]);
      assert.equal(store.map.has("gr-pushed:renta:2:2026-10"), true);
      assert.equal(store.map.has("gr-pushed:renta:1:2026-01"), false);

      // El mismo aviso no vuelve a sonar.
      assert.equal(await pushAlerts([renta], "2026-10-09"), 0);
      assert.equal(shown.length, 1);

      // Al mes siguiente sí vuelve a avisar.
      assert.equal(await pushAlerts([alert({ key: "renta:2:2026-11" })], "2026-11-09"), 1);
      assert.equal(shown.length, 2);

      // Con el interruptor apagado no suena nada, aunque el navegador lo permita.
      store.setItem("gr-notif", "off");
      assert.equal(notifState(), "muted");
      assert.equal(await pushAlerts([alert({ key: "renta:2:2026-12" })], "2026-12-09"), 0);
      assert.equal(shown.length, 2);

      // El aviso de prueba sí se puede mandar varias veces.
      store.setItem("gr-notif", "on");
      assert.equal(notifState(), "on");
      assert.equal(await sendTestNotification(), true);
      assert.equal(await sendTestNotification(), true);
      assert.equal(shown.length, 4);
      assert.equal(shown[2].title, "Aviso de prueba");

      // Si el navegador los bloquea, no se intenta nada.
      FakeNotification.permission = "denied";
      assert.equal(notifState(), "blocked");
      assert.equal(await pushAlerts([alert({ key: "renta:3:2027-01" })], "2027-01-09"), 0);
      assert.equal(await sendTestNotification(), false);
      assert.equal(shown.length, 4);
    } finally {
      delete globals.window;
      delete globals.Notification;
    }
  });
});
