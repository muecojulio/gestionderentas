import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Accordion } from "@/components/accordion";
import { ApartmentForm } from "@/components/apartment-form";
import { Tabs } from "@/components/tabs";
import { Button, ConfirmDialog, Field, TextInput, type ButtonStatus } from "@/components/ui";
import { downloadApartmentExcel } from "@/lib/excel-apartment";
import {
  applyIncrease,
  deleteApartment,
  listAdjustments,
  listHistory,
  saveApartment,
  vacateApartment,
} from "@/lib/rentals.functions";
import {
  DEPOSITO_LABEL,
  diasTexto,
  formatMoney,
  increaseDue,
  longDate,
  nextContractYear,
  pesosToCentavos,
  tenureLabel,
  type Apartment,
  type ApartmentInput,
  type RentAdjustment,
} from "@/lib/rentals.logic";
import { useActionStatus } from "@/lib/use-action-status";
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
  const exportAction = useActionStatus();
  const apt = portfolio.data?.apartments.find((item) => item.id === id);

  if (portfolio.isPending) {
    return (
      <div className="mx-auto max-w-xl space-y-6" aria-busy="true" aria-live="polite">
        <div className="skeleton aspect-video w-full" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-10 w-48" />
        </div>
        <div className="skeleton h-11 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }
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
        <div className="overflow-hidden rounded-xl border border-line">
          <img
            src={apt.foto}
            alt=""
            className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
          />
        </div>
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
          <Tabs
            ariaLabel="Secciones del departamento"
            tabs={[
              {
                id: "ficha",
                label: "Ficha",
                content: (
                  <div className="space-y-3">
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
                      {apt.notaServicios ? (
                        <p className="text-sm text-muted">{apt.notaServicios}</p>
                      ) : null}
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
                          <Row
                            label="Lleva rentando"
                            value={tenureLabel(apt.ingreso ?? apt.contratoInicio, today)}
                          />
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
                          {apt.depositoFecha ? (
                            <Row label="Dejó el depósito" value={longDate(apt.depositoFecha)} />
                          ) : null}
                          {apt.depositoNota ? (
                            <p className="text-sm text-muted">{apt.depositoNota}</p>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-sm text-muted">
                          Libre. Puedes registrar al siguiente inquilino.
                        </p>
                      )}
                    </section>

                    {apt.ocupado ? <IncreaseCard apt={apt} today={today} /> : null}
                  </div>
                ),
              },
              {
                id: "historial",
                label: "Historial",
                content: (
                  <div className="space-y-2">
                    {history.data && history.data.length > 0 ? (
                      <Accordion
                        title={`Estancias anteriores (${history.data.length})`}
                        defaultOpen={false}
                      >
                        <ul className="space-y-2">
                          {history.data.map((stay) => (
                            <li key={stay.id} className="rounded-xl border border-line px-4 py-3 text-sm">
                              <p>{stay.inquilino || "Sin nombre"}</p>
                              <p className="text-muted">
                                {stay.inicio ? longDate(stay.inicio) : "?"} —{" "}
                                {stay.fin ? longDate(stay.fin) : "?"} · {formatMoney(stay.rentaCentavos)}
                              </p>
                              <p className="text-muted">
                                Depósito{" "}
                                {stay.depositoCentavos == null
                                  ? "no registrado"
                                  : `${formatMoney(stay.depositoCentavos)} · ${
                                      stay.depositoEstado
                                        ? DEPOSITO_LABEL[stay.depositoEstado]
                                        : "en tu poder"
                                    }`}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </Accordion>
                    ) : (
                      <p className="text-sm text-muted">
                        Todavía no hay estancias anteriores en este departamento.
                      </p>
                    )}
                  </div>
                ),
              },
            ]}
          />

          <div className="flex flex-col gap-2">
            <Button onClick={() => setEditing(true)}>Editar datos</Button>
            <Button
              tone="quiet"
              status={exportAction.status}
              onClick={() =>
                void exportAction.run(async () => {
                  try {
                    await downloadApartmentExcel(id);
                    return true;
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "No se pudo crear el Excel.",
                    );
                    return false;
                  }
                })
              }
            >
              Exportar Excel
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

function IncreaseCard({ apt, today }: { apt: Apartment; today: string }) {
  const refresh = useRefreshRentals();
  const adjustments = useQuery({
    queryKey: ["adjustments", apt.id],
    queryFn: () => listAdjustments({ data: apt.id }),
  });
  const save = useActionStatus();
  const next = nextContractYear(apt, today);
  const due = increaseDue(apt, today);
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(due && due.daysUntil <= 0 ? due.date : today);
  const start = apt.ingreso ?? apt.contratoInicio;
  const mine = (adjustments.data ?? []).filter((row) => !start || row.vigenteDesde >= start);
  const endsFirst = Boolean(next && apt.contratoFin && apt.contratoFin < next.date);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    const centavos = pesosToCentavos(monto);
    if (centavos == null) {
      toast.error("Revisa el monto de la nueva renta.");
      return;
    }
    await save.run(async () => {
      try {
        const result = await applyIncrease({
          data: { apartmentId: apt.id, nuevoCentavos: centavos, vigenteDesde: fecha || today },
        });
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        setMonto("");
        refresh();
        toast.success("Renta actualizada");
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
        return false;
      }
    });
  }

  const headline = !next
    ? "Agrega el inicio del contrato o del ingreso para avisar cuando cumpla el año."
    : endsFirst
      ? `Este contrato vence el ${longDate(apt.contratoFin ?? "")}, antes de cumplir el año.`
      : due
        ? due.daysUntil > 0
          ? `En ${diasTexto(due.daysUntil)} cumple ${due.years} ${due.years === 1 ? "año" : "años"}.`
          : due.daysUntil === 0
            ? `Hoy cumple ${due.years} ${due.years === 1 ? "año" : "años"}.`
            : `Hace ${diasTexto(-due.daysUntil)} cumplió ${due.years} ${due.years === 1 ? "año" : "años"}.`
        : `El siguiente año es el ${longDate(next.date)}.`;

  return (
    <section
      className={
        due
          ? "space-y-3 rounded-xl border border-accent/40 bg-accent/10 p-4"
          : "space-y-3 rounded-xl border border-line bg-raised p-4"
      }
    >
      <h2 className="font-display text-2xl">Año de contrato</h2>
      <p className="text-sm text-muted">{headline}</p>
      <Row label="Renta actual" value={formatMoney(apt.rentaCentavos)} />
      {due ? (
        <form className="space-y-3" onSubmit={(event) => void onSave(event)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nueva renta" hint="Pesos">
              <TextInput
                inputMode="decimal"
                value={monto}
                onChange={(event) => setMonto(event.target.value)}
                placeholder="13000"
                required
              />
            </Field>
            <Field label="Desde" hint="Los cobros ya anotados no cambian">
              <TextInput
                type="date"
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                required
              />
            </Field>
          </div>
          <Button type="submit" status={save.status as ButtonStatus}>
            Guardar nueva renta
          </Button>
        </form>
      ) : null}
      {mine.length > 0 ? (
        <ul className="space-y-1">
          {mine.map((row: RentAdjustment) => (
            <li key={row.id} className="text-sm text-muted">
              {longDate(row.vigenteDesde)} · {formatMoney(row.anteriorCentavos)} →{" "}
              {formatMoney(row.nuevoCentavos)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
