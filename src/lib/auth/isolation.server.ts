/**
 * Inicio de sesión eliminado: el aislamiento cross-site ya no es necesario
 * porque no hay cookies de sesión que proteger. Se conserva como no-op para
 * no tener que reescribir imports residuales.
 */

export class CrossSiteRequestError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden: cross-site request blocked");
    this.name = "CrossSiteRequestError";
  }
}

export function assertSameSiteRequest(): void {
  // no-op
}
