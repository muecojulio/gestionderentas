import { useEffect, useState, type RefObject } from "react";

/** Consulta segura para efectos puntuales además del estado reactivo del hook. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
 * Centra un elemento dentro de un carril horizontal. Usa posiciones reales
 * para que funcione aunque el carril tenga borde, relleno o wrappers. El
 * desplazamiento es suave salvo que el usuario pida movimiento reducido.
 */
export function centerInScroller(scroller: HTMLElement, el: HTMLElement, reduced: boolean): void {
  const scrollerRect = scroller.getBoundingClientRect();
  const itemRect = el.getBoundingClientRect();
  const left =
    scroller.scrollLeft +
    itemRect.left -
    scrollerRect.left -
    (scroller.clientWidth - itemRect.width) / 2;
  scroller.scrollTo({
    left: Math.max(0, left),
    behavior: reduced || prefersReducedMotion() ? "auto" : "smooth",
  });
}

/**
 * Elementos interactivos dentro de un gesto táctil: un swipe nunca debe
 * empezar sobre ellos (no robaría el gesto a botones, enlaces, campos,
 * comboboxes, controles personalizados ni mapas marcados explícitamente).
 */
const INTERACTIVE = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "iframe",
  "[role='application']",
  "[data-map]",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='switch']",
  "[role='combobox']",
  "[role='textbox']",
  "[role='option']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='menuitem']",
  "[role='gridcell']",
  "[role='treeitem']",
  "[contenteditable='true']",
  "[data-no-swipe]",
].join(",");

export function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE));
}

/**
 * Decide el eje de un gesto: horizontal solo cuando el desplazamiento lateral
 * supera claramente al vertical (proporción ≈ 1.2) y hay distancia suficiente.
 */
export function resolveSwipeAxis(dx: number, dy: number, threshold = 8): "x" | "y" | null {
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return null;
  return Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
}

/**
 * Confirma un swipe por distancia o por un flick breve en la misma dirección.
 * `velocity` se expresa en píxeles por milisegundo.
 */
export function isSwipeCommitted(
  delta: number,
  velocity: number,
  distanceThreshold: number,
  flickDistance = 32,
  flickVelocity = 0.55,
): boolean {
  const distance = Math.abs(delta);
  if (distance >= distanceThreshold) return true;
  return (
    distance >= flickDistance &&
    Math.sign(delta) === Math.sign(velocity) &&
    Math.abs(velocity) >= flickVelocity
  );
}

/**
 * Observa un carril horizontal y reporta si hay contenido fuera de vista a
 * cada lado. Actualiza al desplazarse, cambiar el tamaño o cambiar los hijos.
 */
export function useScrollEdges(ref: RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const element = ref.current;
    if (element == null) return;
    const scroller = element as HTMLElement;

    let frame = 0;
    const resize = new ResizeObserver(scheduleUpdate);
    const observed = new Set<Element>();
    const observeChildren = () => {
      for (const child of observed) {
        if (!scroller.contains(child)) {
          resize.unobserve(child);
          observed.delete(child);
        }
      }
      for (const child of Array.from(scroller.children)) {
        if (observed.has(child)) continue;
        observed.add(child);
        resize.observe(child);
      }
    };

    function scheduleUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const next = {
          left: scroller.scrollLeft > 4,
          right: scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4,
        };
        setEdges((current) =>
          current.left === next.left && current.right === next.right ? current : next,
        );
      });
    }

    observeChildren();
    resize.observe(scroller);
    const mutations = new MutationObserver(() => {
      observeChildren();
      scheduleUpdate();
    });
    mutations.observe(scroller, { childList: true });
    scroller.addEventListener("scroll", scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      scroller.removeEventListener("scroll", scheduleUpdate);
      mutations.disconnect();
      resize.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ref]);
  return edges;
}
