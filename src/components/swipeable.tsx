import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Loader2, MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isInteractiveTarget, resolveSwipeAxis, useHoverFine } from "@/lib/motion";
import { toneStyle, type Tone } from "@/lib/tones";

/** Superficie compartida por las filas deslizables y las tarjetas de lista. */
export const rowSurface = "row-surface relative overflow-hidden";

/**
 * Acción del panel que se revela al deslizar (o que queda fijo en escritorio).
 * Mide 44 px de alto, tiene spinner propio y su estado no depende del color.
 */
export function RowAction({
  label,
  onClick,
  tone = "accent",
  icon,
  busy = false,
  disabled = false,
}: {
  /** Nombre accesible completo, p. ej. "Exportar Excel de Depto 3". */
  label: string;
  onClick: () => void;
  tone?: Tone;
  icon?: ReactNode;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      style={toneStyle(tone)}
      className={cn(
        "action press flex h-full min-w-24 items-center justify-center gap-1.5 px-4 text-sm font-semibold",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-soft",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {busy ? (
        <Loader2 size={16} aria-hidden className="animate-spin" />
      ) : icon ? (
        <span aria-hidden>{icon}</span>
      ) : null}
      <span>{busy ? "Un momento…" : label}</span>
    </button>
  );
}

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
  };

  const offset = open ? -actionWidth : dragX;

  const actionsPanel = (
    <div
      ref={actionsRef}
      className={cn(
        "flex items-stretch bg-bg-deep/85",
        fine ? "shrink-0 border-l border-line" : "absolute inset-y-0 right-0 z-0",
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
      <div className={cn(rowSurface, "flex items-stretch", className)}>
        <div ref={contentRef} className="min-w-0 flex-1">
          {children}
        </div>
        {actionsPanel}
      </div>
    );
  }

  return (
    <div className={cn(rowSurface, className)}>
      {actionsPanel}
      <div
        ref={contentRef}
        className="relative z-1 flex touch-pan-y items-center bg-[linear-gradient(178deg,var(--color-raised-2),var(--color-raised)_62%,#191c16)]"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragX ? "none" : "transform 220ms cubic-bezier(0.2, 0, 0, 1)",
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
          aria-label={open ? `Cerrar ${actionsLabel}` : `Abrir ${actionsLabel}`}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "press grid size-11 shrink-0 place-items-center rounded-full",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft",
            open ? "text-accent" : "text-muted hover:text-fg",
          )}
        >
          {open ? (
            <X size={18} aria-hidden className="animate-in zoom-in-75 duration-150" />
          ) : (
            <MoreHorizontal size={18} aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
