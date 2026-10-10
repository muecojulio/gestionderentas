import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Landmark } from "lucide-react";
import { ApartmentForm } from "@/components/apartment-form";
import { SectionTitle } from "@/components/surface";
import { saveApartment } from "@/lib/rentals.api";
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
      const result = await saveApartment(value);
      if (!result.ok) {
        if ("code" in result && result.code === "blacklist") setWarning(result.error);
        else toast.error(result.error);
        return;
      }
      refresh();
      toast.success(
        `${value.tipo === "accesoria" ? "Accesoria guardada" : "Departamento guardado"}`,
      );
      await navigate({ to: "/depto/$id", params: { id: result.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionTitle
        eyebrow="Nueva propiedad"
        title="Departamento o accesoria"
        detail="Empieza por el tipo y la foto; lo demás puedes llenarlo después."
        icon={<Landmark size={18} aria-hidden />}
      />
      <ApartmentForm pending={pending} warning={warning} onSubmit={(value) => void onSubmit(value)} />
    </div>
  );
}
