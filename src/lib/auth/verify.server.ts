/**
 * Inicio de sesión eliminado. Estas funciones ya no se usan; se mantienen
 * como stubs por compatibilidad con importaciones residuales.
 */

export const DEV_USER_ID = "dev-user";
export const authConfigured = false;

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export type VerifiedUser = { id: string; email: string | null };

export async function getSessionUser(_bearerToken?: string): Promise<VerifiedUser | null> {
  return { id: DEV_USER_ID, email: null };
}

export async function requireUserId(_bearerToken?: string): Promise<string> {
  return DEV_USER_ID;
}
