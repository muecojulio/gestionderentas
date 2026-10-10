import { useState, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Accordion } from "@/components/accordion";
import { ApartmentForm } from "@/components/apartment-form";
import { Tabs } from "@/components/tabs";
import { Reveal } from "@/components/reveal";
import { Badge, Card, DataRow, IconTile, SectionTitle } from "@/components/surface";
import { Button, ConfirmDialog, Field, TextInput, type ButtonStatus } from "@/components/ui";
import { downloadApartmentExcel } from "@/lib/excel-apartment";
import {
  applyIncrease,
  deleteApartment,
  listAdjustments,
  listHistory,
  saveApartment,
  vacateApartment,
} from "@/lib/rentals.api";
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  Download,
  History,
  LogOut,
  Pencil,
  Store,
  Trash2,
  TriangleAlert,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  DEPOSITO_LABEL,
  TIPO_LABEL,
  diasTexto,
  formatMoney,
  increaseDue,
  longDate,
  nextContractYear,
  pesosToCentavos,
  rentMora,
  tenureLabel,
  type Apartment,
  type ApartmentInput,
  type RentAdjustment,
} from "@/lib/rentals.logic";
import { useActionStatus } from "@/lib/use-action-status";
import { useRefreshRentals, useRentals } from "@/lib/use-rentals";
import { toneStyle } from "@/lib/tones";

export const Route = createFileRoute("/depto/$id")({ component: Detail });

/** Los datos se cargan en el navegador (ver `use-rentals`). */
const browserOnly = typeof window !== "undefined";

function Detail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const refresh = useRefreshRentals();
  const { portfolio } = useRentals();
  const history = useQuery({
    queryKey: ["history", id],
    queryFn: () => listHistory(id),
    // Igual que el resto de los datos: se pide desde el navegador.
    enabled: browserOnly,
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
      <div className="mx-auto max-w-2xl space-y-6" aria-busy="true" aria-live="polite">
        <div className="skeleton aspect-video w-full" />
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }
  if (!apt) {
    return (
      <Card className="mx-auto max-w-md space-y-4 p-6 text-center">
        <IconTile tone="crimson" size={44} className="mx-auto">
          <TriangleAlert size={20} />
        </IconTile>
        <p className="font-display text-2xl text-fg">No encontramos esa propiedad</p>
        <p className="text-sm text-muted">Puede que se haya borrado o que el enlace sea antiguo.</p>
        <Link to="/departamentos" className="block">
          <Button tone="quiet" className="w-full">
            <ArrowLeft size={16} aria-hidden />
            Volver a la cartera
          </Button>
        </Link>
      </Card>
    );
  }

  async function onSubmit(value: ApartmentInput) {
    setPending(true);
    try {
      const result = await saveApartment(value);
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
      const result = await vacateApartment(id);
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
      const result = await deleteApartment(id);
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
  const late = apt.ocupado ? rentMora(apt, today) : null;
  const TipoIcon = apt.tipo === "accesoria" ? Store : Building2;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ── Portada ────────────────────────────────────────────────────── */}
      <Card hero beam spotlight={false} className="rise p-0">
        <div className="relative aspect-video overflow-hidden rounded-t-[inherit] sm:aspect-[21/9]">
          {apt.foto ? (
            <img src={apt.foto} alt="" className="size-full object-cover" />
          ) : (
            <span
              aria-hidden
              className="photo-fallback grid size-full place-items-center"
              style={toneStyle(late ? "crimson" : apt.ocupado ? "sage" : "azure")}
            >
              <TipoIcon size={46} className="text-muted" strokeWidth={1.1} />
            </span>
          )}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/45 to-transparent"
          />
          <span className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <Badge tone={apt.ocupado ? "sage" : "azure"} dot className="bg-bg-deep/70 backdrop-blur">
              {apt.ocupado ? "Rentado" : "Libre"}
            </Badge>
            <Badge tone="muted" className="bg-bg-deep/70 backdrop-blur">
              <TipoIcon size={11} aria-hidden />
              {TIPO_LABEL[apt.tipo]}
            </Badge>
          </span>
          {late ? (
            <span className="absolute top-3 right-3">
              <Badge tone="crimson" className="bg-bg-deep/70 backdrop-blur">
                <TriangleAlert size={11} aria-hidden />
                {diasTexto(late.days)} sin pagar
              </Badge>
            </span>
          ) : null}
          <span className="absolute inset-x-0 bottom-0 block p-4">
            <span className="block font-display text-3xl leading-tight text-fg md:text-4xl">
              {apt.nombre}
            </span>
            {apt.direccion ? (
              <span className="mt-0.5 block text-sm text-muted">{apt.direccion}</span>
            ) : null}
          </span>
        </div>

        {!editing ? (
          <span className="grid grid-cols-2 divide-x divide-line-soft border-t border-line-soft sm:grid-cols-4">
            <QuickFact
              label="Renta"
              value={apt.ocupado ? formatMoney(apt.rentaCentavos) : "—"}
              tone="accent"
              icon={<Wallet size={13} aria-hidden />}
            />
            <QuickFact
              label="Día de pago"
              value={apt.ocupado && apt.diaPago ? `Día ${apt.diaPago}` : "—"}
              tone="amber"
            />
            <QuickFact
              label="Lleva"
              value={apt.ocupado ? tenureLabel(apt.ingreso ?? apt.contratoInicio, today) : "—"}
              tone="iris"
            />
            <QuickFact
              label="Depósito"
              value={
                apt.depositoCentavos == null ? "Sin registro" : formatMoney(apt.depositoCentavos)
              }
              tone="sage"
            />
          </span>
        ) : null}
      </Card>

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
                icon: <ClipboardList size={15} />,
                content: (
                  <div className="space-y-3">
                    <Reveal>
                      <Card spotlight className="p-4">
                        <SectionTitle
                          eyebrow="Se conserva aunque salga el inquilino"
                          title="Ficha técnica"
                          icon={<Building2 size={18} aria-hidden />}
                          tone="amber"
                          className="mb-2"
                        />
                        <DataRow label="Medidor de luz" value={apt.medidorLuz || "Sin número"} />
                        <DataRow label="Medidor de agua" value={apt.medidorAgua || "Sin número"} />
                        <DataRow
                          label="Luz"
                          tone="amber"
                          value={
                            apt.luzDia
                              ? `Día ${apt.luzDia} · ${formatMoney(apt.luzCentavos)}`
                              : "Sin fecha de pago"
                          }
                        />
                        <DataRow
                          label="Agua"
                          tone="azure"
                          value={
                            apt.aguaDia
                              ? `Día ${apt.aguaDia} · ${formatMoney(apt.aguaCentavos)}`
                              : "Sin fecha de pago"
                          }
                        />
                        {apt.notaServicios ? (
                          <p className="well mt-3 px-3 py-2 text-sm text-muted">
                            {apt.notaServicios}
                          </p>
                        ) : null}
                      </Card>
                    </Reveal>

                    <Reveal index={1}>
                      <Card spotlight className="p-4">
                        <SectionTitle
                          eyebrow={apt.ocupado ? "Estancia en curso" : "Sin estancia activa"}
                          title="Inquilino y contrato"
                          icon={<ClipboardList size={18} aria-hidden />}
                          tone={apt.ocupado ? "sage" : "azure"}
                          className="mb-2"
                        />
                        {apt.ocupado ? (
                          <>
                            <DataRow
                              label="Inquilino"
                              value={apt.inquilino || "Sin nombre"}
                              emphasis
                            />
                            <DataRow label="Teléfono" value={apt.telefono || "—"} />
                            <DataRow
                              label="Renta"
                              value={formatMoney(apt.rentaCentavos)}
                              tone="accent"
                              emphasis
                            />
                            <DataRow
                              label="Día de pago"
                              value={apt.diaPago ? `Día ${apt.diaPago}` : "—"}
                            />
                            <DataRow
                              label="Ingresó"
                              value={apt.ingreso ? longDate(apt.ingreso) : "—"}
                            />
                            <DataRow
                              label="Lleva rentando"
                              value={tenureLabel(apt.ingreso ?? apt.contratoInicio, today)}
                              tone="iris"
                            />
                            <DataRow
                              label="Contrato"
                              value={
                                apt.contratoInicio || apt.contratoFin
                                  ? `${apt.contratoInicio ? longDate(apt.contratoInicio) : "?"} → ${
                                      apt.contratoFin ? longDate(apt.contratoFin) : "?"
                                    }`
                                  : "Sin fechas"
                              }
                            />
                            {apt.notas ? (
                              <p className="well mt-3 px-3 py-2 text-sm text-muted">{apt.notas}</p>
                            ) : null}
                            <DataRow
                              label="Depósito"
                              tone="sage"
                              value={
                                apt.depositoCentavos == null
                                  ? "Sin depósito"
                                  : `${formatMoney(apt.depositoCentavos)} · ${
                                      apt.depositoEstado
                                        ? DEPOSITO_LABEL[apt.depositoEstado]
                                        : "En tu poder"
                                    }`
                              }
                            />
                            {apt.depositoFecha ? (
                              <DataRow
                                label="Dejó el depósito"
                                value={longDate(apt.depositoFecha)}
                              />
                            ) : null}
                            {apt.depositoNota ? (
                              <p className="well mt-3 px-3 py-2 text-sm text-muted">
                                {apt.depositoNota}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-sm text-muted">
                            Libre. Puedes registrar al siguiente inquilino con{" "}
                            <strong className="font-medium text-fg">Editar datos</strong>: la foto y
                            los medidores siguen aquí.
                          </p>
                        )}
                      </Card>
                    </Reveal>

                    {apt.ocupado ? (
                      <Reveal index={2}>
                        <IncreaseCard apt={apt} today={today} />
                      </Reveal>
                    ) : null}
                  </div>
                ),
              },
              {
                id: "historial",
                label: "Historial",
                icon: <History size={15} />,
                content: (
                  <div className="space-y-3">
                    {history.isPending ? (
                      <div className="space-y-2" aria-busy="true" aria-live="polite">
                        <div className="skeleton h-14 w-full" />
                        <div className="skeleton h-24 w-full" />
                      </div>
                    ) : history.data && history.data.length > 0 ? (
                      <Accordion
                        title={`Estancias anteriores (${history.data.length})`}
                        detail="Quién rentó aquí, cuánto pagó y qué pasó con su depósito."
                        icon={<History size={18} aria-hidden />}
                        tone="iris"
                        defaultOpen
                      >
                        <ul className="space-y-2">
                          {history.data.map((stay, index) => (
                            <li key={stay.id} className="well px-4 py-3 text-sm">
                              <p className="flex items-center gap-2 font-medium text-fg">
                                <span aria-hidden className="num text-xs text-muted">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                {stay.inquilino || "Sin nombre"}
                              </p>
                              <p className="mt-1 text-muted">
                                {stay.inicio ? longDate(stay.inicio) : "?"} —{" "}
                                {stay.fin ? longDate(stay.fin) : "?"} ·{" "}
                                <span className="num text-accent-soft">
                                  {formatMoney(stay.rentaCentavos)}
                                </span>
                              </p>
                              <p className="mt-0.5 text-muted">
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
                      <Card className="p-5 text-center">
                        <IconTile tone="iris" size={44} className="mx-auto">
                          <History size={20} />
                        </IconTile>
                        <p className="mt-3 font-display text-xl text-fg">Sin estancias anteriores</p>
                        <p className="mt-1 text-sm text-muted">
                          Cuando alguien salga, su estancia se guardará aquí con su renta y su
                          depósito.
                        </p>
                      </Card>
                    )}
                  </div>
                ),
              },
            ]}
          />

          <Card spotlight className="space-y-2 p-3">
            <Button onClick={() => setEditing(true)} className="w-full">
              <Pencil size={16} aria-hidden />
              Editar datos
            </Button>
            <div className="grid gap-2 sm:grid-cols-2">
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
                <Download size={16} aria-hidden />
                Exportar Excel
              </Button>
              {apt.ocupado ? (
                <Button tone="quiet" onClick={() => setVacateOpen(true)}>
                  <LogOut size={16} aria-hidden />
                  El inquilino salió
                </Button>
              ) : null}
            </div>
            <Button tone="danger" onClick={() => setDeleteOpen(true)} className="w-full">
              <Trash2 size={16} aria-hidden />
              Eliminar {TIPO_LABEL[apt.tipo].toLowerCase()}
            </Button>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={vacateOpen}
        onOpenChange={setVacateOpen}
        title="¿El inquilino ya salió?"
        body="Se borran su nombre, la renta, el contrato, el día de pago, las notas y los montos de luz y agua. El depósito queda en el historial de esa estancia. Se conservan la foto y los números de medidor."
        confirmLabel="Borrar datos del inquilino"
        pending={pending}
        onConfirm={() => void vacate()}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar ${TIPO_LABEL[apt.tipo].toLowerCase()}?`}
        body="Se borra la ficha completa, incluida la foto y los medidores. Esta acción no se deshace."
        confirmLabel="Eliminar"
        pending={pending}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

/** Dato rápido de la portada. */
function QuickFact({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "accent" | "sage" | "amber" | "iris";
  icon?: ReactNode;
}) {
  return (
    <span className="block px-3 py-3" style={toneStyle(tone)}>
      <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
        {icon ? (
          <span aria-hidden style={{ color: "var(--tone)" }}>
            {icon}
          </span>
        ) : null}
        {label}
      </span>
      <span className="mt-1 block truncate font-display text-base text-fg" title={value}>
        {value}
      </span>
    </span>
  );
}

function IncreaseCard({ apt, today }: { apt: Apartment; today: string }) {
  const refresh = useRefreshRentals();
  const adjustments = useQuery({
    queryKey: ["adjustments", apt.id],
    queryFn: () => listAdjustments(apt.id),
    enabled: browserOnly,
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
          apartmentId: apt.id,
          nuevoCentavos: centavos,
          vigenteDesde: fecha || today,
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
    <Card
      spotlight
      className={due ? "rail space-y-3 p-4" : "space-y-3 p-4"}
      tone={due ? "iris" : "muted"}
    >
      <SectionTitle
        eyebrow="Aviso automático"
        title="Año de contrato"
        detail={headline}
        icon={<TrendingUp size={18} aria-hidden />}
        tone={due ? "iris" : "muted"}
      />
      <DataRow label="Renta actual" value={formatMoney(apt.rentaCentavos)} tone="accent" emphasis />
      {due ? (
        <form className="space-y-3" onSubmit={(event) => void onSave(event)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nueva renta" hint="Pesos mexicanos (MXN)">
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
          <Button type="submit" status={save.status as ButtonStatus} className="w-full">
            Guardar nueva renta
          </Button>
        </form>
      ) : null}
      {mine.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
            Aumentos anteriores
          </p>
          <ul className="space-y-1">
            {mine.map((row: RentAdjustment) => (
              <li key={row.id} className="well num px-3 py-2 text-sm text-muted">
                {longDate(row.vigenteDesde)} · {formatMoney(row.anteriorCentavos)} →{" "}
                <span className="text-accent-soft">{formatMoney(row.nuevoCentavos)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
