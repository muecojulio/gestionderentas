import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  CalendarRange,
  ChartLine,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  Store,
  TriangleAlert,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { AnimatedCounter } from "@/components/animated-counter";
import { Reveal } from "@/components/reveal";
import { Badge, Card, SectionTitle } from "@/components/surface";
import { DataError } from "@/components/data-error";
import { IconButton, Toggle } from "@/components/ui";
// Rentas solo en MXN — sin conversión a USD
import { listMonth, setReceipt } from "@/lib/rentals.api";
import {
  diasTexto,
  formatMoney,
  monthTitle,
  periodInRange,
  shiftMonth,
} from "@/lib/rentals.logic";
import { useIncomeTimeline, useRefreshRentals, useRentals } from "@/lib/use-rentals";
import { useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { toneStyle, type Tone } from "@/lib/tones";

export const Route = createFileRoute("/ingresos")({ component: Ingresos });

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** Cifra compacta para la franja del panel (la moneda ya está etiquetada). */
function moneyShort(centavos: number): string {
  return formatMoney(centavos).replace(" MXN", "");
}

function Ingresos() {
  const { portfolio } = useRentals();
  const refresh = useRefreshRentals();
  const timelineQuery = useIncomeTimeline();
  const reduced = useReducedMotion();
  const [cursor, setCursor] = useState<{ anio: number; mes: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const anio = cursor?.anio ?? portfolio.data?.anio;
  const mes = cursor?.mes ?? portfolio.data?.mes;
  const month = useQuery({
    queryKey: ["month", anio, mes],
    queryFn: () => listMonth(anio as number, mes as number),
    enabled: anio != null && mes != null,
    // Conserva el mes anterior visible mientras llega el nuevo (sin parpadeo).
    placeholderData: keepPreviousData,
  });

  if (portfolio.isPending || anio == null || mes == null) {
    return (
      <div className="space-y-8" aria-busy="true" aria-live="polite">
        <div className="skeleton h-64 w-full" />
        <div className="skeleton h-56 w-full" />
        <div className="space-y-3">
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
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
  const today = portfolio.data.today;
  const atNow = anio === portfolio.data.anio && mes === portfolio.data.mes;
  const older = shiftMonth(anio, mes, -1);
  const newer = shiftMonth(anio, mes, 1);
  const canBack = periodInRange(older.anio, older.mes, today);
  const canForward = !atNow && periodInRange(newer.anio, newer.mes, today);
  const view = month.data?.ok ? month.data : null;
  const cobradoPct =
    view && view.esperado > 0 ? Math.min(100, Math.round((view.recibido / view.esperado) * 100)) : 0;
  const meterTone: Tone = cobradoPct >= 100 ? "sage" : cobradoPct >= 50 ? "amber" : "accent";
  const timeline = (timelineQuery.data ?? []).map((point) => ({
    ...point,
    label: `${MESES_CORTOS[point.mes - 1]} ${String(point.anio).slice(2)}`,
  }));
  const lateRows = (view?.rows ?? []).filter((row) => row.diasMora != null);
  // El tipo (depto/accesoria) viene de la cartera: la fila del mes no lo trae.
  const tipoById = new Map(portfolio.data.apartments.map((apt) => [apt.id, apt.tipo]));

  async function toggle(id: string, receivedNow: boolean) {
    setBusy(id);
    try {
      const result = await setReceipt({
        apartmentId: id,
        received: receivedNow,
        anio: anio ?? null,
        mes: mes ?? null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      refresh();
      toast.success(receivedNow ? "Renta anotada como recibida" : "Se quitó la marca de recibido");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo anotar el pago.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Mes en curso ───────────────────────────────────────────────── */}
      <Card hero beam spotlight={false} className="rise p-5 md:p-6">
        <span aria-hidden className="card-glow">
          <span className="absolute -top-20 -left-10 size-56 rounded-full bg-accent/18 blur-3xl" />
          <span className="absolute -right-16 -bottom-24 size-52 rounded-full bg-sage/10 blur-3xl" />
        </span>
        <div className="relative flex items-center justify-between gap-3">
          <IconButton
            label="Mes anterior"
            disabled={!canBack}
            onClick={() => setCursor(older)}
          >
            <ChevronLeft size={18} aria-hidden />
          </IconButton>
          <div className="min-w-0 text-center">
            <p className="truncate font-display text-2xl text-fg capitalize">
              {monthTitle(anio, mes)}
            </p>
            {atNow ? (
              <Badge tone="sage" dot className="mt-1">
                Mes en curso
              </Badge>
            ) : (
              <Badge tone="muted" className="mt-1">
                Mes pasado
              </Badge>
            )}
          </div>
          <IconButton
            label="Mes siguiente"
            disabled={!canForward}
            onClick={() => setCursor(newer)}
          >
            <ChevronRight size={18} aria-hidden />
          </IconButton>
        </div>

        <div className="relative mt-6">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-accent-soft uppercase">
            Esperado del mes
          </p>
          <h1 className="halo gradient-text mt-1 font-display text-5xl leading-none md:text-6xl">
            {view ? <AnimatedCounter value={view.esperado} format={(n) => formatMoney(n)} /> : "—"}
          </h1>
          <p className="mt-3 text-sm text-muted">
            {view ? (
              <>
                Anotado{" "}
                <strong className="font-semibold text-sage">{formatMoney(view.recibido)}</strong> ·
                por cobrar{" "}
                <strong className="font-semibold text-accent-soft">
                  {formatMoney(view.porCobrar)}
                </strong>
              </>
            ) : (
              "Cargando el mes…"
            )}
          </p>
        </div>

        {view ? (
          <div className="relative mt-5" style={toneStyle(meterTone)}>
            <div className="flex justify-between text-xs text-muted">
              <span>Cobrado del mes</span>
              <span className="num font-medium text-fg">{cobradoPct}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={view.esperado}
              aria-valuenow={view.recibido}
              aria-label={`Progreso de cobro: ${cobradoPct}%`}
              className="meter well mt-1.5 h-3 overflow-hidden rounded-full"
            >
              <span
                className="meter-fill block h-full rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${cobradoPct}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="relative mt-5 grid grid-cols-3 divide-x divide-line-soft border-t border-line-soft pt-4">
          <MiniStat
            label="Anotado"
            value={view ? moneyShort(view.recibido) : "—"}
            tone="sage"
            icon={<BadgeCheck size={14} aria-hidden />}
          />
          <MiniStat
            label="Por cobrar"
            value={view ? moneyShort(view.porCobrar) : "—"}
            tone="accent"
            icon={<HandCoins size={14} aria-hidden />}
          />
          <MiniStat
            label={`En ${portfolio.data.anio}`}
            value={moneyShort(portfolio.data.recibidoAnio)}
            tone="iris"
            icon={<CalendarRange size={14} aria-hidden />}
          />
        </div>
        <p className="relative mt-3 text-[11px] text-muted">
          Todas las rentas se cobran únicamente en pesos mexicanos (MXN).
        </p>
      </Card>

      {/* ── Últimos 12 meses ───────────────────────────────────────────── */}
      {timeline.length > 0 ? (
        <Card spotlight className="space-y-4 p-4 md:p-5">
          <SectionTitle
            eyebrow="Tendencia"
            title="Últimos 12 meses"
            detail="Lo que fuiste anotando como cobrado, mes con mes."
            icon={<ChartLine size={18} aria-hidden />}
          />
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
                <defs>
                  <linearGradient id="ingresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eda67c" stopOpacity={0.55} />
                    <stop offset="55%" stopColor="#d4784a" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#d4784a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#a5a296", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fill: "#a5a296", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(value) => `${Math.round(Number(value) / 100 / 1000)}k`}
                />
                <Tooltip
                  cursor={{ stroke: "#d4784a", strokeOpacity: 0.35, strokeWidth: 1 }}
                  isAnimationActive={!reduced}
                  contentStyle={{
                    background: "linear-gradient(178deg,#242821,#1c1f19)",
                    border: "1px solid #343930",
                    borderRadius: "0.9rem",
                    color: "#f4f1e9",
                    fontSize: 12,
                    boxShadow: "0 20px 40px -22px rgb(0 0 0 / 0.9)",
                  }}
                  formatter={(value) => [formatMoney(Number(value)), "Cobrado"]}
                  labelFormatter={(label) => String(label)}
                />
                <Area
                  type="monotone"
                  dataKey="centavos"
                  stroke="#eda67c"
                  strokeWidth={2.5}
                  fill="url(#ingresos)"
                  isAnimationActive={!reduced}
                  activeDot={{ r: 4, fill: "#eda67c", stroke: "#121410", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : null}

      {/* ── Rentas del mes ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionTitle
          eyebrow="Cobros"
          title={`Rentas de ${monthTitle(anio, mes)}`}
          detail={
            view && view.rows.length > 0
              ? `${view.rows.filter((row) => row.recibido).length} de ${view.rows.length} anotadas como recibidas`
              : undefined
          }
          icon={<Building2 size={18} aria-hidden />}
          tone={lateRows.length > 0 ? "crimson" : "sage"}
        />
        {month.isError || (month.data && !month.data.ok) ? (
          <p className="text-sm text-crimson">No se pudo abrir ese mes.</p>
        ) : null}
        {view && view.rows.length === 0 ? (
          <p className="well px-4 py-3 text-sm text-muted">Nadie debía renta en este mes.</p>
        ) : null}
        {view && view.rows.length > 0 ? (
          <ul className="space-y-2.5" aria-label="Rentas del mes">
            {view.rows.map((row, index) => {
              const tone: Tone = row.diasMora ? "crimson" : row.recibido ? "sage" : "accent";
              return (
                <li key={row.apartmentId}>
                  <Reveal index={index % 8}>
                    <Toggle
                      checked={row.recibido}
                      onCheckedChange={(value) => void toggle(row.apartmentId, value)}
                      disabled={busy === row.apartmentId}
                      tone={tone}
                      icon={
                        <span
                          aria-hidden
                          className="grid size-7 place-items-center rounded-lg bg-fg/6 text-muted"
                        >
                          {tipoById.get(row.apartmentId) === "accesoria" ? (
                            <Store size={14} />
                          ) : (
                            <Building2 size={14} />
                          )}
                        </span>
                      }
                      label={`${row.nombre} · ${formatMoney(row.rentaCentavos)}`}
                      hint={
                        busy === row.apartmentId ? (
                          "Guardando…"
                        ) : row.diasMora ? (
                          <span className="inline-flex items-center gap-1 text-crimson">
                            <TriangleAlert size={11} aria-hidden />
                            Lleva {diasTexto(row.diasMora)} sin pagar
                          </span>
                        ) : row.recibido ? (
                          <span className="inline-flex items-center gap-1 text-sage">
                            <BadgeCheck size={11} aria-hidden />
                            Marcado como recibido
                          </span>
                        ) : (
                          row.inquilino || "Sin anotar"
                        )
                      }
                    />
                  </Reveal>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

/** Cifra pequeña dentro del panel del mes. */
function MiniStat({
  label,
  value,
  icon,
  tone,
  className,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: Tone;
  className?: string;
}) {
  return (
    <div className={cn("px-3 first:pl-0 last:pr-0", className)}>
      <p
        className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase"
        style={toneStyle(tone)}
      >
        <span aria-hidden style={{ color: "var(--tone)" }}>
          {icon}
        </span>
        {label}
      </p>
      <p className="num mt-1 truncate font-display text-base leading-none text-fg" title={value}>
        {value}
      </p>
    </div>
  );
}
