import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { centerInScroller, useReducedMotion, useScrollEdges } from "@/lib/motion";

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
      <div aria-hidden className={cn("fade-edge left", edges.left && "on", className)} style={fadeStyle} />
      <div aria-hidden className={cn("fade-edge right", edges.right && "on", className)} style={fadeStyle} />
    </>
  );
}

/**
 * Carril horizontal nativo (scroll + momentum táctil + snap moderado). La
 * barra se oculta solo visualmente; los indicadores de desbordamiento
 * aparecen únicamente cuando hay contenido fuera de vista. El grupo es
 * accesible (`role="group"` + nombre).
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
    </div>
  );
}

/**
 * Chip de filtro/selección: estado activo visible (no solo por color),
 * foco de teclado conservado y utilizable sin gestos.
 */
export function Chip({
  chipKey,
  active,
  onClick,
  children,
  className,
}: {
  chipKey: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-key={chipKey}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "press lift h-11 shrink-0 snap-start rounded-full border px-4 text-sm font-medium",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active
          ? "border-accent bg-accent text-accent-fg shadow-md shadow-accent/20"
          : "border-line bg-raised text-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}
