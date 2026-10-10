import type { ReactNode } from "react";

/**
 * El AuthProvider se mantiene como un passthrough simple porque el inicio de
 * sesión fue eliminado. Se conserva para no tener que reescribir la raíz.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
