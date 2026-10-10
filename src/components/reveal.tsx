import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Entrada escalonada al hacer scroll: cada bloque aparece cuando entra en
 * pantalla (una sola vez) con un fundido + desplazamiento corto. Con
 * `prefers-reduced-motion` el CSS deja el contenido visible sin transición, y
 * aquí se marca como visto de inmediato por si el navegador no lo soporta.
 */
export function Reveal({
  children,
  className,
  as: Tag = "div",
  index = 0,
  rootMargin = "0px 0px -8% 0px",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Retardo escalonado (n × 55 ms) para listas de tarjetas. */
  index?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin, threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, shown]);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", shown && "in", className)}
      style={{ "--i": index } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
