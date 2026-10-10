import { useEffect, useState, type RefObject } from "react";

/** True cuando el usuario pidió movimiento reducido (menú del sistema). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** True en escritorio (ratón + hover): las acciones de swipe se muestran fijas. */
export function useHoverFine(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return fine;
}

/**
 * Centra un elemento dentro de un carril horizontal. El desplazamiento es
 * suave salvo que el usuario pida movimiento reducido (inmediato).
 */
export function centerInScroller(scroller: HTMLElement, el: HTMLElement, reduced: boolean): void {
  const left = el.offsetLeft - (scroller.clientWidth - el.offsetWidth) / 2;
  scroller.scrollTo({ left: Math.max(0, left), behavior: reduced ? "auto" : "smooth" });
}

/**
 * Elementos interactivos dentro de un gesto táctil: un swipe nunca debe
 * empezar sobre ellos (no robaría el gesto a botones, enlaces, campos…).
 */
const INTERACTIVE = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "label",
  "[role='button']",
  "[role='tab']",
  "[role='switch']",
  "[role='option']",
  "[role='checkbox']",
  "[role='menuitem']",
  "[data-no-swipe]",
].join(",");

export function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE));
}

/**
 * Decide el eje de un gesto táctil: horizontal solo cuando el desplazamiento
 * lateral supera claramente al vertical (proporción ≈ 1.2) y hay distancia
 * suficiente. Devuelve "x", "y" o null (aún sin decidir).
 */
export function resolveSwipeAxis(dx: number, dy: number, threshold = 8): "x" | "y" | null {
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return null;
  return Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
}

/**
 * Observa un carril horizontal y reporta si hay contenido fuera de vista a
 * cada lado. Los indicadores solo se muestran cuando realmente hay
 * desbordamiento y se actualizan mientras el usuario se desplaza.
 */
export function useScrollEdges(ref: RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setEdges({
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref]);
  return edges;
}
