import { useState } from "react";
import { Building2 } from "lucide-react";
import type { Apartment, ApartmentInput } from "@/lib/rentals.logic";
import { centavosToInput, pesosToCentavos } from "@/lib/rentals.logic";
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
    setLocalError(null);
    onSubmit({
      id: initial?.id,
      nombre,
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
      <section className="space-y-3">
        <h2 className="font-display text-2xl">El departamento</h2>
        <button
          type="button"
          className="press relative block w-full overflow-hidden rounded-xl border border-line bg-raised"
          onClick={() => document.getElementById("foto-depto")?.click()}
        >
          {foto ? (
            <img src={foto} alt="" className="aspect-video w-full object-cover" />
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
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Ficha técnica</h2>
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
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Inquilino</h2>
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
          </div>
        ) : null}
      </section>

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
      <Button type="submit" className="w-full" disabled={pending || (Boolean(warning) && !forzar)}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
