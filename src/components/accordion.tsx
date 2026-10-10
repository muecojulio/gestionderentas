import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Panel plegable con apertura/cierre animado (sin saltos bruscos: transición
 * de `grid-template-rows` 0fr → 1fr) y estado accesible actualizado
 * (`aria-expanded` + `aria-controls`; el contenido oculto sale del orden de
 * foco con `inert`).
 */
export function Accordion({
  title,
  defaultOpen = true,
  children,
  className,
}: {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <section className={cn("overflow-hidden rounded-xl border border-line bg-raised", className)}>
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((o) => !o)}
          className="press flex h-14 w-full items-center justify-between gap-3 px-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="font-display text-2xl text-fg">{title}</span>
          <ChevronDown
            size={18}
            aria-hidden
            className={cn("shrink-0 text-muted transition-transform duration-200", open && "rotate-180")}
          />
        </button>
      </h3>
      <div
        id={contentId}
        role="region"
        aria-label={typeof title === "string" ? title : undefined}
        inert={!open || undefined}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
