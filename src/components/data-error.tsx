import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Estado de error de las pantallas que cargan datos. Antes era un "Reintentar"
 * sin contexto: si algo falla, aquí se ve **por qué** (el motivo que mandó el
 * servidor) y se puede volver a intentar.
 */
export function DataError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error?: Error | null;
  onRetry: () => void;
}) {
  const detail = error instanceof Error ? error.message : "";
  return (
    <div
      role="alert"
      className="space-y-3 rounded-xl border border-line bg-raised p-4"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm">{title}</p>
          {detail ? <p className="mt-1 break-words text-xs text-muted">{detail}</p> : null}
        </div>
      </div>
      <Button tone="quiet" onClick={() => onRetry()}>
        Reintentar
      </Button>
    </div>
  );
}
