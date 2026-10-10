import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApartmentForm } from "@/components/apartment-form";
import { Button, ConfirmDialog } from "@/components/ui";
import { downloadApartmentExcel } from "@/lib/excel-apartment";
import { deleteApartment, listHistory, saveApartment, vacateApartment } from "@/lib/rentals.functions";
import { DEPOSITO_LABEL, formatMoney, longDate, tenureLabel, type ApartmentInput } from "@/lib/rentals.logic";
import { useRefreshRentals, useRentals } from "@/lib/use-rentals";

export const Route = createFileRoute("/depto/$id")({ component: Detail });

function Detail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const refresh = useRefreshRentals();
  const { portfolio } = useRentals();
  const history = useQuery({
    queryKey: ["history", id],
    queryFn: () => listHistory({ data: id }),
  });
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [vacateOpen, setVacateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const apt = portfolio.data?.apartments.find((item) => item.id === id);

  if (portfolio.isPending) return <p className="text-muted">Cargando ficha…</p>;
  if (!apt) {
    return (
      <div className="space-y-3">
        <p>No encontramos ese departamento.</p>
        <Link to="/departamentos" className="text-sm text-accent">
          Volver
        </Link>
      </div>
    );
  }

  async function onSubmit(value: ApartmentInput) {
    setPending(true);
    try {
      const result = await saveApartment({ data: value });
      if (!result.ok) {
        if ("code" in result && result.code === "blacklist") setWarning(result.error);
        else toast.error(result.error);
        return;
      }
      setWarning(null);
      setEditing(false);
      refresh();
      toast.success("Cambios guardados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  async function vacate() {
    setPending(true);
    try {
      const result = await vacateApartment({ data: id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setVacateOpen(false);
      refresh();
      toast.success("El inquilino salió. La foto y los medidores siguen aquí.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar.");
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      const result = await deleteApartment({ data: id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      refresh();
      await navigate({ to: "/departamentos" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    } finally {
      setPending(false);
    }
  }

  const today = portfolio.data?.today ?? "";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {apt.foto ? (
        <img src={apt.foto} alt="" className="aspect-video w-full rounded-xl object-cover" />
      ) : null}
      <div>
        <p className="text-sm text-muted">{apt.ocupado ? "Rentado" : "Libre"}</p>
        <h1 className="font-display text-4xl">{apt.nombre}</h1>
        {apt.direccion ? <p className="mt-1 text-sm text-muted">{apt.direccion}</p> : null}
      </div>

      {editing ? (
        <ApartmentForm
          initial={apt}
          pending={pending}
          warning={warning}
          onSubmit={(value) => void onSubmit(value)}
        />
      ) : (
        <>
          <section className="space-y-3 rounded-xl border border-line bg-raised p-4">
            <h2 className="font-display text-2xl">Ficha técnica</h2>
            <Row label="Medidor de luz" value={apt.medidorLuz || "Sin número"} />
            <Row label="Medidor de agua" value={apt.medidorAgua || "Sin número"} />
            <Row
              label="Luz"
              value={
                apt.luzDia
                  ? `Día ${apt.luzDia} · ${formatMoney(apt.luzCentavos)}`
                  : "Sin fecha de pago"
              }
            />
            <Row
              label="Agua"
              value={
                apt.aguaDia
                  ? `Día ${apt.aguaDia} · ${formatMoney(apt.aguaCentavos)}`
                  : "Sin fecha de pago"
              }
            />
            {apt.notaServicios ? <p className="text-sm text-muted">{apt.notaServicios}</p> : null}
          </section>

          <section className="space-y-3 rounded-xl border border-line bg-raised p-4">
            <h2 className="font-display text-2xl">Estancia</h2>
            {apt.ocupado ? (
              <>
                <Row label="Inquilino" value={apt.inquilino || "Sin nombre"} />
                <Row label="Teléfono" value={apt.telefono || "—"} />
                <Row label="Renta" value={formatMoney(apt.rentaCentavos)} />
                <Row label="Día de pago" value={apt.diaPago ? `Día ${apt.diaPago}` : "—"} />
                <Row label="Ingresó" value={apt.ingreso ? longDate(apt.ingreso) : "—"} />
                <Row label="Lleva rentando" value={tenureLabel(apt.ingreso ?? apt.contratoInicio, today)} />
                <Row
                  label="Contrato"
                  value={
                    apt.contratoInicio || apt.contratoFin
                      ? `${apt.contratoInicio ? longDate(apt.contratoInicio) : "?"} → ${
                          apt.contratoFin ? longDate(apt.contratoFin) : "?"
                        }`
                      : "Sin fechas"
                  }
                />
                {apt.notas ? <p className="text-sm text-muted">{apt.notas}</p> : null}
                <Row
                  label="Depósito"
                  value={
                    apt.depositoCentavos == null
                      ? "Sin depósito"
                      : `${formatMoney(apt.depositoCentavos)} · ${
                          apt.depositoEstado ? DEPOSITO_LABEL[apt.depositoEstado] : "En tu poder"
                        }`
                  }
                />
                {apt.depositoFecha ? <Row label="Dejó el depósito" value={longDate(apt.depositoFecha)} /> : null}
                {apt.depositoNota ? <p className="text-sm text-muted">{apt.depositoNota}</p> : null}
              </>
            ) : (
              <p className="text-sm text-muted">Libre. Puedes registrar al siguiente inquilino.</p>
            )}
          </section>

          {history.data && history.data.length > 0 ? (
            <section className="space-y-2">
              <h2 className="font-display text-2xl">Estancias anteriores</h2>
              <ul className="space-y-2">
                {history.data.map((stay) => (
                  <li key={stay.id} className="rounded-xl border border-line px-4 py-3 text-sm">
                    <p>{stay.inquilino || "Sin nombre"}</p>
                    <p className="text-muted">
                      {stay.inicio ? longDate(stay.inicio) : "?"} — {stay.fin ? longDate(stay.fin) : "?"} ·{" "}
                      {formatMoney(stay.rentaCentavos)}
                    </p>
                    <p className="text-muted">
                      Depósito{" "}
                      {stay.depositoCentavos == null
                        ? "no registrado"
                        : `${formatMoney(stay.depositoCentavos)} · ${
                            stay.depositoEstado ? DEPOSITO_LABEL[stay.depositoEstado] : "en tu poder"
                          }`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button onClick={() => setEditing(true)}>Editar datos</Button>
            <Button
              tone="quiet"
              disabled={exporting}
              onClick={() => {
                setExporting(true);
                void downloadApartmentExcel(id)
                  .catch((error: unknown) => {
                    toast.error(error instanceof Error ? error.message : "No se pudo crear el Excel.");
                  })
                  .finally(() => setExporting(false));
              }}
            >
              {exporting ? "Preparando Excel…" : "Exportar Excel"}
            </Button>
            {apt.ocupado ? (
              <Button tone="quiet" onClick={() => setVacateOpen(true)}>
                El inquilino salió
              </Button>
            ) : null}
            <Button tone="ghost" onClick={() => setDeleteOpen(true)}>
              Eliminar departamento
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={vacateOpen}
        onOpenChange={setVacateOpen}
        title="¿El inquilino ya salió?"
        body="Se borran su nombre, la renta, el contrato, el día de pago, las notas y los montos de luz y agua. El depósito queda en el historial de esta estancia. Se conservan la foto y los números de medidor."
        confirmLabel="Borrar datos del inquilino"
        pending={pending}
        onConfirm={() => void vacate()}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Eliminar este departamento?"
        body="Se borra la ficha completa, incluida la foto y los medidores. Esta acción no se deshace."
        confirmLabel="Eliminar"
        pending={pending}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
