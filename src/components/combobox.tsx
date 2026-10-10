import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Check, ChevronDown, Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { normName } from "@/lib/rentals.logic";
import { highlightMatch } from "@/lib/search-highlight";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Texto extra para la búsqueda (ignora mayúsculas y diacríticos). */
  keywords?: string;
  /** Texto secundario que se muestra debajo de la opción. */
  detail?: string;
};

/**
 * Combobox con búsqueda: filtra mientras se escribe (insensible a mayúsculas,
 * minúsculas y diacríticos) y resalta el trozo coincidente. Semántica completa
 * (combobox + listbox + option, aria-expanded/activedescendant/selected),
 * navegación con flechas ↑ ↓, Inicio/Fin, Enter para confirmar y Escape para
 * cerrar; la opción activa se mantiene visible, se anuncia cuántas
 * coincidencias hay, el mensaje cuando no hay ninguna es explícito, se cierra
 * al hacer clic fuera y conserva el foco.
 */
export function Combobox({
  label,
  placeholder = "Buscar…",
  options,
  onSelect,
  noResults = "Sin resultados",
  className,
}: {
  label: string;
  placeholder?: string;
  options: ComboboxOption[];
  onSelect: (value: string) => void;
  noResults?: string;
  className?: string;
}) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filtered = useMemo(() => {
    const q = normName(query);
    if (!q) return options;
    return options.filter(
      (option) =>
        normName(option.label).includes(q) ||
        (option.keywords ? normName(option.keywords).includes(q) : false),
    );
  }, [options, query]);

  // Cierra al hacer clic fuera; el foco vuelve al campo de forma predecible.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Mantiene visible la opción activa al navegar con el teclado.
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = listRef.current?.querySelectorAll<HTMLElement>("[role='option']")[activeIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const select = (value: string) => {
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
    onSelect(value);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(filtered.length ? 0 : -1);
        return;
      }
      if (filtered.length) setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length) setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      if (filtered.length) setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      if (filtered.length) setActiveIndex(filtered.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[activeIndex >= 0 ? activeIndex : 0];
      if (option) select(option.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    } else if (event.key === "Tab") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <span
          aria-hidden
          className="tile pointer-events-none absolute top-1/2 left-1.5 size-9 -translate-y-1/2 rounded-lg"
        >
          <Search size={16} />
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-label={label}
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="control h-12 pr-11 pl-12 text-base"
        />
        <ChevronDown
          size={18}
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted transition-transform duration-200",
            open && "rotate-180 text-accent",
          )}
        />
      </div>
      {/* Cuántas opciones quedan: se anuncia sin robar el foco. */}
      <p role="status" className="sr-only">
        {open
          ? filtered.length === 1
            ? "1 opción disponible"
            : `${filtered.length} opciones disponibles`
          : ""}
      </p>
      {open ? (
        <div className="card absolute z-30 mt-2 w-full overflow-hidden p-1 shadow-[0_30px_60px_-24px_rgb(0_0_0/0.9)] animate-in fade-in-0 zoom-in-95 duration-150">
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            className="scrollbar-none max-h-64 overflow-y-auto overscroll-contain"
          >
            {filtered.length === 0 ? (
              <li className="flex items-center gap-2.5 px-3 py-3 text-sm text-muted">
                <SearchX size={16} aria-hidden className="shrink-0" />
                {noResults}
              </li>
            ) : (
              filtered.map((option, index) => {
                const isActive = index === activeIndex;
                const hit = highlightMatch(option.label, query);
                return (
                  <li
                    key={option.value}
                    id={`${listId}-opt-${index}`}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault(); // conserva el foco en el campo
                      select(option.value);
                    }}
                    className={cn(
                      "relative flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                      isActive ? "bg-accent/16 text-fg" : "text-fg/90",
                    )}
                  >
                    {/* Marca de opción activa: no depende solo del color */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-1.5 bottom-1.5 -left-0.5 w-0.5 rounded-full bg-accent transition-[scale,opacity] duration-150",
                        isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {hit ? (
                          <>
                            {hit.before}
                            <mark className="rounded bg-accent/25 px-0.5 text-accent-soft">
                              {hit.hit}
                            </mark>
                            {hit.after}
                          </>
                        ) : (
                          option.label
                        )}
                      </span>
                      {option.detail ? (
                        <span className="block truncate text-xs text-muted">{option.detail}</span>
                      ) : null}
                    </span>
                    <Check
                      size={14}
                      aria-hidden
                      className={cn(
                        "shrink-0 text-accent transition-opacity duration-150",
                        isActive ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </li>
                );
              })
            )}
          </ul>
          {filtered.length > 0 ? (
            <p
              aria-hidden
              className="hidden items-center gap-3 border-t border-line-soft px-3 py-2 text-[11px] text-muted sm:flex"
            >
              <span>↑ ↓ moverte</span>
              <span>Enter abrir</span>
              <span>Esc cerrar</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
