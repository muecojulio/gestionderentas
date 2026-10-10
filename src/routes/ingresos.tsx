import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Toggle } from "@/components/ui";
import { listMonth, setReceipt } from "@/lib/rentals.functions";
import { diasTexto, formatMoney, monthTitle, periodInRange, shiftMonth } from "@/lib/rentals.logic";
import { useRefreshRentals, useRentals } from "@/lib/use-rentals";

export const Route = createFileRoute("/ingresos")({ component: Ingresos });

function Ingresos() {
  const { portfolio } = useRentals();
  const refresh = useRefreshRentals();
  const [cursor, setCursor] = useState<{ anio: number; mes: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const anio = cursor?.anio ?? portfolio.data?.anio;
  const mes = cursor?.mes ?? portfolio.data?.mes;
  const month = useQuery({
    queryKey: ["month", anio, mes],
    queryFn: () => listMonth({ data: { anio: anio as number, mes: mes as number } }),
    enabled: anio != null && mes != null,
  });

  if (portfolio.isPending || anio == null || mes == null) {
    return <p className="text-muted">Calculando ingresos…</p>;
  }
  if (portfolio.isError || !portfolio.data) return <p className="text-muted">No se pudieron cargar.</p>;
  const today = portfolio.data.today;
  const atNow = anio === portfolio.data.anio && mes === portfolio.data.mes;
  const older = shiftMonth(anio, mes, -1);
  const newer = shiftMonth(anio, mes, 1);
  const canBack = periodInRange(older.anio, older.mes, today);
  const canForward = !atNow && periodInRange(newer.anio, newer.mes, today);
  const view = month.data?.ok ? month.data : null;

  async function toggle(id: string, receivedNow: boolean) {
    setBusy(id);
    try {
      const result = await setReceipt({ data: { apartmentId: id, received: receivedNow, anio, mes } });
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
            className="press grid size-11 place-items-center rounded-full border border-line disabled:opacity-40"
            onClick={() => setCursor(older)}
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-sm text-muted capitalize">{monthTitle(anio, mes)}</p>
          <button
            type="button"
            aria-label="Mes siguiente"
            disabled={!canForward}
            className="press grid size-11 place-items-center rounded-full border border-line disabled:opacity-40"
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
      </header>
      {month.isError || (month.data && !month.data.ok) ? (
        <p className="text-sm text-muted">No se pudo abrir ese mes.</p>
      ) : null}
      {view && view.rows.length === 0 ? (
        <p className="text-sm text-muted">Nadie debía renta en este mes.</p>
      ) : null}
      {view && view.rows.length > 0 ? (
        <ul className="space-y-3">
          {view.rows.map((row) => (
            <li key={row.apartmentId} className="rounded-xl border border-line bg-raised px-4 py-2">
              <Toggle
                checked={row.recibido}
                onCheckedChange={(value) => void toggle(row.apartmentId, value)}
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
