/**
 * Encabezados de seguridad globales (Nitro middleware, auto-registrado desde
 * `server/middleware/` porque vite.config.ts fija `serverDir: "./server"`).
 *
 * La política y los valores viven en `scripts/security-headers-shared.mjs`,
 * compartidos con el plugin de Vite que aplica los mismos encabezados en el
 * servidor de desarrollo. No se envía `X-Frame-Options` ni `frame-ancestors`
 * porque la app se incrusta a propósito en el host del live preview; tampoco
 * HSTS (se aplicaría al host proxy compartido del preview). La superficie de
 * sitios hermanos ya está cubierta con cookies `__Host-` + la verificación
 * Fetch-Metadata de `src/lib/auth/isolation.server.ts`.
 *
 * Se ejecuta después de `grok-pwa.ts` (orden alfabético) y envuelve cualquier
 * `Response` que la cadena devuelva, sin reemplazar encabezados que la app ya
 * haya fijado.
 */
import { setResponseHeaders } from "h3";
import { buildSecurityHeaders } from "../../scripts/security-headers-shared.mjs";

const SECURITY_HEADERS: Record<string, string> = buildSecurityHeaders({
  production: process.env.NODE_ENV === "production",
});

interface SecurityEvent {
  req: { headers: Headers };
}

export default async function securityHeadersMiddleware(
  event: SecurityEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const result = await next();
  if (result instanceof Response) {
    const headers = new Headers(result.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!headers.has(name)) headers.set(name, value);
    }
    return new Response(result.body, {
      status: result.status,
      statusText: result.statusText,
      headers,
    });
  }
  // Resultado no-Response (p. ej. 204): fija los encabezados en el evento.
  setResponseHeaders(event as never, SECURITY_HEADERS);
  return result;
}
