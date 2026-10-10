import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BellRing,
  Building2,
  CalendarDays,
  Store,
  FileWarning,
  TrendingUp,
} from "lucide-react";
import { AnimatedCounter, ProgressRing } from "@/components/animated-counter";
import { EdgeFades } from "@/components/hscroller";
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

export const Route = createFileRoute("/")({
  component: Home,
});

const ALERT_ICON = {
  mora: AlertTriangle,
  renta: CalendarDays,
  contrato: FileWarning,
  incremento: TrendingUp,
} as const;

function Home() {
  const { portfolio, holidays } = useRentals();
  const listRef = useRef<HTMLUListElement>(null);
  const edges = useScrollEdges(listRef);

  if (portfolio.isPending) {
    return (
      <div className="space-y-8" aria-busy="true" aria-live="polite">
        <div className="space-y-3">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-12 w-56" />
          <div className="skeleton h-4 w-72" />
        </div>
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
  const expected = occupied.reduce((sum, apt) => sum + (apt.rentaCentavos ?? 0), 0);
  const received = occupied
    .filter((apt) => apt.recibido)
    .reduce((sum, apt) => sum + (apt.rentaCentavos ?? 0), 0);
  const alerts = computeAlerts(apartments, today, holidays.data ?? []);

  return (
    <div className="space-y-8">
      <header className="rise flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted capitalize">{monthTitle(anio, mes)}</p>
          <h1 className="mt-2 font-display text-5xl leading-none">
            <AnimatedCounter value={expected} format={(n) => formatMoney(n)} />
          </h1>
          <p className="mt-2 text-sm text-muted">
            Por recibir este mes · {formatMoney(received)} ya anotado · {occupied.length} de{" "}
            {apartments.length} rentados · {apartments.filter((a) => a.tipo === "departamento").length} deptos ·{" "}
            {apartments.filter((a) => a.tipo === "accesoria").length} accesorias
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-raised/80 px-3 py-1.5 text-xs font-medium text-muted">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Todas las rentas se cobran únicamente en pesos mexicanos (MXN)
          </p>
        </div>
        <ProgressRing
          value={received}
          max={expected}
          label={`Cobrado este mes: ${formatMoney(received)} de ${formatMoney(expected)}`}
        />
      </header>

      <NotifPrompt occupied={occupied.length} />

      {alerts.length > 0 ? (
        <section aria-label="Avisos" className="space-y-2">
          {alerts.map((alert, index) => {
            const Icon = ALERT_ICON[alert.kind];
            return (
              <Link
                key={alert.key}
                to="/depto/$id"
                params={{ id: alert.apartmentId }}
                className="press lift rise flex items-start gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <Icon size={16} aria-hidden className="mt-0.5 shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{alert.title}</span>
                  <span className="block text-sm text-muted">{alert.detail}</span>
                </span>
              </Link>
            );
          })}
        </section>
      ) : null}

      {apartments.length === 0 ? (
        <Empty
          title="Todavía no hay propiedades"
          body="Agrega el primero con su foto, medidores y, si ya tiene inquilino, el contrato. Elige si es departamento o accesoria."
          icon={<Building2 size={28} strokeWidth={1.25} />}
          action={
            <Link to="/nuevo">
              <Button>Agregar propiedad</Button>
            </Link>
          }
        />
      ) : (
        <div className="relative">
          {/* Carrusel con snap en móvil (asoma la siguiente tarjeta) y
              cuadrícula en pantallas grandes */}
          <ul
            ref={listRef}
            className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:snap-none"
          >
            {apartments.map((apt, index) => {
              const late = apt.ocupado ? rentMora(apt, today) : null;
              return (
                <li
                  key={apt.id}
                  className="rise w-[82%] shrink-0 snap-center sm:w-auto"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <Link
                    to="/depto/$id"
                    params={{ id: apt.id }}
                    className="press lift block h-full overflow-hidden rounded-xl border border-line bg-raised"
                  >
                    {apt.foto ? (
                      <img
                        src={apt.foto}
                        alt=""
                        loading="lazy"
                        className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-accent/10 via-raised to-bg" />
                    )}
                    <div className="space-y-1.5 px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <h2 className="font-display text-2xl">{apt.nombre}</h2>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2 py-0.5 text-xs",
                            apt.ocupado
                              ? "border-accent/40 bg-accent/10 text-accent"
                              : "border-line text-muted",
                          )}
                        >
                          {apt.ocupado ? "Rentado" : "Libre"}
                        </span>
                      </div>
                      <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted">
                        {apt.tipo === "accesoria" ? <Store size={10} aria-hidden /> : <Building2 size={10} aria-hidden />}
                        {TIPO_LABEL[apt.tipo]}
                      </p>
                      <p className="text-sm text-fg">
                        {apt.ocupado ? formatMoney(apt.rentaCentavos) : "Sin inquilino"}
                      </p>
                      {late ? (
                        <p className="text-sm text-accent">Lleva {diasTexto(late.days)} sin pagar</p>
                      ) : (
                        <p className="text-sm text-muted">
                          {apt.ocupado
                            ? tenureLabel(apt.ingreso ?? apt.contratoInicio, today)
                            : apt.direccion || "Listo para un nuevo inquilino"}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <EdgeFades edges={edges} className="sm:hidden" />
        </div>
      )}
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
    <section className="rise flex flex-col gap-3 rounded-xl border border-line bg-raised p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <BellRing size={15} aria-hidden className="text-accent" />
          Avisos en tu teléfono
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {state === "blocked"
            ? "El navegador los bloqueó. En Avisos está cómo activarlos (en iPhone, con la app instalada)."
            : `Un día antes de cada renta y desde ${CONTRATO_AVISO_DIAS} días antes de que venza un contrato.`}
        </p>
      </div>
      {state === "default" ? (
        <Button tone="quiet" className="shrink-0" onClick={() => void activate()} disabled={busy}>
          {busy ? "Un momento…" : "Activar avisos"}
        </Button>
      ) : (
        <Link to="/avisos" className="shrink-0">
          <Button tone="quiet">Ver avisos</Button>
        </Link>
      )}
    </section>
  );
}
