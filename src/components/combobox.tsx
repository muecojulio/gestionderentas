import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { normName } from "@/lib/rentals.logic";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Texto extra para la búsqueda (ignora mayúsculas y diacríticos). */
  keywords?: string;
};

/**
 * Combobox con búsqueda: filtra mientras se escribe (insensible a
 * mayúsculas, minúsculas y diacríticos), semántica completa (combobox +
 * listbox + option, aria-expanded/activedescendant/selected), navegación con
 * flechas ↑ ↓, Inicio/Fin, Enter para confirmar y Escape para cerrar; la
 * opción activa se mantiene visible, hay mensaje claro cuando no hay
 * coincidencias, se cierra al hacer clic fuera y conserva el foco.
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
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
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
          className="h-12 w-full rounded-xl border border-line bg-bg pl-9 pr-9 text-base text-fg outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted/70 focus:border-accent focus:shadow-[0_0_0_3px] focus:shadow-accent/25"
        />
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </div>
      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto overscroll-contain rounded-xl border border-line bg-raised p-1 shadow-xl"
        >
          {filtered.length === 0 ? (
            <li role="status" className="px-3 py-2 text-sm text-muted">
              {noResults}
            </li>
          ) : (
            filtered.map((option, index) => {
              const isActive = index === activeIndex;
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
                    "flex h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-sm",
                    isActive ? "bg-accent/15 text-fg" : "text-fg",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  <Check
                    size={14}
                    aria-hidden
                    className={cn("shrink-0 text-accent", !isActive && "opacity-0")}
                  />
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
