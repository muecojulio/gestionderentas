import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
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
  const ref = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(ref);
  const reduced = useReducedMotion();

  // Centra la opción seleccionada tras un cambio (suave salvo movimiento reducido).
  useEffect(() => {
    if (activeKey == null) return;
    const scroller = ref.current;
    const el = scroller?.querySelector<HTMLElement>(`[data-key="${CSS.escape(activeKey)}"]`);
    if (scroller && el) centerInScroller(scroller, el, reduced);
  }, [activeKey, reduced]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        role="group"
        aria-label={label}
        className="scrollbar-none flex snap-x snap-proximity items-center gap-2 overflow-x-auto py-1"
      >
        {children}
      </div>
      <EdgeFades edges={edges} fadeFrom={fadeFrom} />
      {edges.left || edges.right ? (
        <span className="sr-only">Desliza para ver más opciones</span>
      ) : null}
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
