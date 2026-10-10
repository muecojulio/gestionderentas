import { useEffect, useRef } from "react";
import { pushAlerts } from "@/lib/notifications";
import type { Alert } from "@/lib/rentals.logic";

/**
 * Entrega los avisos del día y mantiene los datos frescos mientras la app sigue
 * abierta.
 *
 * ¿Por qué hace falta el "despertador"? Los avisos se calculan con la fecha de
 * hoy que viene en los datos. Si la pestaña se queda abierta de un día para
 * otro, sin esto seguiría avisando con la fecha de ayer y el recordatorio de
 * "mañana toca la renta" nunca sonaría. Por eso se vuelven a pedir los datos:
 *
 * - al regresar a la pestaña (si estaba en segundo plano);
 * - al recuperar la conexión;
 * - cada pocos minutos mientras la app está a la vista.
 *
 * Con los datos nuevos, `computeAlerts` vuelve a correr y el efecto de entrega
 * dispara lo que falte (sin repetir: cada aviso se marca al sonar).
 */

/** Cuánto dejar pasar entre dos revisiones automáticas. */
const RECHECK_MS = 5 * 60 * 1000;
/** Cada cuánto se comprueba si ya toca revisar. */
const TICK_MS = 60 * 1000;

export function useAlertNotifications(
  alerts: Alert[],
  today: string | undefined,
  onWake: () => void,
): void {
  const wakeRef = useRef(onWake);
  const lastWake = useRef(0);

  useEffect(() => {
    wakeRef.current = onWake;
  }, [onWake]);

  // Entrega lo que esté pendiente (marcado por aviso, no se repite).
  useEffect(() => {
    if (!today || alerts.length === 0) return;
    void pushAlerts(alerts, today);
  }, [alerts, today]);

  // Revisa de nuevo mientras la app siga abierta.
  useEffect(() => {
    if (typeof document === "undefined") return;
    lastWake.current = Date.now();
    const wake = (force = false) => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (!force && now - lastWake.current < RECHECK_MS) return;
      lastWake.current = now;
      wakeRef.current();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") wake(true);
    };
    const onOnline = () => wake(true);
    // Al tomar el foco no se fuerza: basta con que no haya pasado el intervalo.
    const onFocus = () => wake(false);
    const tick = window.setInterval(() => wake(false), TICK_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
}
