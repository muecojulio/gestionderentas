/**
 * Foco que sigue al cursor (idea tomada de componentes abiertos como el
 * "Spotlight" de magicui). Un solo listener global alimenta las variables
 * `--mx` / `--my` de la tarjeta bajo el puntero; el dibujo lo hace CSS
 * (`.spotlight::before`), así que no hay re-renders de React.
 *
 * Solo actúa con puntero fino y cuando el usuario no pidió movimiento
 * reducido: en táctil no hay hover y no tiene sentido decorar el gesto.
 */

const THROTTLE_MS = 24;

export function spotlightSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/** Instala el seguimiento del puntero. Devuelve la función que lo desinstala. */
export function installSpotlight(): () => void {
  if (typeof window === "undefined") return () => {};
  if (!spotlightSupported()) return () => {};

  let frame = 0;
  let last = 0;
  let pending: { x: number; y: number; target: EventTarget | null } | null = null;

  const paint = () => {
    frame = 0;
    if (!pending) return;
    const { x, y, target } = pending;
    pending = null;
    const el =
      target instanceof Element ? target.closest<HTMLElement>(".spotlight") : null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${Math.round(x - rect.left)}px`);
    el.style.setProperty("--my", `${Math.round(y - rect.top)}px`);
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const now = performance.now();
    if (now - last < THROTTLE_MS && frame) return;
    last = now;
    pending = { x: event.clientX, y: event.clientY, target: event.target };
    if (!frame) frame = requestAnimationFrame(paint);
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  return () => {
    window.removeEventListener("pointermove", onMove);
    if (frame) cancelAnimationFrame(frame);
  };
}
