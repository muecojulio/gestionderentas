import { useCallback, useEffect, useRef, useState } from "react";
import type { ButtonStatus } from "@/components/ui";

/**
 * Estado de acciones para botones: `loading` (evita envíos duplicados) →
 * `success` (palomita breve) o `error` (sacudida discreta) → vuelta a `idle`.
 * Devuelve el estado para pasarle a `<Button status={…}>` y un `run` que
 * envuelve una acción async y reporta si terminó bien.
 */
export function useActionStatus(resetMs = 1600) {
  const [status, setStatus] = useState<ButtonStatus>("idle");
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = useCallback(
    async (action: () => Promise<boolean>) => {
      setStatus("loading");
      let ok = false;
      try {
        ok = await action();
      } catch {
        ok = false;
      }
      setStatus(ok ? "success" : "error");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setStatus("idle"), resetMs);
      return ok;
    },
    [resetMs],
  );
  return { status, run };
}
