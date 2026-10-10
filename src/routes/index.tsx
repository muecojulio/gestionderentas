import { createFileRoute, Link } from "@tanstack/react-router";
import { computeAlerts, formatMoney, monthTitle, tenureLabel } from "@/lib/rentals.logic";
import { useRentals } from "@/lib/use-rentals";
import { Button, Empty } from "@/components/ui";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { portfolio, holidays } = useRentals();
  if (portfolio.isPending) return <p className="text-muted">Cargando tus rentas…</p>;
  if (portfolio.isError || !portfolio.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">No se pudieron cargar los departamentos.</p>
        <Button tone="quiet" onClick={() => void portfolio.refetch()}>
          Reintentar
        </Button>
      </div>
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
      <header className="rise">
        <p className="text-sm text-muted capitalize">{monthTitle(anio, mes)}</p>
        <h1 className="mt-2 font-display text-5xl leading-none">{formatMoney(expected)}</h1>
        <p className="mt-2 text-sm text-muted">
          Por recibir este mes · {formatMoney(received)} ya anotado · {occupied.length} de{" "}
          {apartments.length} rentados
        </p>
      </header>

      {alerts.length > 0 ? (
        <section className="space-y-2">
          {alerts.map((alert) => (
            <Link
              key={alert.key}
              to="/depto/$id"
              params={{ id: alert.apartmentId }}
              className="press block rounded-xl border border-accent/40 bg-accent/10 px-4 py-3"
            >
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-sm text-muted">{alert.detail}</p>
            </Link>
          ))}
        </section>
      ) : null}

      {apartments.length === 0 ? (
        <Empty
          title="Todavía no hay departamentos"
          body="Agrega el primero con su foto, medidores y, si ya tiene inquilino, el contrato."
          action={
            <Link to="/nuevo">
              <Button>Agregar departamento</Button>
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {apartments.map((apt, index) => (
            <li key={apt.id} className="rise" style={{ animationDelay: `${index * 60}ms` }}>
              <Link
                to="/depto/$id"
                params={{ id: apt.id }}
                className="press block overflow-hidden rounded-xl border border-line bg-raised"
              >
                {apt.foto ? (
                  <img src={apt.foto} alt="" className="aspect-video w-full object-cover" />
                ) : (
                  <div className="aspect-video bg-bg" />
                )}
                <div className="space-y-1 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-2xl">{apt.nombre}</h2>
                    <span className="text-sm text-muted">{apt.ocupado ? "Rentado" : "Libre"}</span>
                  </div>
                  <p className="text-sm text-fg">
                    {apt.ocupado ? formatMoney(apt.rentaCentavos) : "Sin inquilino"}
                  </p>
                  <p className="text-sm text-muted">
                    {apt.ocupado
                      ? tenureLabel(apt.ingreso ?? apt.contratoInicio, today)
                      : apt.direccion || "Listo para un nuevo inquilino"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
