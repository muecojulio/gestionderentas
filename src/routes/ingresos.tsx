import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { DataError } from "@/components/data-error";
import { Toggle } from "@/components/ui";
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

function Ingresos() {
  const { portfolio } = useRentals();
  const refresh = useRefreshRentals();
  const timelineQuery = useIncomeTimeline();
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
        <div className="space-y-3">
          <div className="skeleton h-11 w-full" />
          <div className="skeleton h-12 w-56" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="skeleton h-44 w-full" />
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
  const timeline = (timelineQuery.data ?? []).map((point) => ({
    ...point,
    label: `${MESES_CORTOS[point.mes - 1]} ${String(point.anio).slice(2)}`,
  }));

  async function toggle(id: string, receivedNow: boolean) {
    setBusy(id);
    try {
      const result = await setReceipt({ apartmentId: id, received: receivedNow, anio: anio ?? null, mes: mes ?? null });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo anotar el pago.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Mes anterior"
            disabled={!canBack}
            className="press grid size-11 place-items-center rounded-full border border-line disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setCursor(older)}
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-sm text-muted capitalize">{monthTitle(anio, mes)}</p>
          <button
            type="button"
            aria-label="Mes siguiente"
            disabled={!canForward}
            className="press grid size-11 place-items-center rounded-full border border-line disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setCursor(newer)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <h1 className="mt-4 font-display text-5xl leading-none">
          {view ? formatMoney(view.esperado) : "—"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {view
            ? `Anotado: ${formatMoney(view.recibido)}. Por cobrar: ${formatMoney(view.porCobrar)}.`
            : "Cargando el mes…"}
        </p>
        <p className="mt-1 text-sm text-muted">
          En {portfolio.data.anio} llevas registrado {formatMoney(portfolio.data.recibidoAnio)}.
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-raised/80 px-3 py-1.5 text-xs font-medium text-muted">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          Todas las rentas se cobran únicamente en pesos mexicanos (MXN)
        </p>
        {view ? (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted">
              <span>Cobrado del mes</span>
              <span>
                {formatMoney(view.recibido)} de {formatMoney(view.esperado)} · {cobradoPct}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={view.esperado}
              aria-valuenow={view.recibido}
              aria-label={`Progreso de cobro: ${cobradoPct}%`}
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${cobradoPct}%` }}
              />
            </div>
          </div>
        ) : null}
      </header>

      {timeline.length > 0 ? (
        <section className="space-y-2 rounded-xl border border-line bg-raised p-4">
          <h2 className="font-display text-2xl">Últimos 12 meses</h2>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="ingresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4784a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#d4784a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#9a978c", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fill: "#9a978c", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(value) => `${Math.round(Number(value) / 100 / 1000)}k MXN`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1c1f19",
                    border: "1px solid #31352c",
                    borderRadius: "0.75rem",
                    color: "#f3f0e8",
                    fontSize: 12,
                  }}
                  formatter={(value) => [formatMoney(Number(value)), "Cobrado"]}
                  labelFormatter={(label) => String(label)}
                />
                <Area
                  type="monotone"
                  dataKey="centavos"
                  stroke="#d4784a"
                  strokeWidth={2}
                  fill="url(#ingresos)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      {month.isError || (month.data && !month.data.ok) ? (
        <p className="text-sm text-muted">No se pudo abrir ese mes.</p>
      ) : null}
      {view && view.rows.length === 0 ? (
        <p className="text-sm text-muted">Nadie debía renta en este mes.</p>
      ) : null}
      {view && view.rows.length > 0 ? (
        <ul className="space-y-3" aria-label="Rentas del mes">
          {view.rows.map((row) => (
            <li key={row.apartmentId} className="rounded-xl border border-line bg-raised px-4 py-2">
              <Toggle
                checked={row.recibido}
                onCheckedChange={(value) => void toggle(row.apartmentId, value)}
                disabled={busy === row.apartmentId}
                label={`${row.nombre} · ${formatMoney(row.rentaCentavos)}`}
                hint={
                  busy === row.apartmentId
                    ? "Guardando…"
                    : row.diasMora
                      ? `Lleva ${diasTexto(row.diasMora)} sin pagar`
                      : row.recibido
                        ? "Marcado como recibido"
                        : row.inquilino
                          ? row.inquilino
                          : "Sin anotar"
                }
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
