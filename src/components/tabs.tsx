import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  isInteractiveTarget,
  isSwipeCommitted,
  prefersReducedMotion,
  resolveSwipeAxis,
  useReducedMotion,
  useScrollEdges,
} from "@/lib/motion";
import { EdgeFades } from "@/components/hscroller";

export type TabItem = { id: string; label: string; content: ReactNode; icon?: ReactNode };

/**
 * Pestañas accesibles con indicador animado y swipe horizontal entre paneles:
 * - semántica completa (tablist/tab/tabpanel, aria-selected, aria-controls);
 * - el indicador (píldora con gradiente y resplandor) se desliza hacia la
 *   opción activa y la centra si el listado se desplaza;
 * - teclado: ← → Inicio Fin, con foco y orden de tabulación correctos;
 * - si no caben, el listado se desplaza de forma nativa y aparecen bordes
 *   difuminados solo cuando hay pestañas fuera de vista;
 * - táctil: swipe horizontal con eje bloqueado (proporción ≈ 1.2); nunca roba
 *   el scroll vertical ni gestos que empiezan sobre controles interactivos;
 * - los paneles entran/salen con desplazamiento corto + fundido (~210 ms) en la
 *   dirección del cambio, y siguen el dedo mientras dura el gesto.
 */
export function Tabs({
  tabs,
  initial,
  ariaLabel,
  className,
}: {
  tabs: TabItem[];
  initial?: number;
  ariaLabel: string;
  className?: string;
}) {
  const [active, setActive] = useState(() =>
    Math.min(Math.max(initial ?? 0, 0), Math.max(0, tabs.length - 1)),
  );
  const baseId = useId();
  const keyboardHintId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const reduced = useReducedMotion();
  const edges = useScrollEdges(listRef);
  // Dirección del último cambio: la entrada del panel va en consecuencia.
  const [dir, setDir] = useState<1 | -1>(1);
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const exitTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (exitTimer.current != null) window.clearTimeout(exitTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!reduced) return;
    if (exitTimer.current != null) window.clearTimeout(exitTimer.current);
    exitTimer.current = null;
    setOutgoing(null);
  }, [reduced]);

  const go = useCallback(
    (index: number) => {
      if (tabs.length === 0) return;
      const next = ((index % tabs.length) + tabs.length) % tabs.length;
      if (next === active) return;

      const direction: 1 | -1 = index >= active ? 1 : -1;
      setDir(direction);
      setActive(next);
      tabRefs.current[next]?.focus({ preventScroll: true });
      if (exitTimer.current != null) window.clearTimeout(exitTimer.current);
      if (reduced) {
        setOutgoing(null);
        exitTimer.current = null;
      } else {
        setOutgoing(active);
        exitTimer.current = window.setTimeout(() => {
          setOutgoing(null);
          exitTimer.current = null;
        }, 240);
      }
    },
    [active, reduced, tabs.length],
  );

  const measure = useCallback(() => {
    const list = listRef.current;
    const tab = tabRefs.current[active];
    if (!list || !tab) return;
    setIndicator({ left: tab.offsetLeft, width: tab.offsetWidth });
    // Mantiene visible la pestaña activa centrando el listado.
    const target = tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2;
    list.scrollTo({
      left: Math.max(0, target),
      behavior: reduced || prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [active, reduced]);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    for (const tab of tabRefs.current) if (tab) ro.observe(tab);
    return () => ro.disconnect();
  }, [measure]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const last = tabs.length - 1;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(active + 1);
      tabRefs.current[(active + 1) % tabs.length]?.focus();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(active - 1);
      tabRefs.current[(active + last) % tabs.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      go(0);
      tabRefs.current[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      go(last);
      tabRefs.current[last]?.focus();
    }
  };

  // ── Swipe horizontal entre paneles (solo táctil) ────────────────────────
  const swipe = useRef({
    id: -1,
    startX: 0,
    startY: 0,
    dx: 0,
    lastX: 0,
    lastAt: 0,
    velocity: 0,
    axis: null as "x" | "y" | null,
  });
  const [dragDx, setDragDx] = useState(0);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return; // con ratón hay pestañas y teclado
    if (isInteractiveTarget(event.target)) return;
    swipe.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      lastX: event.clientX,
      lastAt: event.timeStamp,
      velocity: 0,
      axis: null,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    if (s.id !== event.pointerId) return;
    const dx = event.clientX - s.startX;
    const dy = event.clientY - s.startY;
    if (s.axis === null) {
      const axis = resolveSwipeAxis(dx, dy);
      if (axis === null) return;
      s.axis = axis;
      if (axis === "x") {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* el navegador ya no permite capturar */
        }
      }
    }
    if (s.axis !== "x") return;
    const elapsed = Math.max(1, event.timeStamp - s.lastAt);
    s.velocity = (event.clientX - s.lastX) / elapsed;
    s.lastX = event.clientX;
    s.lastAt = event.timeStamp;
    s.dx = dx;

    // Resistencia leve en los extremos; también acompaña el gesto hacia atrás.
    const atStart = active === 0 && dx > 0;
    const atEnd = active === tabs.length - 1 && dx < 0;
    const raw = atStart || atEnd ? dx * 0.35 : dx;
    const limit = event.currentTarget.clientWidth;
    if (!reduced) setDragDx(Math.max(-limit, Math.min(limit, raw)));
  };

  const endSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    if (s.id !== event.pointerId) return;
    swipe.current.id = -1;
    if (s.axis === "x") {
      const delta = event.clientX - s.startX;
      const velocity = event.timeStamp - s.lastAt <= 100 ? s.velocity : 0;
      const threshold = Math.max(60, event.currentTarget.clientWidth * 0.22);
      if (isSwipeCommitted(delta, velocity, threshold)) {
        if (delta < 0) go(active + 1);
        else if (delta > 0) go(active - 1);
      }
    }
    setDragDx(0);
  };

  const dragging = !reduced && dragDx !== 0;
  if (tabs.length === 0) return null;

  const tabId = (index: number) => `${baseId}-tab-${index}`;
  const panelId = (index: number) => `${baseId}-panel-${index}`;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <div
          ref={listRef}
          role="tablist"
          aria-label={ariaLabel}
          aria-describedby={keyboardHintId}
          aria-orientation="horizontal"
          onKeyDown={onKeyDown}
          className="scrollbar-none glass relative flex gap-1 overflow-x-auto rounded-2xl border border-line p-1 shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]"
        >
          {indicator ? (
            <span
              aria-hidden
              className="absolute top-1 bottom-1 rounded-xl border border-accent-soft/35 bg-[linear-gradient(180deg,var(--color-raised-2),var(--color-raised))] shadow-[inset_0_1px_0_rgb(255_255_255/0.09),0_10px_24px_-16px_var(--color-accent)]"
              style={{
                left: indicator.left,
                width: indicator.width,
                transition: reduced
                  ? "none"
                  : "left 240ms cubic-bezier(0.2, 0, 0, 1), width 240ms cubic-bezier(0.2, 0, 0, 1)",
              }}
            />
          ) : null}
          {tabs.map((tab, index) => {
            const selected = index === active;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={tabId(index)}
                aria-selected={selected}
                aria-controls={panelId(index)}
                tabIndex={selected ? 0 : -1}
                onClick={() => go(index)}
                className={cn(
                  "press relative z-1 flex h-11 shrink-0 snap-start items-center gap-2 rounded-xl px-4 text-sm font-medium",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft",
                  selected ? "text-fg" : "text-muted hover:text-fg/80",
                )}
              >
                {tab.icon ? <span aria-hidden>{tab.icon}</span> : null}
                {tab.label}
                {/* Punto de selección: la opción activa no se reconoce solo por color */}
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full bg-accent transition-[scale,opacity] duration-200",
                    selected ? "scale-100 opacity-100" : "scale-0 opacity-0",
                  )}
                />
              </button>
            );
          })}
        </div>
        <EdgeFades edges={edges} fadeFrom="var(--color-bg)" className="rounded-2xl" />
        {edges.left || edges.right ? (
          <p aria-hidden className="mt-1.5 text-center text-[11px] text-muted md:hidden">
            Desliza o usa las flechas del teclado para cambiar de sección
          </p>
        ) : null}
        <span id={keyboardHintId} className="sr-only">
          Usa las flechas izquierda y derecha para cambiar de pestaña; Inicio y Fin llevan a la
          primera y a la última. También puedes recorrer la pestaña seleccionada y su contenido con
          Tab.
        </span>
      </div>
      <div
        className="touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
      >
        <div className="relative">
          <div
            className="grid"
            style={{
              transform: dragging ? `translateX(${dragDx}px)` : undefined,
              opacity: dragging ? 0.86 : undefined,
              transition: dragging ? "none" : reduced ? undefined : "opacity 200ms ease",
            }}
          >
            {tabs.map((tab, index) => {
              const selected = index === active;
              const exiting = index === outgoing && !selected;
              return (
                <div
                  key={tab.id}
                  role="tabpanel"
                  id={panelId(index)}
                  aria-labelledby={tabId(index)}
                  aria-hidden={!selected}
                  inert={!selected || undefined}
                  tabIndex={selected ? 0 : -1}
                  onAnimationEnd={(event) => {
                    if (event.target !== event.currentTarget || !exiting) return;
                    if (exitTimer.current != null) window.clearTimeout(exitTimer.current);
                    exitTimer.current = null;
                    setOutgoing((current) => (current === index ? null : current));
                  }}
                  className={cn(
                    "col-start-1 row-start-1 focus-visible:outline-none",
                    selected
                      ? cn(
                          "tab-panel-enter",
                          dir === 1 ? "tab-panel-enter-next" : "tab-panel-enter-prev",
                        )
                      : exiting
                        ? cn(
                            "tab-panel-exit",
                            dir === 1 ? "tab-panel-exit-prev" : "tab-panel-exit-next",
                          )
                        : "hidden",
                  )}
                >
                  {tab.content}
                </div>
              );
            })}
          </div>
          {/* Resplandor en el borde hacia el que arrastras: anticipa el cambio */}
          {dragging ? (
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-accent/25 to-transparent",
                dragDx < 0 ? "right-0 rotate-180" : "left-0",
              )}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
