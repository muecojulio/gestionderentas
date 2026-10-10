import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { isInteractiveTarget, resolveSwipeAxis, useHoverFine } from "@/lib/motion";

/**
 * Fila con acciones contextuales reveladas por swipe horizontal:
 * - eje bloqueado: solo se mueve cuando el gesto es claramente horizontal
 *   (proporción ≈ 1.2); el scroll vertical de la página lo conserva el navegador
 *   (`touch-action: pan-y`);
 * - el desplazamiento se limita al ancho del panel y se decide abrir/cerrar con
 *   un umbral razonable;
 * - tras un arrastre se suprime el clic para no activar la tarjeta;
 * - mientras las acciones están ocultas quedan fuera del orden de foco
 *   (`inert`); en escritorio se muestran directamente, sin depender del swipe;
 * - siempre hay un control visible (⋯) para abrir/cerrar las acciones.
 */
export function SwipeableRow({
  actions,
  children,
  className,
  actionsLabel = "Acciones",
}: {
  actions: ReactNode;
  children: ReactNode;
  className?: string;
  actionsLabel?: string;
}) {
  const fine = useHoverFine();
  const [open, setOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [actionWidth, setActionWidth] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const gesture = useRef({ id: -1, startX: 0, startY: 0, dx: 0, axis: null as "x" | "y" | null });

  // Mide el panel de acciones para limitar el desplazamiento.
  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const update = () => setActionWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fine]);

  // Cierra al pulsar fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!contentRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    if (isInteractiveTarget(event.target)) return; // no robar el gesto a controles
    gesture.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      axis: null,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g.id !== event.pointerId) return;
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;
    if (g.axis === null) {
      const axis = resolveSwipeAxis(dx, dy, 6);
      if (axis === null) return;
      g.axis = axis;
      if (axis === "x") {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* captura no disponible */
        }
      }
    }
    if (g.axis !== "x") return;
    g.dx = dx;
    setDragX(Math.max(-actionWidth, Math.min(0, dx)));
  };

  const endGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g.id !== event.pointerId) return;
    gesture.current.id = -1;
    if (g.axis === "x") {
      // Evita que el clic posterior al arrastre active la tarjeta o un control.
      suppressClick.current = Math.abs(g.dx) > 6;
      const threshold = Math.max(48, actionWidth * 0.4);
      setOpen(g.dx <= -threshold);
      setDragX(0);
    }
    void event;
  };

  const offset = open ? -actionWidth : dragX;

  const actionsPanel = (
    <div
      ref={actionsRef}
      className={cn(
        fine
          ? "flex shrink-0 items-stretch border-l border-line bg-bg"
          : "absolute inset-y-0 right-0 z-0 flex items-stretch",
      )}
      role="group"
      aria-label={actionsLabel}
      {...(fine ? {} : { inert: !open || undefined, "aria-hidden": !open || undefined })}
    >
      {actions}
    </div>
  );

  if (fine) {
    // Escritorio: las acciones se muestran directamente (sin depender del swipe).
    return (
      <div className={cn("flex items-stretch overflow-hidden rounded-xl border border-line bg-raised", className)}>
        <div ref={contentRef} className="min-w-0 flex-1">
          {children}
        </div>
        {actionsPanel}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-line bg-raised", className)}>
      {actionsPanel}
      <div
        ref={contentRef}
        className="relative z-10 flex touch-pan-y items-center bg-raised"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragX ? "none" : "transform 200ms ease-out",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          aria-label={actionsLabel}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="press grid size-11 shrink-0 place-items-center text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <MoreHorizontal size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
