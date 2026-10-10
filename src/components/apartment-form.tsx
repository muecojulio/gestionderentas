import { useState } from "react";
import { Building2, Store } from "lucide-react";
import type { Apartment, ApartmentInput, DepositoEstado, PropertyTipo } from "@/lib/rentals.logic";
import { centavosToInput, pesosToCentavos, TIPO_LABEL } from "@/lib/rentals.logic";
import { Accordion } from "@/components/accordion";
import { compressPhoto } from "@/components/photo";
import { Button, Field, TextArea, TextInput, Toggle } from "@/components/ui";

function dayValue(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

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
  const [depositoEstado, setDepositoEstado] = useState<DepositoEstado | "">(initial?.depositoEstado ?? "");
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
      setLocalError("El monto de luz no es válido.");
      return;
    }
    if (aguaMonto.trim() && aguaCentavos == null) {
      setLocalError("El monto de agua no es válido.");
      return;
    }
    if (renta.trim() && rentaCentavos == null) {
      setLocalError("El monto de renta no es válido.");
      return;
    }
    const depositoCentavos = money(deposito);
    if (deposito.trim() && depositoCentavos == null) {
      setLocalError("El monto del depósito no es válido.");
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
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Accordion title="La propiedad">
        <div className="space-y-3">
        <Field label="Tipo">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={tipo === "departamento"}
              onClick={() => setTipo("departamento")}
              className={
                tipo === "departamento"
                  ? "press flex items-center justify-center gap-2 rounded-xl border border-accent bg-accent/10 px-3 py-3 text-sm font-medium text-fg"
                  : "press flex items-center justify-center gap-2 rounded-xl border border-line bg-raised px-3 py-3 text-sm text-muted"
              }
            >
              <Building2 size={16} aria-hidden />
              Departamento
            </button>
            <button
              type="button"
              aria-pressed={tipo === "accesoria"}
              onClick={() => setTipo("accesoria")}
              className={
                tipo === "accesoria"
                  ? "press flex items-center justify-center gap-2 rounded-xl border border-accent bg-accent/10 px-3 py-3 text-sm font-medium text-fg"
                  : "press flex items-center justify-center gap-2 rounded-xl border border-line bg-raised px-3 py-3 text-sm text-muted"
              }
            >
              <Store size={16} aria-hidden />
              Accesoria
            </button>
          </div>
        </Field>
        <button
          type="button"
          aria-label={foto ? `Cambiar la foto de ${TIPO_LABEL[tipo].toLowerCase()}` : `Subir foto de ${TIPO_LABEL[tipo].toLowerCase()}`}
          className="press group relative block w-full overflow-hidden rounded-xl border border-line bg-raised"
          onClick={() => document.getElementById("foto-depto")?.click()}
        >
          {foto ? (
            <>
              <img src={foto} alt="" className="aspect-video w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/80 to-transparent px-3 pb-2 pt-8 text-left text-sm text-fg opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Cambiar foto
              </span>
            </>
          ) : (
            <span className="flex aspect-video flex-col items-center justify-center gap-2 text-muted">
              <Building2 strokeWidth={1.5} />
              <span className="text-sm">Subir foto</span>
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
        <Field label="Dirección">
          <TextInput
            value={direccion}
            onChange={(event) => setDireccion(event.target.value)}
            placeholder="Calle, número, colonia"
          />
        </Field>
        </div>
      </Accordion>

      <Accordion title="Ficha técnica">
        <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Medidor de luz">
            <TextInput value={medidorLuz} onChange={(event) => setMedidorLuz(event.target.value)} />
          </Field>
          <Field label="Medidor de agua">
            <TextInput
              value={medidorAgua}
              onChange={(event) => setMedidorAgua(event.target.value)}
            />
          </Field>
          <Field label="Día de pago de luz" hint="Día del mes">
            <TextInput
              inputMode="numeric"
              value={luzDia}
              onChange={(event) => setLuzDia(event.target.value)}
              placeholder="12"
            />
          </Field>
          <Field label="Monto de luz" hint="Pesos">
            <TextInput
              inputMode="decimal"
              value={luzMonto}
              onChange={(event) => setLuzMonto(event.target.value)}
              placeholder="480"
            />
          </Field>
          <Field label="Día de pago de agua">
            <TextInput
              inputMode="numeric"
              value={aguaDia}
              onChange={(event) => setAguaDia(event.target.value)}
              placeholder="18"
            />
          </Field>
          <Field label="Monto de agua" hint="Pesos">
            <TextInput
              inputMode="decimal"
              value={aguaMonto}
              onChange={(event) => setAguaMonto(event.target.value)}
              placeholder="220"
            />
          </Field>
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

      <Accordion title="Inquilino">
        <div className="space-y-3">
        <Toggle
          checked={ocupado}
          onCheckedChange={setOcupado}
          label="Está rentado"
          hint="Apágalo si el departamento está libre"
        />
        {ocupado ? (
          <div className="rise space-y-3">
            <Field label="Nombre">
              <TextInput value={inquilino} onChange={(event) => setInquilino(event.target.value)} />
            </Field>
            <Field label="Teléfono">
              <TextInput
                value={telefono}
                onChange={(event) => setTelefono(event.target.value)}
                inputMode="tel"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Renta mensual" hint="Pesos">
                <TextInput
                  inputMode="decimal"
                  value={renta}
                  onChange={(event) => setRenta(event.target.value)}
                  placeholder="12000"
                />
              </Field>
              <Field label="Día de pago">
                <TextInput
                  inputMode="numeric"
                  value={diaPago}
                  onChange={(event) => setDiaPago(event.target.value)}
                  placeholder="5"
                />
              </Field>
              <Field label="Ingreso">
                <TextInput type="date" value={ingreso} onChange={(event) => setIngreso(event.target.value)} />
              </Field>
              <Field label="Inicio del contrato">
                <TextInput
                  type="date"
                  value={contratoInicio}
                  onChange={(event) => setContratoInicio(event.target.value)}
                />
              </Field>
              <Field label="Vence el contrato">
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
            <h3 className="font-display text-xl">Depósito en garantía</h3>
            <p className="text-sm text-muted">Queda en el historial de esta estancia cuando el inquilino sale.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Monto" hint="Pesos">
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
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["en_poder", "En tu poder"],
                  ["devuelto", "Devuelto"],
                  ["retenido", "Retenido"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={depositoEstado === id}
                  className={
                    depositoEstado === id
                      ? "press h-11 rounded-xl border border-accent bg-accent/10 px-3 text-sm text-fg"
                      : "press h-11 rounded-xl border border-line px-3 text-sm text-muted"
                  }
                  onClick={() => setDepositoEstado(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <Field label="Nota del depósito" hint="Por ejemplo, si retuviste una parte">
              <TextArea value={depositoNota} onChange={(event) => setDepositoNota(event.target.value)} />
            </Field>
          </div>
        ) : null}
        </div>
      </Accordion>

      {warning ? (
        <div className="rounded-xl border border-accent/50 bg-accent/10 p-4">
          <p className="text-sm text-fg">{warning}</p>
          <div className="mt-3">
            <Toggle
              checked={forzar}
              onCheckedChange={setForzar}
              label="Rentar de todos modos"
              hint="Solo si estás seguro"
            />
          </div>
        </div>
      ) : null}
      {localError ? <p className="text-sm text-accent">{localError}</p> : null}
      <Button
        type="submit"
        className="w-full"
        status={pending ? "loading" : "idle"}
        disabled={pending || (Boolean(warning) && !forzar)}
      >
        Guardar
      </Button>
    </form>
  );
}
