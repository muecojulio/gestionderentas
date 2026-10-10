import { useState } from "react";
import {
  Building2,
  Camera,
  Check,
  Droplets,
  Landmark,
  Store,
  TriangleAlert,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";
import type { Apartment, ApartmentInput, DepositoEstado, PropertyTipo } from "@/lib/rentals.logic";
import { centavosToInput, pesosToCentavos, TIPO_LABEL } from "@/lib/rentals.logic";
import { Accordion } from "@/components/accordion";
import { compressPhoto } from "@/components/photo";
import { Card, IconTile } from "@/components/surface";
import { Button, Field, TextArea, TextInput, Toggle } from "@/components/ui";
import { cn } from "@/lib/utils";
import { toneStyle, type Tone } from "@/lib/tones";

function dayValue(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

const DEPOSITO_OPCIONES: { id: DepositoEstado; label: string; tone: Tone }[] = [
  { id: "en_poder", label: "En tu poder", tone: "sage" },
  { id: "devuelto", label: "Devuelto", tone: "azure" },
  { id: "retenido", label: "Retenido", tone: "crimson" },
];

export function ApartmentForm({
  initial,
  pending,
  warning,
  onSubmit,
}: {
  initial?: Apartment | null;
  pending?: boolean;
  warning?: string | null;
  onSubmit: (value: ApartmentInput) => void;
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? "");
  const [tipo, setTipo] = useState<PropertyTipo>(initial?.tipo ?? "departamento");
  const [direccion, setDireccion] = useState(initial?.direccion ?? "");
  const [foto, setFoto] = useState<string | null>(initial?.foto ?? null);
  const [medidorLuz, setMedidorLuz] = useState(initial?.medidorLuz ?? "");
  const [medidorAgua, setMedidorAgua] = useState(initial?.medidorAgua ?? "");
  const [notaServicios, setNotaServicios] = useState(initial?.notaServicios ?? "");
  const [luzDia, setLuzDia] = useState(dayValue(initial?.luzDia));
  const [luzMonto, setLuzMonto] = useState(centavosToInput(initial?.luzCentavos ?? null));
  const [aguaDia, setAguaDia] = useState(dayValue(initial?.aguaDia));
  const [aguaMonto, setAguaMonto] = useState(centavosToInput(initial?.aguaCentavos ?? null));
  const [ocupado, setOcupado] = useState(initial?.ocupado ?? false);
  const [inquilino, setInquilino] = useState(initial?.inquilino ?? "");
  const [telefono, setTelefono] = useState(initial?.telefono ?? "");
  const [renta, setRenta] = useState(centavosToInput(initial?.rentaCentavos ?? null));
  const [diaPago, setDiaPago] = useState(dayValue(initial?.diaPago));
  const [contratoInicio, setContratoInicio] = useState(initial?.contratoInicio ?? "");
  const [contratoFin, setContratoFin] = useState(initial?.contratoFin ?? "");
  const [ingreso, setIngreso] = useState(initial?.ingreso ?? "");
  const [notas, setNotas] = useState(initial?.notas ?? "");
  const [deposito, setDeposito] = useState(centavosToInput(initial?.depositoCentavos ?? null));
  const [depositoFecha, setDepositoFecha] = useState(initial?.depositoFecha ?? "");
  const [depositoEstado, setDepositoEstado] = useState<DepositoEstado | "">(
    initial?.depositoEstado ?? "",
  );
  const [depositoNota, setDepositoNota] = useState(initial?.depositoNota ?? "");
  const [forzar, setForzar] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setLocalError(null);
    try {
      setFoto(await compressPhoto(file));
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "No se pudo usar esa foto.");
    }
  }

  function submit() {
    const money = (raw: string) => (raw.trim() ? pesosToCentavos(raw) : null);
    const asDay = (raw: string) => (raw.trim() ? Number(raw) : null);
    const luzCentavos = money(luzMonto);
    const aguaCentavos = money(aguaMonto);
    const rentaCentavos = money(renta);
    if (luzMonto.trim() && luzCentavos == null) {
      setLocalError("El monto de luz no es válido. Solo pesos mexicanos (MXN).");
      return;
    }
    if (aguaMonto.trim() && aguaCentavos == null) {
      setLocalError("El monto de agua no es válido. Solo pesos mexicanos (MXN).");
      return;
    }
    if (renta.trim() && rentaCentavos == null) {
      setLocalError("El monto de renta no es válido. Solo pesos mexicanos (MXN).");
      return;
    }
    const depositoCentavos = money(deposito);
    if (deposito.trim() && depositoCentavos == null) {
      setLocalError("El monto del depósito no es válido. Solo pesos mexicanos (MXN).");
      return;
    }
    setLocalError(null);
    onSubmit({
      id: initial?.id,
      nombre,
      tipo,
      direccion,
      foto,
      medidorLuz,
      medidorAgua,
      notaServicios,
      luzDia: asDay(luzDia),
      luzCentavos,
      aguaDia: asDay(aguaDia),
      aguaCentavos,
      rentaCentavos,
      inquilino,
      telefono,
      diaPago: asDay(diaPago),
      contratoInicio: contratoInicio || null,
      contratoFin: contratoFin || null,
      ingreso: ingreso || null,
      ocupado,
      notas,
      forzar,
      depositoCentavos,
      depositoFecha: depositoFecha || null,
      depositoEstado: depositoEstado || null,
      depositoNota,
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Accordion
        title="La propiedad"
        detail="Tipo, foto, nombre y dirección"
        icon={<Landmark size={18} aria-hidden />}
        tone="accent"
      >
        <div className="space-y-4">
          <div role="group" aria-label="Tipo de propiedad">
            <span className="mb-1.5 block text-sm font-medium text-fg/85">Tipo</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "departamento", label: "Departamento", icon: Building2, tone: "iris" },
                  { id: "accesoria", label: "Accesoria", icon: Store, tone: "amber" },
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                const on = tipo === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTipo(option.id)}
                    style={toneStyle(option.tone)}
                    className={cn(
                      "press lift flex min-h-20 flex-col items-start gap-2 rounded-xl border p-3 text-left",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft",
                      on ? "chip-on" : "chip-off border-line text-muted",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-8 place-items-center rounded-lg border",
                        on
                          ? "border-accent-fg/25 bg-accent-fg/15 text-accent-fg"
                          : "border-line bg-raised text-muted",
                      )}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {option.label}
                      {on ? (
                        <Check size={14} aria-hidden className="animate-in zoom-in-50 duration-200" />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            aria-label={
              foto
                ? `Cambiar la foto de ${TIPO_LABEL[tipo].toLowerCase()}`
                : `Subir foto de ${TIPO_LABEL[tipo].toLowerCase()}`
            }
            className="press group relative block w-full overflow-hidden rounded-xl border border-dashed border-line bg-bg/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft hover:border-accent/50"
            onClick={() => document.getElementById("foto-depto")?.click()}
          >
            {foto ? (
              <>
                <img src={foto} alt="" className="aspect-video w-full object-cover" />
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-deep/95 via-bg-deep/60 to-transparent px-3 pt-8 pb-2.5 text-left"
                />
                {/* Siempre visible: en el teléfono no hay hover */}
                <span className="absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 rounded-full border border-accent-soft/40 bg-bg-deep/80 px-2.5 py-1 text-xs font-medium text-accent-soft backdrop-blur">
                  <Camera size={13} aria-hidden />
                  Cambiar foto
                </span>
              </>
            ) : (
              <span className="flex aspect-video flex-col items-center justify-center gap-2 text-muted">
                <span aria-hidden className="tile size-12 rounded-xl float">
                  <Camera size={20} />
                </span>
                <span className="text-sm font-medium text-fg">Subir foto</span>
                <span className="text-xs text-muted">
                  Se reconoce la propiedad de un vistazo y se comprime sola
                </span>
              </span>
            )}
          </button>
          <input
            id="foto-depto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => void onPhoto(event.target.files?.[0])}
          />

          <Field label="Nombre">
            <TextInput
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Interior 3, Roma Norte"
              required
            />
          </Field>
          <Field label="Dirección" hint="Opcional, pero ayuda en la agenda">
            <TextInput
              value={direccion}
              onChange={(event) => setDireccion(event.target.value)}
              placeholder="Calle, número, colonia"
            />
          </Field>
        </div>
      </Accordion>

      <Accordion
        title="Ficha técnica"
        detail="Medidores, luz y agua: se conservan aunque salga el inquilino"
        icon={<Zap size={18} aria-hidden />}
        tone="amber"
        defaultOpen={Boolean(initial)}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Medidor de luz">
              <TextInput
                value={medidorLuz}
                onChange={(event) => setMedidorLuz(event.target.value)}
                placeholder="Número del medidor"
              />
            </Field>
            <Field label="Medidor de agua">
              <TextInput
                value={medidorAgua}
                onChange={(event) => setMedidorAgua(event.target.value)}
                placeholder="Número del medidor"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="well space-y-3 p-3" style={toneStyle("amber")}>
              <p className="flex items-center gap-2 text-sm font-medium text-amber">
                <Zap size={15} aria-hidden /> Luz
              </p>
              <Field label="Día de pago" hint="Día del mes">
                <TextInput
                  inputMode="numeric"
                  value={luzDia}
                  onChange={(event) => setLuzDia(event.target.value)}
                  placeholder="12"
                />
              </Field>
              <Field label="Monto" hint="MXN · solo pesos mexicanos">
                <TextInput
                  inputMode="decimal"
                  value={luzMonto}
                  onChange={(event) => setLuzMonto(event.target.value)}
                  placeholder="480"
                />
              </Field>
            </div>
            <div className="well space-y-3 p-3" style={toneStyle("azure")}>
              <p className="flex items-center gap-2 text-sm font-medium text-azure">
                <Droplets size={15} aria-hidden /> Agua
              </p>
              <Field label="Día de pago" hint="Día del mes">
                <TextInput
                  inputMode="numeric"
                  value={aguaDia}
                  onChange={(event) => setAguaDia(event.target.value)}
                  placeholder="18"
                />
              </Field>
              <Field label="Monto" hint="MXN · solo pesos mexicanos">
                <TextInput
                  inputMode="decimal"
                  value={aguaMonto}
                  onChange={(event) => setAguaMonto(event.target.value)}
                  placeholder="220"
                />
              </Field>
            </div>
          </div>
          <Field label="Nota de los medidores" hint="Esta nota se conserva cuando sale el inquilino">
            <TextArea
              value={notaServicios}
              onChange={(event) => setNotaServicios(event.target.value)}
              placeholder="El medidor de luz está en el cubo de escaleras"
            />
          </Field>
        </div>
      </Accordion>

      <Accordion
        title="Inquilino"
        detail="Contrato, renta, día de pago y depósito"
        icon={<UserRound size={18} aria-hidden />}
        tone="sage"
        defaultOpen={Boolean(initial?.ocupado)}
      >
        <div className="space-y-4">
          <Toggle
            checked={ocupado}
            onCheckedChange={setOcupado}
            label="Está rentado"
            hint={ocupado ? "Anota quién vive ahí y cuánto paga" : "Apágalo si la propiedad está libre"}
            icon={
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-lg bg-fg/6 text-muted"
              >
                <UserRound size={14} />
              </span>
            }
          />
          {ocupado ? (
            <div className="rise space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre">
                  <TextInput
                    value={inquilino}
                    onChange={(event) => setInquilino(event.target.value)}
                    placeholder="Nombre y apellido"
                  />
                </Field>
                <Field label="Teléfono">
                  <TextInput
                    value={telefono}
                    onChange={(event) => setTelefono(event.target.value)}
                    inputMode="tel"
                    placeholder="55 1234 5678"
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Renta mensual" hint="MXN · solo pesos mexicanos">
                  <TextInput
                    inputMode="decimal"
                    value={renta}
                    onChange={(event) => setRenta(event.target.value)}
                    placeholder="12000"
                  />
                </Field>
                <Field label="Día de pago" hint="Qué día del mes le toca">
                  <TextInput
                    inputMode="numeric"
                    value={diaPago}
                    onChange={(event) => setDiaPago(event.target.value)}
                    placeholder="5"
                  />
                </Field>
                <Field label="Ingreso" hint="Desde cuándo vive ahí">
                  <TextInput
                    type="date"
                    value={ingreso}
                    onChange={(event) => setIngreso(event.target.value)}
                  />
                </Field>
                <Field label="Inicio del contrato">
                  <TextInput
                    type="date"
                    value={contratoInicio}
                    onChange={(event) => setContratoInicio(event.target.value)}
                  />
                </Field>
                <Field label="Vence el contrato" hint="La app avisa 35 días antes">
                  <TextInput
                    type="date"
                    value={contratoFin}
                    onChange={(event) => setContratoFin(event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Notas de esta estancia" hint="Se borran cuando el inquilino sale">
                <TextArea value={notas} onChange={(event) => setNotas(event.target.value)} />
              </Field>

              <div className="space-y-3 border-t border-line-soft pt-4">
                <p className="flex items-center gap-2 font-display text-xl text-fg">
                  <IconTile tone="sage" size={30} className="rounded-lg">
                    <Wallet size={15} />
                  </IconTile>
                  Depósito en garantía
                </p>
                <p className="text-xs text-muted">
                  Queda en el historial de esta estancia cuando el inquilino sale.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Monto" hint="MXN · solo pesos mexicanos">
                    <TextInput
                      inputMode="decimal"
                      value={deposito}
                      onChange={(event) => {
                        const next = event.target.value;
                        setDeposito(next);
                        if (next.trim() && !depositoEstado) setDepositoEstado("en_poder");
                      }}
                      placeholder="12000"
                    />
                  </Field>
                  <Field label="Fecha en que lo dejó">
                    <TextInput
                      type="date"
                      value={depositoFecha}
                      onChange={(event) => setDepositoFecha(event.target.value)}
                    />
                  </Field>
                </div>
                <div role="group" aria-label="Estado del depósito" className="flex flex-wrap gap-2">
                  {DEPOSITO_OPCIONES.map((option) => {
                    const on = depositoEstado === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={on}
                        style={toneStyle(option.tone)}
                        onClick={() => setDepositoEstado(option.id)}
                        className={cn(
                          "press lift inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft",
                          on ? "chip-on" : cn("chip-off", "border-line"),
                        )}
                      >
                        {on ? <Check size={14} aria-hidden /> : null}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <Field label="Nota del depósito" hint="Por ejemplo, si retuviste una parte">
                  <TextArea
                    value={depositoNota}
                    onChange={(event) => setDepositoNota(event.target.value)}
                  />
                </Field>
              </div>
            </div>
          ) : null}
        </div>
      </Accordion>

      {warning ? (
        <Card spotlight={false} className="rail space-y-3 p-4" tone="crimson">
          <p className="flex items-start gap-2.5 text-sm text-fg">
            <IconTile tone="crimson" size={32} className="mt-0.5 rounded-lg">
              <TriangleAlert size={16} />
            </IconTile>
            {warning}
          </p>
          <Toggle
            checked={forzar}
            onCheckedChange={setForzar}
            label="Rentar de todos modos"
            hint="Solo si estás seguro: esta persona está en tu lista de no volver a rentar"
            tone="crimson"
          />
        </Card>
      ) : null}
      {localError ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-crimson/45 bg-crimson/12 px-3 py-2.5 text-sm text-crimson"
        >
          <TriangleAlert size={15} aria-hidden className="shrink-0" />
          {localError}
        </p>
      ) : null}
      <Card spotlight={false} className="p-3">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          status={pending ? "loading" : "idle"}
          disabled={pending || (Boolean(warning) && !forzar)}
        >
          {pending ? "Guardando…" : initial ? "Guardar cambios" : "Guardar propiedad"}
        </Button>
        {warning && !forzar ? (
          <p className="mt-2 text-center text-xs text-muted">
            Prende “Rentar de todos modos” para poder guardar.
          </p>
        ) : null}
      </Card>
    </form>
  );
}
