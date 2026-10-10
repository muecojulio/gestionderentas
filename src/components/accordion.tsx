import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneStyle, type Tone } from "@/lib/tones";

/**
 * Panel plegable con apertura/cierre animado (sin saltos bruscos: transición
 * de `grid-template-rows` 0fr → 1fr) y estado accesible actualizado
 * (`aria-expanded` + `aria-controls`; el contenido oculto sale del orden de
 * foco con `inert`). La cabecera mide 56 px y tiene foco visible.
 */
export function Accordion({
  title,
  detail,
  icon,
  tone = "accent",
  defaultOpen = true,
  children,
  className,
}: {
  title: ReactNode;
  /** Línea secundaria opcional bajo el título. */
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <section
      className={cn("card spotlight overflow-hidden", className)}
      style={toneStyle(tone)}
    >
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((o) => !o)}
          className="press flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-soft"
        >
          {icon ? (
            <span aria-hidden className="tile size-9 rounded-lg">
              {icon}
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="block font-display text-2xl leading-tight text-fg">{title}</span>
            {detail ? <span className="mt-0.5 block text-xs text-muted">{detail}</span> : null}
          </span>
          <span
            aria-hidden
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,transform] duration-200",
              open
                ? "border-accent/45 bg-accent/18 text-accent"
                : "border-line bg-raised text-muted",
            )}
          >
            <ChevronDown size={16} className={cn("transition-transform duration-200", open && "rotate-180")} />
          </span>
        </button>
      </h3>
      <div
        id={contentId}
        role="region"
        aria-label={typeof title === "string" ? title : undefined}
        inert={!open || undefined}
        className={cn(
          "grid transition-[grid-template-rows] duration-250 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "px-4 pb-4 transition-opacity duration-200",
              open ? "opacity-100" : "opacity-0",
            )}
          >
            <div className="mb-3 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
