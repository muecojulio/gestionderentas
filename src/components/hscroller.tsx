import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type UIEvent as ReactUIEvent,
} from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { centerInScroller, useReducedMotion, useScrollEdges } from "@/lib/motion";
import { toneStyle, TONE_BORDER, TONE_TEXT, type Tone } from "@/lib/tones";

/** Indicadores de desbordamiento (gradientes) para un carril horizontal. */
export function EdgeFades({
  edges,
  fadeFrom,
  className,
}: {
  edges: { left: boolean; right: boolean };
  /** Color del fondo que contiene al carril. */
  fadeFrom?: string;
  className?: string;
}) {
  const fadeStyle = fadeFrom ? ({ "--fade-from": fadeFrom } as CSSProperties) : undefined;
  return (
    <>
      <div
        aria-hidden
        className={cn("fade-edge left", edges.left && "on", className)}
        style={fadeStyle}
      />
      <div
        aria-hidden
        className={cn("fade-edge right", edges.right && "on", className)}
        style={fadeStyle}
      />
    </>
  );
}

/**
 * Carril horizontal nativo (scroll + momentum táctil + snap moderado). La
 * barra se oculta solo visualmente; los indicadores de desbordamiento
 * aparecen únicamente cuando hay contenido fuera de vista. El grupo es
 * accesible (`role="group"` + nombre) y usable sin gestos: cada opción es un
 * botón con foco visible.
 */
export function HScroller({
  label,
  children,
  className,
  fadeFrom,
  activeKey,
}: {
  /** Nombre accesible del grupo, p. ej. "Filtros" o "Categorías". */
  label: string;
  children: ReactNode;
  className?: string;
  /** Color de los indicadores de desbordamiento (fondo del contenedor). */
  fadeFrom?: string;
  /** Clave del elemento activo: se centra tras un cambio. */
  activeKey?: string;
}) {
  const hintId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(ref);
  const reduced = useReducedMotion();
  const pointer = useRef<{
    id: number;
    startX: number;
    startY: number;
    startLeft: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const suppressionTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (suppressionTimer.current != null) window.clearTimeout(suppressionTimer.current);
    },
    [],
  );

  // Centra la opción seleccionada tras un cambio (suave salvo movimiento reducido).
  useEffect(() => {
    if (activeKey == null) return;
    const scroller = ref.current;
    const el = scroller?.querySelector<HTMLElement>(`[data-key="${CSS.escape(activeKey)}"]`);
    if (scroller && el) centerInScroller(scroller, el, reduced);
  }, [activeKey, reduced]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (suppressionTimer.current != null) window.clearTimeout(suppressionTimer.current);
    suppressionTimer.current = null;
    suppressClick.current = false;
    pointer.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: event.currentTarget.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = pointer.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    if (
      Math.abs(event.clientX - gesture.startX) > 8 ||
      Math.abs(event.clientY - gesture.startY) > 8
    ) {
      gesture.moved = true;
    }
  };

  const onScroll = (event: ReactUIEvent<HTMLDivElement>) => {
    const gesture = pointer.current;
    if (gesture && Math.abs(event.currentTarget.scrollLeft - gesture.startLeft) > 6) {
      gesture.moved = true;
    }
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = pointer.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    pointer.current = null;
    if (!gesture.moved) return;
    suppressClick.current = true;
    suppressionTimer.current = window.setTimeout(() => {
      suppressClick.current = false;
      suppressionTimer.current = null;
    }, 450);
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    // El navegador conserva el scroll nativo; solo descartamos el clic que
    // algunos móviles emiten al soltar un carril después de arrastrarlo.
    if (!suppressClick.current || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
    if (suppressionTimer.current != null) window.clearTimeout(suppressionTimer.current);
    suppressionTimer.current = null;
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        role="group"
        aria-label={label}
        aria-describedby={hintId}
        data-no-swipe
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onScroll={onScroll}
        onClickCapture={onClickCapture}
        className="scrollbar-none flex snap-x snap-proximity items-center gap-2 overflow-x-auto py-2"
      >
        {children}
      </div>
      <EdgeFades edges={edges} fadeFrom={fadeFrom} />
      <span id={hintId} className="sr-only">
        Usa Tab para recorrer las opciones y Enter o Espacio para activarlas. Cuando hay más opciones,
        también puedes desplazar el carril horizontalmente.
      </span>
    </div>
  );
}

/**
 * Chip de filtro/selección: estado activo visible (gradiente + palomita, no
 * solo color), foco de teclado conservado y utilizable sin gestos. El contador
 * va en una insignia propia para que se lea de un vistazo.
 */
export function Chip({
  chipKey,
  active,
  onClick,
  children,
  className,
  tone = "accent",
  count,
  icon,
}: {
  chipKey: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  tone?: Tone;
  /** Contador opcional (p. ej. cuántas propiedades hay en ese filtro). */
  count?: number;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      data-key={chipKey}
      aria-pressed={active}
      onClick={onClick}
      style={toneStyle(tone)}
      className={cn(
        "press lift inline-flex h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-4 text-sm font-medium",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft",
        active ? "chip-on" : cn("chip-off", TONE_BORDER[tone]),
        className,
      )}
    >
      {active ? (
        <Check size={14} aria-hidden className="shrink-0 animate-in zoom-in-50 duration-200" />
      ) : icon ? (
        <span aria-hidden className={cn("shrink-0", TONE_TEXT[tone])}>
          {icon}
        </span>
      ) : null}
      {children}
      {count != null ? (
        <span
          className={cn(
            "num rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold",
            active ? "bg-accent-fg/20 text-accent-fg" : "bg-fg/8 text-muted",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
