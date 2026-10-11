import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Download,
  Hand,
  LogOut,
  Plus,
  Search,
  Store,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Chip, HScroller } from "@/components/hscroller";
import { Combobox } from "@/components/combobox";
import { Reveal } from "@/components/reveal";
import { Badge, SectionTitle } from "@/components/surface";
import { RowAction, SwipeableRow } from "@/components/swipeable";
import { DataError } from "@/components/data-error";
import { Button, ConfirmDialog, Empty } from "@/components/ui";
import { downloadApartmentExcel } from "@/lib/excel-apartment";
import { vacateApartment } from "@/lib/rentals.api";
import {
  formatMoney,
  rentMora,
  diasTexto,
  TIPO_LABEL,
  type Apartment,
  type PropertyTipo,
} from "@/lib/rentals.logic";
import { useRefreshRentals, useRentals } from "@/lib/use-rentals";
import { toneStyle, TONE_TEXT, type Tone } from "@/lib/tones";

export const Route = createFileRoute("/departamentos")({ component: Departamentos });

type Filter = "todos" | "rentados" | "libres" | "mora";
type TipoFilter = "todos" | PropertyTipo;

const FILTERS: { id: Filter; label: string; tone: Tone }[] = [
  { id: "todos", label: "Todos", tone: "accent" },
  { id: "rentados", label: "Rentados", tone: "sage" },
  { id: "libres", label: "Libres", tone: "azure" },
  { id: "mora", label: "Con mora", tone: "crimson" },
];

const TIPO_FILTERS: { id: TipoFilter; label: string; tone: Tone }[] = [
  { id: "todos", label: "Todos", tone: "iris" },
  { id: "departamento", label: "Departamentos", tone: "iris" },
  { id: "accesoria", label: "Accesorias", tone: "amber" },
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

function matchesTipo(apt: Apartment, tipo: TipoFilter): boolean {
  if (tipo === "todos") return true;
  return apt.tipo === tipo;
}

function Departamentos() {
  const { portfolio } = useRentals();
  const refresh = useRefreshRentals();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("todos");
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("todos");
  const [busy, setBusy] = useState<string | null>(null);
  // "El inquilino salió" directo desde la lista, sin entrar a la ficha.
  const [vacateTarget, setVacateTarget] = useState<Apartment | null>(null);
  const [vacatePending, setVacatePending] = useState(false);

  const options = useMemo(
    () =>
      (portfolio.data?.apartments ?? []).map((apt) => ({
        value: apt.id,
        label: apt.nombre,
        keywords: `${apt.direccion} ${apt.inquilino}`,
        detail: [apt.direccion, apt.ocupado ? apt.inquilino : "Libre"]
          .filter(Boolean)
          .join(" · "),
      })),
    [portfolio.data],
  );

  if (portfolio.isPending) {
    return (
      <div className="space-y-5" aria-busy="true" aria-live="polite">
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-12 w-full" />
        <div className="flex gap-2">
          <div className="skeleton h-11 w-24 rounded-full" />
          <div className="skeleton h-11 w-28 rounded-full" />
          <div className="skeleton h-11 w-24 rounded-full" />
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
  const visible = apartments.filter(
    (apt) => matches(apt, filter, today) && matchesTipo(apt, tipoFilter),
  );
  const counts: Record<Filter, number> = {
    todos: apartments.length,
    rentados: apartments.filter((apt) => apt.ocupado).length,
    libres: apartments.filter((apt) => !apt.ocupado).length,
    mora: apartments.filter((apt) => apt.ocupado && rentMora(apt, today) != null).length,
  };
  const tipoCounts: Record<TipoFilter, number> = {
    todos: apartments.length,
    departamento: apartments.filter((apt) => apt.tipo === "departamento").length,
    accesoria: apartments.filter((apt) => apt.tipo === "accesoria").length,
  };
  const filtering = filter !== "todos" || tipoFilter !== "todos";

  async function onExport(id: string) {
    setBusy(id);
    try {
      await downloadApartmentExcel(id);
      toast.success("Excel listo: revisa tus descargas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el Excel.");
    } finally {
      setBusy(null);
    }
  }

  /** Borra los datos del inquilino; la foto y los medidores se conservan. */
  async function confirmVacate() {
    if (!vacateTarget) return;
    const id = vacateTarget.id;
    setVacatePending(true);
    try {
      const result = await vacateApartment(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setVacateTarget(null);
      refresh();
      toast.success("El inquilino salió. La foto y los medidores siguen aquí.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar.");
    } finally {
      setVacatePending(false);
    }
  }

  const rowActions = (apt: Apartment) => (
    <>
      {apt.ocupado ? (
        <RowAction
          label="Salió"
          tone="iris"
          icon={<LogOut size={16} aria-hidden />}
          onClick={() => setVacateTarget(apt)}
        />
      ) : null}
      <RowAction
        label="Excel"
        tone="sage"
        icon={<Download size={16} aria-hidden />}
        busy={busy === apt.id}
        onClick={() => void onExport(apt.id)}
      />
    </>
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Cartera"
        title="Propiedades"
        detail={`${apartments.length} en total · ${tipoCounts.departamento} deptos · ${tipoCounts.accesoria} accesorias`}
        icon={<Building2 size={18} aria-hidden />}
        action={
          <Button asChild size="md">
            <Link to="/nuevo">
              <Plus size={16} aria-hidden />
              Nuevo
            </Link>
          </Button>
        }
      />

      <Combobox
        label="Buscar propiedad"
        placeholder="Buscar por nombre, dirección o inquilino…"
        options={options}
        onSelect={(id) => void navigate({ to: "/depto/$id", params: { id } })}
        noResults="No hay propiedades con ese nombre"
      />

      <div className="space-y-2.5">
        <HScroller label="Filtros por estado" activeKey={filter}>
          {FILTERS.map((item) => (
            <Chip
              key={item.id}
              chipKey={item.id}
              active={filter === item.id}
              tone={item.tone}
              count={counts[item.id]}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Chip>
          ))}
        </HScroller>
        <HScroller label="Filtros por tipo" activeKey={tipoFilter}>
          {TIPO_FILTERS.map((item) => (
            <Chip
              key={item.id}
              chipKey={item.id}
              active={tipoFilter === item.id}
              tone={item.tone}
              count={tipoCounts[item.id]}
              onClick={() => setTipoFilter(item.id)}
            >
              {item.label}
            </Chip>
          ))}
        </HScroller>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted">
        <Hand size={14} aria-hidden className="shrink-0 text-accent" />
        Desliza una propiedad hacia la izquierda (o pulsa ⋯) para marcar que el inquilino salió y
        exportar su Excel.
      </p>

      {apartments.length === 0 ? (
        <Empty
          title="Agrega el primero"
          body="Departamentos y accesorias comparten la misma ficha: foto, medidores y contrato. Elige el tipo al crear."
          icon={<Building2 size={28} strokeWidth={1.25} />}
          action={
            <Button asChild size="lg">
              <Link to="/nuevo">Agregar propiedad</Link>
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <Empty
          title="Nada por aquí"
          body="Ninguna propiedad coincide con este filtro. Prueba con otro o quita los filtros."
          icon={<Search size={26} strokeWidth={1.25} />}
          action={
            <Button
              tone="quiet"
              onClick={() => {
                setFilter("todos");
                setTipoFilter("todos");
              }}
            >
              Quitar filtros
            </Button>
          }
        />
      ) : (
        <>
          <p aria-live="polite" className="text-xs text-muted">
            {filtering
              ? `Mostrando ${visible.length} de ${apartments.length} propiedades`
              : `${apartments.length} propiedades`}
          </p>
          <ul className="space-y-2.5" aria-label="Propiedades">
            {visible.map((apt, index) => {
              const late = apt.ocupado ? rentMora(apt, today) : null;
              const tone: Tone = late ? "crimson" : apt.ocupado ? "sage" : "azure";
              return (
                <li key={apt.id}>
                  <Reveal index={index % 8}>
                    <SwipeableRow
                      actions={rowActions(apt)}
                      actionsLabel={`Acciones de ${apt.nombre}`}
                      swipeHandle
                    >
                      <Link
                        to="/depto/$id"
                        params={{ id: apt.id }}
                        className="press group flex min-w-0 flex-1 items-center gap-3 py-3 pr-1 pl-3"
                        style={toneStyle(tone)}
                      >
                        <span className="relative shrink-0">
                          {apt.foto ? (
                            <img
                              src={apt.foto}
                              alt=""
                              loading="lazy"
                              className="size-16 rounded-xl border border-line object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                            />
                          ) : (
                            <span
                              aria-hidden
                              className="photo-fallback grid size-16 place-items-center rounded-xl border border-line"
                            >
                              {apt.tipo === "accesoria" ? (
                                <Store size={22} className="text-muted" strokeWidth={1.4} />
                              ) : (
                                <Building2 size={22} className="text-muted" strokeWidth={1.4} />
                              )}
                            </span>
                          )}
                          {/* Punto de estado sobre la miniatura */}
                          <span
                            aria-hidden
                            className={
                              late
                                ? "absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-raised bg-crimson"
                                : apt.ocupado
                                  ? "absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-raised bg-sage"
                                  : "absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-raised bg-azure"
                            }
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-muted uppercase">
                            <span aria-hidden className={TONE_TEXT[tone]}>
                              {apt.tipo === "accesoria" ? (
                                <Store size={12} />
                              ) : (
                                <Building2 size={12} />
                              )}
                            </span>
                            <span className="truncate">{TIPO_LABEL[apt.tipo]}</span>
                          </span>
                          <span className="mt-0.5 block truncate font-display text-xl leading-tight text-fg">
                            {apt.nombre}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                            {late ? (
                              <Badge tone="crimson">
                                <TriangleAlert size={11} aria-hidden />
                                {diasTexto(late.days)} sin pagar
                              </Badge>
                            ) : apt.ocupado ? (
                              <>
                                <span className="truncate text-muted">
                                  {apt.inquilino || "Rentado"}
                                </span>
                                <span className="num font-medium text-accent-soft">
                                  {formatMoney(apt.rentaCentavos)}
                                </span>
                              </>
                            ) : (
                              <span className="truncate text-muted">
                                Libre{apt.direccion ? ` · ${apt.direccion}` : ""}
                              </span>
                            )}
                          </span>
                        </span>
                      </Link>
                    </SwipeableRow>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <ConfirmDialog
        open={vacateTarget != null}
        onOpenChange={(open) => {
          if (!open) setVacateTarget(null);
        }}
        title={vacateTarget ? `¿${vacateTarget.inquilino || "El inquilino"} ya salió?` : ""}
        body="Se borran su nombre, la renta, el contrato, el día de pago, las notas y los montos de luz y agua. El depósito queda en el historial de esa estancia. Se conservan la foto y los números de medidor."
        confirmLabel="Borrar datos del inquilino"
        pending={vacatePending}
        onConfirm={() => void confirmVacate()}
      />
    </div>
  );
}
