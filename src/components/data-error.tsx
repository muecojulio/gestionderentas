import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import { Card, IconTile } from "@/components/surface";
import { toneStyle } from "@/lib/tones";

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
    <Card spotlight className="rail space-y-3 p-4" tone="crimson">
      <div
        role="alert"
        className="flex items-start gap-3"
        style={toneStyle("crimson")}
      >
        <IconTile tone="crimson" size={38}>
          <AlertTriangle size={17} />
        </IconTile>
        <div className="min-w-0">
          <p className="font-display text-xl text-fg">{title}</p>
          {detail ? (
            <p className="mt-1 break-words text-xs text-muted">
              Motivo: {detail}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">
              Puede ser un corte de conexión momentáneo.
            </p>
          )}
        </div>
      </div>
      <Button tone="quiet" onClick={() => onRetry()}>
        Reintentar
      </Button>
    </Card>
  );
}
