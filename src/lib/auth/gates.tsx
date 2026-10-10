import type { ReactNode } from "react";

/**
 * El inicio de sesión fue eliminado por completo. Este archivo expone los
 * mismos nombres que el resto de la app importaba pero ya no redirigen ni
 * muestran botones de inicio/cierre de sesión.
 */

/** Ruta de login — ya no existe pero mantenemos la constante por si algo la referencia. */
export const SIGN_IN_PATH = "/";

/** Siempre renderiza los hijos: siempre hay un usuario. */
export function SignedIn({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** Nunca renderiza nada: nunca se está "fuera" de sesión. */
export function SignedOut(_: { children: ReactNode }) {
  return null;
}

/** No-op: reemplazo rápido por si algo lo importa. No redirige. */
export function RedirectToSignIn(_: { to?: string }) {
  return null;
}

/** Compat: siempre muestra los hijos sin pantalla de inicio de sesión. */
export function SignInGate({ children }: { children: ReactNode; fallback?: ReactNode }) {
  return <>{children}</>;
}

/** Botón de usuario simplificado: ya no muestra avatar ni cerrar sesión. */
export function UserButton() {
  return null;
}
