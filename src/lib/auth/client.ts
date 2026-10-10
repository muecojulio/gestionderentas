/**
 * El inicio de sesión fue eliminado. Este archivo se mantiene como stubs para
 * que cualquier importación residual no rompa la compilación — la app ya no
 * usa ninguno de estos valores.
 */

export const authEnabled = false;
export const GROK_PROVIDERS: { providerId: string; label: string }[] = [];

export function getBearerToken(): string | null {
  return null;
}

export async function signIn(_providerId?: string, _opts?: { callbackURL?: string; errorCallbackURL?: string }): Promise<void> {
  if (typeof window !== "undefined") window.location.href = "/";
}

export async function signOut(redirectTo = "/"): Promise<void> {
  if (typeof window !== "undefined") window.location.href = redirectTo;
}

// Objeto mínimo compatible con cualquier llamada residual (useSession etc.)
// que pueda quedar en código que no hayamos tocado.
export const authClient = {
  useSession: () => ({ data: null, isPending: false } as const),
  signOut: async () => ({ error: null }),
  signIn: { oauth2: async () => ({ data: null, error: null }) },
  getSession: async () => null,
} as unknown as Record<string, unknown>;
