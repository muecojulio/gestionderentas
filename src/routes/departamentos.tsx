import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { downloadApartmentExcel } from "@/lib/excel-apartment";
import { formatMoney, rentMora, diasTexto } from "@/lib/rentals.logic";
import { useRentals } from "@/lib/use-rentals";
import { Button, Empty } from "@/components/ui";

export const Route = createFileRoute("/departamentos")({ component: Departamentos });

function Departamentos() {
  const { portfolio } = useRentals();
  const [busy, setBusy] = useState<string | null>(null);
  if (portfolio.isPending) return <p className="text-muted">Cargando departamentos…</p>;
  if (portfolio.isError || !portfolio.data) {
    return (
      <Button tone="quiet" onClick={() => void portfolio.refetch()}>
        Reintentar
      </Button>
    );
  }
  const { apartments, today } = portfolio.data;

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
      {apartments.length === 0 ? (
        <Empty
          title="Agrega el primero"
          body="La foto y los números de medidor se quedan aunque cambie el inquilino."
        />
      ) : (
        <ul className="space-y-2">
          {apartments.map((apt) => {
            const late = apt.ocupado ? rentMora(apt, today) : null;
            return (
              <li key={apt.id} className="flex items-center gap-2">
                <Link
                  to="/depto/$id"
                  params={{ id: apt.id }}
                  className="press flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-line bg-raised p-2"
                >
                  {apt.foto ? (
                    <img src={apt.foto} alt="" className="size-16 rounded-lg object-cover" />
                  ) : (
                    <span className="size-16 shrink-0 rounded-lg bg-bg" />
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
                <button
                  type="button"
                  aria-label={`Exportar Excel de ${apt.nombre}`}
                  disabled={busy === apt.id}
                  className="press grid size-11 shrink-0 place-items-center rounded-full border border-line disabled:opacity-50"
                  onClick={() => void onExport(apt.id)}
                >
                  <Download size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
