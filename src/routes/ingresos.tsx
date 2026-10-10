import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Toggle } from "@/components/ui";
import { setReceipt } from "@/lib/rentals.functions";
import { formatMoney, monthTitle } from "@/lib/rentals.logic";
import { useRefreshRentals, useRentals } from "@/lib/use-rentals";

export const Route = createFileRoute("/ingresos")({ component: Ingresos });

function Ingresos() {
  const { portfolio } = useRentals();
  const refresh = useRefreshRentals();
  const [busy, setBusy] = useState<string | null>(null);
  if (portfolio.isPending) return <p className="text-muted">Calculando ingresos…</p>;
  if (portfolio.isError || !portfolio.data) return <p className="text-muted">No se pudieron cargar.</p>;
  const { apartments, anio, mes, recibidoAnio } = portfolio.data;
  const occupied = apartments.filter((apt) => apt.ocupado);
  const expected = occupied.reduce((sum, apt) => sum + (apt.rentaCentavos ?? 0), 0);
  const received = occupied
    .filter((apt) => apt.recibido)
    .reduce((sum, apt) => sum + (apt.rentaCentavos ?? 0), 0);

  async function toggle(id: string, receivedNow: boolean) {
    setBusy(id);
    try {
      const result = await setReceipt({ data: { apartmentId: id, received: receivedNow } });
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
        <p className="text-sm text-muted capitalize">{monthTitle(anio, mes)}</p>
        <h1 className="mt-2 font-display text-5xl leading-none">{formatMoney(expected)}</h1>
        <p className="mt-2 text-sm text-muted">
          Recibes al mes si todos pagan. Anotado: {formatMoney(received)}. Por cobrar:{" "}
          {formatMoney(expected - received)}.
        </p>
        <p className="mt-1 text-sm text-muted">En {anio} llevas registrado {formatMoney(recibidoAnio)}.</p>
      </header>
      {occupied.length === 0 ? (
        <p className="text-sm text-muted">
          No hay departamentos rentados.{" "}
          <Link to="/nuevo" className="text-accent">
            Agrega uno
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {occupied.map((apt) => (
            <li key={apt.id} className="rounded-xl border border-line bg-raised px-4 py-2">
              <Toggle
                checked={apt.recibido}
                onCheckedChange={(value) => void toggle(apt.id, value)}
                label={`${apt.nombre} · ${formatMoney(apt.rentaCentavos)}`}
                hint={
                  busy === apt.id
                    ? "Guardando…"
                    : apt.recibido
                      ? "Marcado como recibido este mes"
                      : apt.diaPago
                        ? `Le toca el día ${apt.diaPago}`
                        : "Sin día de pago"
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
