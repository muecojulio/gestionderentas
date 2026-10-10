import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Phone, ShieldBan, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/reveal";
import { Card, SectionTitle } from "@/components/surface";
import { RowAction, SwipeableRow } from "@/components/swipeable";
import { Button, Empty, Field, TextArea, TextInput } from "@/components/ui";
import { addBlacklist, removeBlacklist } from "@/lib/rentals.api";
import { useActionStatus } from "@/lib/use-action-status";
import { useRefreshRentals, useRentals } from "@/lib/use-rentals";
import { toneStyle } from "@/lib/tones";

export const Route = createFileRoute("/lista")({ component: Lista });

/** Iniciales para el avatar de la lista (sin fotos: aquí solo va el nombre). */
function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

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
        const result = await addBlacklist({ nombre, telefono, motivo });
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
      await removeBlacklist(id);
      refresh();
      toast.success("Se quitó de la lista");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo quitar.");
    } finally {
      setRemoving(null);
    }
  }

  const entries = blacklist.data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <SectionTitle
        eyebrow="Lista negra"
        title="No volver a rentar"
        detail="Si intentas registrar a alguien de esta lista, la app te avisa antes de guardar."
        icon={<ShieldBan size={18} aria-hidden />}
        tone="crimson"
      />

      <Card spotlight className="space-y-4 p-4 md:p-5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="tile size-10 rounded-xl" style={toneStyle("crimson")}>
            <UserPlus size={18} />
          </span>
          <div>
            <h2 className="font-display text-2xl leading-tight text-fg">Agregar a la lista</h2>
            <p className="text-xs text-muted">Con el nombre basta; el teléfono y el motivo ayudan.</p>
          </div>
        </div>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onAdd();
          }}
        >
          <Field label="Nombre">
            <TextInput
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Quién fue"
              required
            />
          </Field>
          <Field label="Teléfono" hint="Opcional">
            <TextInput
              value={telefono}
              onChange={(event) => setTelefono(event.target.value)}
              inputMode="tel"
              placeholder="55 1234 5678"
            />
          </Field>
          <Field label="Motivo" hint="Qué pasó, para recordarlo dentro de un año">
            <TextArea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Se fue sin pagar dos meses"
            />
          </Field>
          <Button type="submit" status={save.status} size="lg" className="w-full">
            Agregar a la lista
          </Button>
        </form>
      </Card>

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
      {entries.length > 0 ? (
        <section className="space-y-3">
          <p aria-live="polite" className="text-xs text-muted">
            {entries.length} {entries.length === 1 ? "persona anotada" : "personas anotadas"} ·
            desliza o pulsa ⋯ para quitarla
          </p>
          <ul className="space-y-2.5" aria-label="Personas en la lista">
            {entries.map((entry, index) => (
              <li key={entry.id}>
                <Reveal index={index % 8}>
                  <SwipeableRow
                    actions={
                      <RowAction
                        label="Quitar"
                        tone="crimson"
                        icon={<Trash2 size={16} aria-hidden />}
                        busy={removing === entry.id}
                        onClick={() => void remove(entry.id)}
                      />
                    }
                    actionsLabel={`Acciones de ${entry.nombre}`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3" style={toneStyle("crimson")}>
                      <span
                        aria-hidden
                        className="tile size-11 shrink-0 rounded-xl font-display text-base"
                      >
                        {initials(entry.nombre)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-fg">{entry.nombre}</span>
                        {entry.telefono ? (
                          <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                            <Phone size={11} aria-hidden />
                            {entry.telefono}
                          </span>
                        ) : null}
                        {entry.motivo ? (
                          <span className="mt-1 block text-sm text-muted">{entry.motivo}</span>
                        ) : null}
                      </span>
                    </div>
                  </SwipeableRow>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
