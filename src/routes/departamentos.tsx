import { createFileRoute, Link } from "@tanstack/react-router";
import { formatMoney } from "@/lib/rentals.logic";
import { useRentals } from "@/lib/use-rentals";
import { Button, Empty } from "@/components/ui";

export const Route = createFileRoute("/departamentos")({ component: Departamentos });

function Departamentos() {
  const { portfolio } = useRentals();
  if (portfolio.isPending) return <p className="text-muted">Cargando departamentos…</p>;
  if (portfolio.isError || !portfolio.data) {
    return (
      <Button tone="quiet" onClick={() => void portfolio.refetch()}>
        Reintentar
      </Button>
    );
  }
  const { apartments } = portfolio.data;
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
          {apartments.map((apt) => (
            <li key={apt.id}>
              <Link
                to="/depto/$id"
                params={{ id: apt.id }}
                className="press flex items-center gap-3 rounded-xl border border-line bg-raised p-2"
              >
                {apt.foto ? (
                  <img src={apt.foto} alt="" className="size-16 rounded-lg object-cover" />
                ) : (
                  <span className="size-16 rounded-lg bg-bg" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{apt.nombre}</span>
                  <span className="block truncate text-sm text-muted">
                    {apt.ocupado ? apt.inquilino || "Rentado" : "Libre"}
                    {apt.ocupado ? ` · ${formatMoney(apt.rentaCentavos)}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
