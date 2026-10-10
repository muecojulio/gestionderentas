/**
 * El inicio de sesión fue eliminado. Este archivo ya no configura Better Auth.
 * Se conserva únicamente como stub para que cualquier importación residual
 * (por ejemplo desde la ruta `/api/auth/$` que también fue neutralizada)
 * no rompa la compilación.
 */

export const SESSION_TOKEN_COOKIE = "__Host-grok-auth.session_token";
export const authConfigured = false;
export const GROK_PROVIDERS: { providerId: string; label: string; idp: string }[] = [];

export function readSessionToken(): string | null {
  return null;
}

// Stub mínimo por si algo lo importa accidentalmente.
export const auth = {
  handler: (_request: Request) => new Response("Not Found", { status: 404 }),
  api: {
    getSession: async () => null,
    signInWithOAuth2: async () => new Response(null, { status: 404 }),
  },
} as unknown as Record<string, unknown>;
