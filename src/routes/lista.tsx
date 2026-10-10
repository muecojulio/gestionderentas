import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button, Field, TextArea, TextInput } from "@/components/ui";
import { addBlacklist, removeBlacklist } from "@/lib/rentals.functions";
import { useRefreshRentals, useRentals } from "@/lib/use-rentals";

export const Route = createFileRoute("/lista")({ component: Lista });

function Lista() {
  const { blacklist } = useRentals();
  const refresh = useRefreshRentals();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [motivo, setMotivo] = useState("");
  const [pending, setPending] = useState(false);

  async function add() {
    setPending(true);
    try {
      const result = await addBlacklist({ data: { nombre, telefono, motivo } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNombre("");
      setTelefono("");
      setMotivo("");
      refresh();
      toast.success("Quedó en la lista");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    try {
      await removeBlacklist({ data: id });
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar.");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">No volver a rentar</h1>
        <p className="mt-2 text-sm text-muted">
          Si intentas registrar a alguien de esta lista, la app te avisa antes de guardar.
        </p>
      </header>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <Field label="Nombre">
          <TextInput value={nombre} onChange={(event) => setNombre(event.target.value)} required />
        </Field>
        <Field label="Teléfono">
          <TextInput value={telefono} onChange={(event) => setTelefono(event.target.value)} inputMode="tel" />
        </Field>
        <Field label="Motivo">
          <TextArea value={motivo} onChange={(event) => setMotivo(event.target.value)} />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Agregar a la lista"}
        </Button>
      </form>
      {blacklist.isPending ? <p className="text-sm text-muted">Cargando lista…</p> : null}
      <ul className="space-y-2">
        {(blacklist.data ?? []).map((entry) => (
          <li key={entry.id} className="rounded-xl border border-line bg-raised px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{entry.nombre}</p>
                {entry.telefono ? <p className="text-sm text-muted">{entry.telefono}</p> : null}
                {entry.motivo ? <p className="mt-1 text-sm text-muted">{entry.motivo}</p> : null}
              </div>
              <button
                type="button"
                className="press text-sm text-muted"
                onClick={() => void remove(entry.id)}
              >
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
