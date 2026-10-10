/**
 * Avisos del teléfono (notificaciones del navegador).
 *
 * Reglas que pide la app, en un solo lugar para que la pantalla de Avisos, el
 * marco global y las pruebas usen exactamente las mismas:
 *
 * - **1 día antes** de que toque la renta (y también el mismo día).
 * - **35 días antes** de que venza el contrato, y todos los días hasta que vence.
 *
 * Los avisos se calculan en `computeAlerts` (`rentals.logic`); este módulo solo
 * decide **si suenan** y **cuándo dejan de repetirse**:
 *
 * - cada aviso lleva una llave (`gr-pushed:<kind>:<id>:<periodo>`) que se marca
 *   en `localStorage` para no volver a sonar por el mismo periodo;
 * - esas marcas caducan (`stalePushedKeys`) para que el almacenamiento no crezca
 *   sin fin con los meses;
 * - si el navegador tiene un service worker registrado, el aviso se entrega por
 *   ahí (se ve aunque la pestaña no esté al frente); si no, se usa `Notification`.
 *
 * Sin un servidor de push el navegador no puede despertar la app por su cuenta:
 * los avisos suenan al abrir la app y mientras siga abierta (el marco global
 * vuelve a revisar cada pocos minutos y al regresar a la pestaña).
 */

// Solo tipos: así este módulo corre también en las pruebas de Node, sin el
// alias `@/` (igual que `exchange.ts` y `rentals.logic.ts`).
import type { Alert } from "@/lib/rentals.logic";

/** Días de anticipación del aviso de renta (1 = "mañana toca la renta"). */
export const RENTA_AVISO_DIAS = 1;
/** Días de anticipación del aviso de vencimiento del contrato. */
export const CONTRATO_AVISO_DIAS = 35;
/** Días que se conserva la marca de "este aviso ya sonó". */
export const PUSHED_KEEP_DAYS = 75;

const PREF_KEY = "gr-notif";
const PUSHED_PREFIX = "gr-pushed:";
/** Captura el periodo (`2026-10` o `2026-10-09`) al final de la llave del aviso. */
const PUSHED_DATE = /(\d{4}-\d{2}(?:-\d{2})?)$/;

export type NotifState =
  /** El navegador no tiene API de notificaciones (o estamos en el servidor). */
  | "unsupported"
  /** Permitidas y activadas por la persona. */
  | "on"
  /** Permitidas, pero la persona apagó el interruptor en Avisos. */
  | "muted"
  /** Todavía no se piden. */
  | "default"
  /** El navegador las bloqueó (o el interruptor está apagado sin permiso). */
  | "blocked";

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Estado actual de los avisos en este dispositivo. */
export function notifState(): NotifState {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  const wanted = storage()?.getItem(PREF_KEY) === "on";
  if (Notification.permission === "granted") return wanted ? "on" : "muted";
  if (Notification.permission === "denied") return "blocked";
  return wanted ? "muted" : "default";
}

/** ¿Deben sonar los avisos aquí? */
export function notificationsOn(): boolean {
  return notifState() === "on";
}

/** Pide el permiso y prende los avisos. Devuelve `true` si quedaron activos. */
export async function activateNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || typeof Notification === "undefined") return false;
  let permission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch {
      return false;
    }
  }
  const ok = permission === "granted";
  storage()?.setItem(PREF_KEY, ok ? "on" : "off");
  return ok;
}

/** Apaga los avisos (no toca el permiso del navegador). */
export function silenceNotifications(): void {
  storage()?.setItem(PREF_KEY, "off");
}

/**
 * Días entre dos fechas ISO (misma regla que `daysBetween` de `rentals.logic`,
 * repetida aquí para no arrastrar dependencias a las pruebas).
 */
function daysFromTo(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const a = Date.UTC(fy, (fm ?? 1) - 1, fd ?? 1);
  const b = Date.UTC(ty, (tm ?? 1) - 1, td ?? 1);
  return Math.round((b - a) / 86_400_000);
}

/** Marca de "ya sonó" para un aviso. */
export function pushedKey(alert: Alert): string {
  return `${PUSHED_PREFIX}${alert.key}`;
}

/**
 * Llaves cuyo periodo ya quedó atrás: se borran para que `localStorage` no
 * acumule marcas de avisos de hace meses. Una llave sin fecha reconocible se
 * conserva (mejor no borrar algo que no entendemos).
 */
export function stalePushedKeys(
  keys: readonly string[],
  todayIso: string,
  keepDays: number = PUSHED_KEEP_DAYS,
): string[] {
  const stale: string[] = [];
  for (const key of keys) {
    if (!key.startsWith(PUSHED_PREFIX)) continue;
    const match = PUSHED_DATE.exec(key);
    if (!match) continue;
    const period = match[1];
    // `2026-10` → último día de ese mes; así la marca de un aviso mensual
    // sobrevive todo el mes y se limpia después.
    const iso =
      period.length === 7
        ? `${period}-${String(new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).getUTCDate()).padStart(2, "0")}`
        : period;
    if (daysFromTo(iso, todayIso) > keepDays) stale.push(key);
  }
  return stale;
}

/** Avisos que todavía no suenan (los ya marcados se descartan). */
export function alertsToPush(alerts: readonly Alert[], sentKeys: readonly string[]): Alert[] {
  const sent = new Set(sentKeys);
  return alerts.filter((alert) => !sent.has(pushedKey(alert)));
}

async function show(alert: Alert): Promise<boolean> {
  const options: NotificationOptions = { body: alert.detail, tag: alert.key, lang: "es" };
  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (registration?.showNotification) {
      await registration.showNotification(alert.title, options);
      return true;
    }
  } catch {
    /* sin service worker: se intenta directo */
  }
  try {
    new Notification(alert.title, options);
    return true;
  } catch {
    /* iOS Safari sin la app instalada las bloquea */
    return false;
  }
}

/**
 * Aviso de ejemplo para comprobar que sí suenan en este teléfono. No se marca
 * como enviado: se puede mandar tantas veces como haga falta.
 */
export async function sendTestNotification(): Promise<boolean> {
  if (!notificationsOn()) return false;
  return show({
    key: `prueba:${Date.now()}`,
    kind: "renta",
    apartmentId: "",
    title: "Aviso de prueba",
    detail: "Así se verá el recordatorio de la renta en tu teléfono.",
  });
}

/**
 * Entrega los avisos pendientes del día y marca cuáles ya sonaron.
 * Devuelve cuántos se entregaron. No hace nada si los avisos están apagados.
 */
export async function pushAlerts(alerts: readonly Alert[], todayIso: string): Promise<number> {
  if (!notificationsOn() || !alerts.length) return 0;
  const store = storage();
  const keys: string[] = [];
  if (store) {
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key?.startsWith(PUSHED_PREFIX)) keys.push(key);
    }
    for (const key of stalePushedKeys(keys, todayIso)) store.removeItem(key);
  }
  let pushed = 0;
  for (const alert of alertsToPush(alerts, keys)) {
    if (await show(alert)) {
      pushed += 1;
      store?.setItem(pushedKey(alert), "1");
      keys.push(pushedKey(alert));
    }
  }
  return pushed;
}
