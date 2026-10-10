import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ApartmentForm } from "@/components/apartment-form";
import { saveApartment } from "@/lib/rentals.functions";
import type { ApartmentInput } from "@/lib/rentals.logic";
import { useRefreshRentals } from "@/lib/use-rentals";

export const Route = createFileRoute("/nuevo")({ component: Nuevo });

function Nuevo() {
  const navigate = useNavigate();
  const refresh = useRefreshRentals();
  const [pending, setPending] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  async function onSubmit(value: ApartmentInput) {
    setPending(true);
    try {
      const result = await saveApartment({ data: value });
      if (!result.ok) {
        if ("code" in result && result.code === "blacklist") setWarning(result.error);
        else toast.error(result.error);
        return;
      }
      refresh();
      toast.success("Departamento guardado");
      await navigate({ to: "/depto/$id", params: { id: result.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 font-display text-4xl">Nuevo departamento</h1>
      <ApartmentForm pending={pending} warning={warning} onSubmit={(value) => void onSubmit(value)} />
    </div>
  );
}
