/**
 * Normalized user shape. Login fue eliminado: siempre hay un usuario local
 * fijo (dev) para que todas las consultas funcionen sin autenticación.
 */
export type AppUser = {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
  /** Siempre true (sin autenticación real). */
  isDevFallback: boolean;
};

/**
 * Usuario único y fijo que se usa en toda la app. El id coincide con el
 * que usaba el modo sin-auth de la plantilla (`"dev-user"`) para que los
 * datos existentes en la PGLite embebida sigan siendo visibles.
 */
export const DEV_USER: AppUser = {
  id: "dev-user",
  displayName: null,
  primaryEmail: null,
  profileImageUrl: null,
  isDevFallback: true,
};

/** Estado actual del usuario: siempre hay usuario, nunca está pendiente. */
export type CurrentUserState = {
  user: AppUser;
  isPending: false;
};

const DEV_STATE: CurrentUserState = { user: DEV_USER, isPending: false };

/**
 * Hook reemplazado: el inicio de sesión se eliminó por completo.
 * Devuelve siempre el usuario local fijo sin cargar nada.
 */
export function useCurrentUserState(): CurrentUserState {
  return DEV_STATE;
}

/** Atajo para leer el usuario (siempre presente). */
export function useCurrentUser(): AppUser {
  return DEV_USER;
}
