import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldBan, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SwipeableRow } from "@/components/swipeable";
import { Button, Empty, Field, TextArea, TextInput } from "@/components/ui";
import { addBlacklist, removeBlacklist } from "@/lib/rentals.functions";
import { useActionStatus } from "@/lib/use-action-status";
import { useRefreshRentals, useRentals } from "@/lib/use-rentals";

export const Route = createFileRoute("/lista")({ component: Lista });

function Lista() {
  const { blacklist } = useRentals();
  const refresh = useRefreshRentals();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [motivo, setMotivo] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const save = useActionStatus();

  async function onAdd() {
    await save.run(async () => {
      try {
        const result = await addBlacklist({ data: { nombre, telefono, motivo } });
        if (!result.ok) {
          toast.error(result.error);
          return false;
        }
        setNombre("");
        setTelefono("");
        setMotivo("");
        refresh();
        toast.success("Quedó en la lista");
        return true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
        return false;
      }
    });
  }

  async function remove(id: string) {
    setRemoving(id);
    try {
      await removeBlacklist({ data: id });
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar.");
    } finally {
      setRemoving(null);
    }
  }

  const entries = blacklist.data ?? [];

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
          void onAdd();
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
        <Button type="submit" status={save.status}>
          Agregar a la lista
        </Button>
      </form>
      {blacklist.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-live="polite">
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
        </div>
      ) : null}
      {!blacklist.isPending && entries.length === 0 ? (
        <Empty
          title="Nadie en la lista todavía"
          body="Cuando conozcas a alguien a quien no volverías a rentar, anótalo aquí para que la app te avise."
          icon={<ShieldBan size={28} strokeWidth={1.25} />}
        />
      ) : null}
      <ul className="space-y-2" aria-label="Personas en la lista">
        {entries.map((entry, index) => (
          <li key={entry.id} className="rise" style={{ animationDelay: `${index * 60}ms` }}>
            <SwipeableRow
              actions={
                <button
                  type="button"
                  aria-label={`Quitar a ${entry.nombre} de la lista`}
                  disabled={removing === entry.id}
                  className="press flex h-full items-center gap-1.5 bg-accent px-4 text-sm font-medium text-accent-fg disabled:opacity-50"
                  onClick={() => void remove(entry.id)}
                >
                  {removing === entry.id ? (
                    <span
                      className="size-4 animate-spin rounded-full border-2 border-accent-fg/40 border-t-accent-fg"
                      aria-hidden
                    />
                  ) : (
                    <Trash2 size={16} aria-hidden />
                  )}
                  Quitar
                </button>
              }
              actionsLabel={`Acciones de ${entry.nombre}`}
            >
              <div className="min-w-0 flex-1 px-4 py-3">
                <p className="font-medium">{entry.nombre}</p>
                {entry.telefono ? <p className="text-sm text-muted">{entry.telefono}</p> : null}
                {entry.motivo ? <p className="mt-1 text-sm text-muted">{entry.motivo}</p> : null}
              </div>
            </SwipeableRow>
          </li>
        ))}
      </ul>
    </div>
  );
}
