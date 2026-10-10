import type { CSSProperties } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { RotateCcw, TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

/**
 * Pantalla de error global con la misma piel que el resto de la app (carbón +
 * terracota). El mensaje original del error siempre queda visible. Los colores
 * van en duro (no como variables) porque esta pantalla puede aparecer justo
 * cuando algo más falló.
 */
export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main
      className="relative grid min-h-dvh place-items-center overflow-hidden px-6 py-12"
      style={{ background: "#121410", color: "#f4f1e9" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-crimson/18 blur-3xl"
      />
      <div className="card relative w-full max-w-md space-y-4 p-6 text-center">
        <span
          aria-hidden
          className="tile mx-auto size-14 float"
          style={{ "--tone": "#e2605a" } as CSSProperties}
        >
          <TriangleAlert size={24} />
        </span>
        <h1 className="font-display text-3xl" style={{ color: "#f4f1e9" }}>
          Algo se rompió
        </h1>
        <p className="break-words text-sm" style={{ color: "#a5a296" }}>
          {errorMessage(error)}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-quiet press lift mx-auto inline-flex h-12 items-center gap-2 rounded-xl px-5 text-sm font-medium"
        >
          <RotateCcw size={16} aria-hidden />
          Volver a cargar
        </button>
      </div>
    </main>
  );
}
