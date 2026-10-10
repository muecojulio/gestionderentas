/** Inicio de sesión eliminado: stubs sin dependencias externas. */

export const GATE_IDENTITY_HEADER = "x-grok-identity";
export const GATE_JWKS_PATH = "/__gate/identity-key";
export const PREVIEW_AUDIENCE = "preview";
export const PREVIEW_GATE_ORIGIN = "http://127.0.0.1:6014";
const FALLBACK_EMAIL_DOMAIN = "viewer.grok.invalid";
const FALLBACK_NAME = "Grok user";

export type GateIdentity = {
  sub: string;
  email: string | null;
  name: string | null;
  teamId: string | null;
};

export type GateJwks = { keys: unknown[] };
export type JwksFetch = (url: string) => Promise<GateJwks | null>;

export function gateIdentityEnabled(): boolean {
  return false;
}

export function gateTokenAudience(): string {
  return "app:removed";
}

export type VerifyGateIdentityTokenOptions = {
  issuer: string;
  audience: string;
  getKey: unknown;
};

export async function verifyGateIdentityToken(
  _token: string,
  _options: VerifyGateIdentityTokenOptions,
): Promise<GateIdentity | null> {
  return null;
}

export type GateEndpoints = { issuer: string; jwksUrl: string };

export function resolveGateEndpoints(_headers: Headers): GateEndpoints | null {
  return null;
}

export type GateLinkedAccount = { providerId: string; accountId: string };

export function sessionBoundToGateIdentity(
  _accounts: readonly GateLinkedAccount[],
  _identitySub: string,
  _gateProviderId: string,
): boolean {
  return false;
}

export async function gateIdentityFromHeaders(
  _headers: Headers,
  _jwksFetch?: JwksFetch,
): Promise<GateIdentity | null> {
  return null;
}

export type GateUserInfo = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

export function gateIdentityUserInfo(identity: GateIdentity): GateUserInfo {
  return {
    id: identity.sub,
    email: (identity.email ?? `${identity.sub}@${FALLBACK_EMAIL_DOMAIN}`).toLowerCase(),
    emailVerified: Boolean(identity.email),
    name: identity.name ?? FALLBACK_NAME,
  };
}

export function gateKeyResolver(_url: string, _jwksFetch?: JwksFetch): unknown {
  return null;
}
