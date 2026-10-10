import { useEffect, useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Building2,
  CalendarDays,
  DoorOpen,
  Landmark,
  PiggyBank,
  Store,
  Wallet,
} from "lucide-react";
import { AnimatedCounter, ProgressRing } from "@/components/animated-counter";
import { EdgeFades } from "@/components/hscroller";
import { Reveal } from "@/components/reveal";
import { AlertCard } from "@/components/alert-card";
import { Badge, Card, IconTile, SectionTitle, StatTile } from "@/components/surface";
import { DataError } from "@/components/data-error";
import { Button, Empty } from "@/components/ui";
import {
  CONTRATO_AVISO_DIAS,
  activateNotifications,
  notifState,
  type NotifState,
} from "@/lib/notifications";
// Rentas solo en MXN — sin conversión a USD
import {
  computeAlerts,
  diasTexto,
  formatMoney,
  monthTitle,
  rentMora,
  TIPO_LABEL,
  tenureLabel,
} from "@/lib/rentals.logic";
import { useScrollEdges } from "@/lib/motion";
import { useRentals } from "@/lib/use-rentals";
import { cn } from "@/lib/utils";
import { toneStyle } from "@/lib/tones";

export const Route = createFileRoute("/")({
  component: Home,
});

/** En la franja del héroe no cabe el sufijo: la moneda ya está etiquetada arriba. */
function moneyShort(centavos: number): string {
  return formatMoney(centavos).replace(" MXN", "");
}

function Home() {
  const { portfolio, holidays } = useRentals();
  const listRef = useRef<HTMLUListElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const edges = useScrollEdges(listRef);
  const statsEdges = useScrollEdges(statsRef);

  if (portfolio.isPending) {
    return (
      <div className="space-y-8" aria-busy="true" aria-live="polite">
        <div className="skeleton h-72 w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="skeleton h-64" />
          <div className="skeleton h-64" />
        </div>
      </div>
    );
  }
  if (portfolio.isError || !portfolio.data) {
    return (
      <DataError
        title="No se pudieron cargar las propiedades."
        error={portfolio.error}
        onRetry={() => void portfolio.refetch()}
      />
    );
  }
  const { apartments, today, anio, mes } = portfolio.data;
  const occupied = apartments.filter((apt) => apt.ocupado);
  const free = apartments.length - occupied.length;
  const expected = occupied.reduce((sum, apt) => sum + (apt.rentaCentavos ?? 0), 0);
  const received = occupied
    .filter((apt) => apt.recibido)
    .reduce((sum, apt) => sum + (apt.rentaCentavos ?? 0), 0);
  const pending = Math.max(0, expected - received);
  const late = occupied.filter((apt) => rentMora(apt, today) != null);
  const alerts = computeAlerts(apartments, today, holidays.data ?? []);
  const deptos = apartments.filter((a) => a.tipo === "departamento").length;
  const accesorias = apartments.filter((a) => a.tipo === "accesoria").length;

  return (
    <div className="space-y-9">
      {/* ── Héroe: el mes de un vistazo ─────────────────────────────────── */}
      <Card hero beam spotlight={false} className="rise p-5 md:p-7">
        {/* Resplandor decorativo en la esquina, recortado a la tarjeta */}
        <span aria-hidden className="card-glow">
          <span className="absolute -top-24 -right-16 size-64 rounded-full bg-accent/20 blur-3xl" />
          <span className="absolute -bottom-28 -left-10 size-56 rounded-full bg-iris/12 blur-3xl" />
        </span>
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-accent-soft uppercase">
              <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-accent text-accent" />
              {monthTitle(anio, mes)}
            </p>
            <h1 className="halo gradient-text mt-3 font-display text-5xl leading-none md:text-6xl">
              <AnimatedCounter value={expected} format={(n) => formatMoney(n)} />
            </h1>
            <p className="mt-3 max-w-md text-sm text-muted">
              Es lo que deben sumar las rentas de este mes. Llevas{" "}
              <strong className="font-semibold text-sage">{formatMoney(received)}</strong> anotado
              {pending > 0 ? (
                <>
                  {" "}
                  y faltan{" "}
                  <strong className="font-semibold text-accent-soft">{formatMoney(pending)}</strong>
                </>
              ) : (
                ". Todo cobrado"
              )}
              .
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone="sage" dot>
                {occupied.length} rentados
              </Badge>
              <Badge tone="muted">{free} libres</Badge>
              <Badge tone="crimson">{late.length} con mora</Badge>
              <Badge tone="azure">MXN</Badge>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <ProgressRing
              value={received}
              max={expected}
              size={104}
              stroke={11}
              label={`Cobrado este mes: ${formatMoney(received)} de ${formatMoney(expected)}`}
            />
            <p className="text-[11px] tracking-wide text-muted uppercase">Cobrado</p>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-3 divide-x divide-line-soft border-t border-line-soft pt-4">
          <HeroStat
            label="Propiedades"
            value={apartments.length}
            hint={`${deptos} deptos · ${accesorias} accesorias`}
            icon={<Landmark size={15} aria-hidden />}
          />
          <HeroStat
            label="Por cobrar"
            value={moneyShort(pending)}
            hint={pending > 0 ? `${late.length} con días de mora` : "Nada pendiente"}
            icon={<Wallet size={15} aria-hidden />}
          />
          <HeroStat
            label="Avisos"
            value={alerts.length}
            hint={alerts.length > 0 ? "Toca revisarlos" : "Todo en orden"}
            icon={<BellRing size={15} aria-hidden />}
          />
        </div>
      </Card>

      <NotifPrompt occupied={occupied.length} />

      {/* ── Avisos ──────────────────────────────────────────────────────── */}
      {alerts.length > 0 ? (
        <section aria-label="Avisos" className="space-y-3">
          <SectionTitle
            eyebrow="Para hoy"
            title={`${alerts.length} ${alerts.length === 1 ? "aviso" : "avisos"}`}
            detail="Toca cualquiera para abrir la ficha de esa propiedad."
            icon={<BellRing size={18} aria-hidden />}
            tone="amber"
            action={
              <Link
                to="/avisos"
                className="press inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-soft"
              >
                Ver todos <ArrowRight size={14} aria-hidden />
              </Link>
            }
          />
          <ul className="space-y-2">
            {alerts.map((alert, index) => (
              <li key={alert.key}>
                <Reveal index={index}>
                  <AlertCard alert={alert} />
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── De un vistazo: carrusel en móvil, cuadrícula en escritorio ──── */}
      {apartments.length > 0 ? (
        <section className="space-y-3">
          <SectionTitle
            eyebrow="Resumen"
            title="De un vistazo"
            icon={<PiggyBank size={18} aria-hidden />}
            tone="sage"
          />
          <div className="relative">
            <div
              ref={statsRef}
              role="group"
              aria-label="Resumen del mes"
              className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:snap-none lg:grid-cols-4"
            >
              <StatTileWrap>
                <StatTile
                  label="Cobrado"
                  tone="sage"
                  icon={<Wallet size={15} aria-hidden />}
                  value={formatMoney(received)}
                  hint={`De ${formatMoney(expected)} esperados`}
                  className="h-full"
                />
              </StatTileWrap>
              <StatTileWrap>
                <StatTile
                  label="Por cobrar"
                  tone="accent"
                  icon={<CalendarDays size={15} aria-hidden />}
                  value={formatMoney(pending)}
                  hint={pending > 0 ? "Falta anotarlo" : "Mes completo"}
                  className="h-full"
                />
              </StatTileWrap>
              <StatTileWrap>
                <StatTile
                  label="Con mora"
                  tone="crimson"
                  icon={<AlertTriangle size={15} aria-hidden />}
                  value={late.length}
                  hint={
                    late.length > 0
                      ? late
                          .slice(0, 2)
                          .map((apt) => apt.nombre)
                          .join(", ") + (late.length > 2 ? "…" : "")
                      : "Nadie debe renta"
                  }
                  className="h-full"
                />
              </StatTileWrap>
              <StatTileWrap>
                <StatTile
                  label="Libres"
                  tone="azure"
                  icon={<DoorOpen size={15} aria-hidden />}
                  value={free}
                  hint={free > 0 ? "Listos para rentar" : "Todo ocupado"}
                  className="h-full"
                />
              </StatTileWrap>
            </div>
            <EdgeFades edges={statsEdges} className="sm:hidden" />
          </div>
        </section>
      ) : null}

      {/* ── Propiedades ─────────────────────────────────────────────────── */}
      {apartments.length === 0 ? (
        <Empty
          title="Todavía no hay propiedades"
          body="Agrega el primero con su foto, medidores y, si ya tiene inquilino, el contrato. Elige si es departamento o accesoria."
          icon={<Building2 size={28} strokeWidth={1.25} />}
          action={
            <Link to="/nuevo">
              <Button size="lg">Agregar propiedad</Button>
            </Link>
          }
        />
      ) : (
        <section className="space-y-3">
          <SectionTitle
            eyebrow="Cartera"
            title="Tus propiedades"
            detail="En el teléfono se deslizan de lado; en la computadora se ven todas."
            icon={<Building2 size={18} aria-hidden />}
            action={
              <Link
                to="/departamentos"
                className="press inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-soft"
              >
                Ver todas <ArrowRight size={14} aria-hidden />
              </Link>
            }
          />
          <div className="relative">
            {/* Carrusel con snap en móvil (asoma la siguiente tarjeta) y
                cuadrícula en pantallas grandes */}
            <ul
              ref={listRef}
              className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:snap-none xl:grid-cols-3"
            >
              {apartments.map((apt, index) => {
                const lateInfo = apt.ocupado ? rentMora(apt, today) : null;
                return (
                  <li
                    key={apt.id}
                    className="w-[84%] shrink-0 snap-center sm:w-auto"
                  >
                    <Reveal index={index % 6}>
                      <Link
                        to="/depto/$id"
                        params={{ id: apt.id }}
                        className="card card-hover spotlight press group block h-full overflow-hidden"
                        style={toneStyle(lateInfo ? "crimson" : apt.ocupado ? "sage" : "azure")}
                      >
                        {/* Foto o degradado con el tipo de propiedad */}
                        <div className="relative aspect-video overflow-hidden">
                          {apt.foto ? (
                            <img
                              src={apt.foto}
                              alt=""
                              loading="lazy"
                              className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                            />
                          ) : (
                            <span
                              aria-hidden
                              className="photo-fallback grid size-full place-items-center"
                            >
                              {apt.tipo === "accesoria" ? (
                                <Store size={34} className="text-muted" strokeWidth={1.2} />
                              ) : (
                                <Building2 size={34} className="text-muted" strokeWidth={1.2} />
                              )}
                            </span>
                          )}
                          {/* Velo inferior para que se lean las insignias */}
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg-deep/90 to-transparent"
                          />
                          <span className="absolute top-2.5 left-2.5 flex gap-1.5">
                            <Badge tone={apt.ocupado ? "sage" : "azure"} dot>
                              {apt.ocupado ? "Rentado" : "Libre"}
                            </Badge>
                          </span>
                          {lateInfo ? (
                            <span className="absolute top-2.5 right-2.5">
                              <Badge tone="crimson">
                                <AlertTriangle size={11} aria-hidden />
                                {diasTexto(lateInfo.days)} sin pagar
                              </Badge>
                            </span>
                          ) : null}
                          <span className="absolute bottom-2 left-3 flex items-center gap-1.5 text-[11px] tracking-wide text-fg/80 uppercase">
                            {apt.tipo === "accesoria" ? (
                              <Store size={11} aria-hidden />
                            ) : (
                              <Building2 size={11} aria-hidden />
                            )}
                            {TIPO_LABEL[apt.tipo]}
                          </span>
                        </div>

                        <div className="space-y-2 px-4 pt-3 pb-4">
                          <div className="flex items-baseline justify-between gap-3">
                            <h3 className="truncate font-display text-2xl leading-tight text-fg">
                              {apt.nombre}
                            </h3>
                            <span className="num shrink-0 font-display text-xl text-accent-soft">
                              {apt.ocupado ? formatMoney(apt.rentaCentavos) : "—"}
                            </span>
                          </div>
                          <p className="truncate text-sm text-muted">
                            {apt.ocupado
                              ? apt.inquilino || "Inquilino sin nombre"
                              : apt.direccion || "Listo para un nuevo inquilino"}
                          </p>
                          <div className="flex items-center justify-between gap-2 border-t border-line-soft pt-2.5 text-xs">
                            <span className="truncate text-muted">
                              {apt.ocupado
                                ? tenureLabel(apt.ingreso ?? apt.contratoInicio, today)
                                : apt.direccion
                                  ? "Sin inquilino"
                                  : "Sin contrato activo"}
                            </span>
                            {apt.ocupado ? (
                              <span
                                className={cn(
                                  "inline-flex shrink-0 items-center gap-1 font-medium",
                                  apt.recibido ? "text-sage" : "text-accent",
                                )}
                              >
                                <span
                                  aria-hidden
                                  className={cn(
                                    "size-1.5 rounded-full bg-current",
                                    apt.recibido && "pulse-dot",
                                  )}
                                />
                                {apt.recibido ? "Pagó" : "Por cobrar"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
            <EdgeFades edges={edges} className="sm:hidden" />
            <p className="mt-1 text-center text-[11px] text-muted sm:hidden" aria-hidden>
              Desliza para ver las demás
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

/** Cifra pequeña del héroe (propiedades / por cobrar / avisos). */
function HeroStat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <div className="px-3 first:pl-0 last:pr-0">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
        <span aria-hidden className="text-accent">
          {icon}
        </span>
        {label}
      </p>
      <p className="num mt-1 truncate font-display text-lg leading-none text-fg" title={String(value)}>
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] text-muted">{hint}</p>
    </div>
  );
}

/** Envoltura que hace de cada mosaico un elemento del carrusel en móvil. */
function StatTileWrap({ children }: { children: ReactNode }) {
  return (
    <div className="w-[72%] shrink-0 snap-center sm:w-auto">
      <Reveal>{children}</Reveal>
    </div>
  );
}

/**
 * Los avisos solo existen si el navegador dio permiso. Se ofrece aquí, a la
 * vista, la primera vez (y se explica cómo destrabarlos si quedaron bloqueados).
 */
function NotifPrompt({ occupied }: { occupied: number }) {
  const [state, setState] = useState<NotifState>("unsupported");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setState(notifState());
  }, []);
  if (occupied === 0 || (state !== "default" && state !== "blocked")) return null;

  async function activate() {
    setBusy(true);
    try {
      await activateNotifications();
      setState(notifState());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card spotlight className="rise flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <IconTile tone="amber" size={40}>
        <BellRing size={18} />
      </IconTile>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">Avisos en tu teléfono</p>
        <p className="mt-0.5 text-xs text-muted">
          {state === "blocked"
            ? "El navegador los bloqueó. En Avisos está cómo activarlos (en iPhone, con la app instalada)."
            : `Un día antes de cada renta y desde ${CONTRATO_AVISO_DIAS} días antes de que venza un contrato.`}
        </p>
      </div>
      {state === "default" ? (
        <Button
          tone="quiet"
          className="shrink-0"
          onClick={() => void activate()}
          status={busy ? "loading" : "idle"}
        >
          {busy ? "Un momento…" : "Activar avisos"}
        </Button>
      ) : (
        <Link to="/avisos" className="shrink-0">
          <Button tone="quiet">Ver avisos</Button>
        </Link>
      )}
    </Card>
  );
}
