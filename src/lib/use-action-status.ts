import { useCallback, useEffect, useRef, useState } from "react";
import type { ButtonStatus } from "@/components/ui";

/**
 * Estado de acciones para botones: `loading` (evita envíos duplicados) →
 * `success` o `error` → vuelta a `idle`. `run` protege la acción además de
 * deshabilitar el botón, así un segundo envío en el mismo ciclo no duplica la
 * operación.
 */
export function useActionStatus(resetMs = 1600) {
  const [status, setStatus] = useState<ButtonStatus>("idle");
  const timer = useRef<number | null>(null);
  const running = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  const run = useCallback(
    async (action: () => Promise<boolean>) => {
      if (running.current) return false;
      running.current = true;
      if (timer.current != null) window.clearTimeout(timer.current);
      timer.current = null;
      setStatus("loading");

      let ok = false;
      try {
        ok = await action();
      } catch {
        ok = false;
      } finally {
        running.current = false;
      }

      if (!mounted.current) return ok;
      setStatus(ok ? "success" : "error");
      timer.current = window.setTimeout(() => {
        setStatus("idle");
        timer.current = null;
      }, resetMs);
      return ok;
    },
    [resetMs],
  );

  return { status, run };
}
