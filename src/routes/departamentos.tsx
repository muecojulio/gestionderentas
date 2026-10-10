import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Building2, Download } from "lucide-react";
import { toast } from "sonner";
import { Chip, HScroller } from "@/components/hscroller";
import { Combobox } from "@/components/combobox";
import { SwipeableRow } from "@/components/swipeable";
import { DataError } from "@/components/data-error";
import { Button, Empty } from "@/components/ui";
import { downloadApartmentExcel } from "@/lib/excel-apartment";
import { formatMoney, rentMora, diasTexto, type Apartment } from "@/lib/rentals.logic";
import { useRentals } from "@/lib/use-rentals";

export const Route = createFileRoute("/departamentos")({ component: Departamentos });

type Filter = "todos" | "rentados" | "libres" | "mora";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "rentados", label: "Rentados" },
  { id: "libres", label: "Libres" },
  { id: "mora", label: "Con mora" },
];

function matches(apt: Apartment, filter: Filter, today: string): boolean {
  switch (filter) {
    case "rentados":
      return apt.ocupado;
    case "libres":
      return !apt.ocupado;
    case "mora":
      return apt.ocupado && rentMora(apt, today) != null;
    default:
      return true;
  }
}

function Departamentos() {
  const { portfolio } = useRentals();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("todos");
  const [busy, setBusy] = useState<string | null>(null);

  const options = useMemo(
    () =>
      (portfolio.data?.apartments ?? []).map((apt) => ({
        value: apt.id,
        label: apt.nombre,
        keywords: `${apt.direccion} ${apt.inquilino}`,
      })),
    [portfolio.data],
  );

  if (portfolio.isPending) {
    return (
      <div className="space-y-5" aria-busy="true" aria-live="polite">
        <div className="flex items-end justify-between gap-3">
          <div className="space-y-2">
            <div className="skeleton h-10 w-44" />
            <div className="skeleton h-4 w-28" />
          </div>
          <div className="skeleton h-12 w-24" />
        </div>
        <div className="skeleton h-12 w-full" />
        <div className="flex gap-2">
          <div className="skeleton h-11 w-20 rounded-full" />
          <div className="skeleton h-11 w-24 rounded-full" />
          <div className="skeleton h-11 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
        </div>
      </div>
    );
  }
  if (portfolio.isError || !portfolio.data) {
    return (
      <DataError
        title="No se pudieron cargar los departamentos."
        error={portfolio.error}
        onRetry={() => void portfolio.refetch()}
      />
    );
  }
  const { apartments, today } = portfolio.data;
  const visible = apartments.filter((apt) => matches(apt, filter, today));
  const counts: Record<Filter, number> = {
    todos: apartments.length,
    rentados: apartments.filter((apt) => apt.ocupado).length,
    libres: apartments.filter((apt) => !apt.ocupado).length,
    mora: apartments.filter((apt) => apt.ocupado && rentMora(apt, today) != null).length,
  };

  async function onExport(id: string) {
    setBusy(id);
    try {
      await downloadApartmentExcel(id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el Excel.");
    } finally {
      setBusy(null);
    }
  }

  const exportAction = (apt: Apartment) => (
    <button
      type="button"
      aria-label={`Exportar Excel de ${apt.nombre}`}
      disabled={busy === apt.id}
      className="press flex h-full items-center gap-1.5 bg-accent px-4 text-sm font-medium text-accent-fg disabled:opacity-50"
      onClick={() => void onExport(apt.id)}
    >
      {busy === apt.id ? (
        <span className="size-4 animate-spin rounded-full border-2 border-accent-fg/40 border-t-accent-fg" aria-hidden />
      ) : (
        <Download size={16} aria-hidden />
      )}
      Excel
    </button>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Departamentos</h1>
          <p className="mt-1 text-sm text-muted">{apartments.length} en tu cartera</p>
        </div>
        <Link to="/nuevo">
          <Button>Nuevo</Button>
        </Link>
      </div>

      <Combobox
        label="Buscar departamento"
        placeholder="Buscar por nombre, dirección o inquilino…"
        options={options}
        onSelect={(id) => void navigate({ to: "/depto/$id", params: { id } })}
        noResults="No hay departamentos con ese nombre"
      />

      <HScroller label="Filtros" activeKey={filter}>
        {FILTERS.map((item) => (
          <Chip
            key={item.id}
            chipKey={item.id}
            active={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label} · {counts[item.id]}
          </Chip>
        ))}
      </HScroller>

      {apartments.length === 0 ? (
        <Empty
          title="Agrega el primero"
          body="La foto y los números de medidor se quedan aunque cambie el inquilino."
          icon={<Building2 size={28} strokeWidth={1.25} />}
        />
      ) : visible.length === 0 ? (
        <Empty
          title="Nada por aquí"
          body="Ningún departamento coincide con este filtro. Prueba con otro."
        />
      ) : (
        <ul className="space-y-2" aria-label="Departamentos">
          {visible.map((apt) => {
            const late = apt.ocupado ? rentMora(apt, today) : null;
            return (
              <li key={apt.id}>
                <SwipeableRow
                  actions={exportAction(apt)}
                  actionsLabel={`Acciones de ${apt.nombre}`}
                >
                  <Link
                    to="/depto/$id"
                    params={{ id: apt.id }}
                    className="press flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2 pl-2"
                  >
                    {apt.foto ? (
                      <img
                        src={apt.foto}
                        alt=""
                        loading="lazy"
                        className="size-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="size-16 shrink-0 rounded-lg bg-gradient-to-br from-accent/10 to-bg" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{apt.nombre}</span>
                      <span className="block truncate text-sm text-muted">
                        {apt.ocupado ? apt.inquilino || "Rentado" : "Libre"}
                        {apt.ocupado ? ` · ${formatMoney(apt.rentaCentavos)}` : ""}
                      </span>
                      {late ? (
                        <span className="block truncate text-sm text-accent">
                          Lleva {diasTexto(late.days)} sin pagar
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </SwipeableRow>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
