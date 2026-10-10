// @ts-check
/**
 * Encabezados de seguridad compartidos entre el servidor de desarrollo
 * (plugin de Vite, `vite.config.ts`) y el servidor de producción/preview
 * (middleware de Nitro, `server/middleware/security-headers.ts`).
 *
 * Endurecen cada respuesta sin romper el modo preview: la app se incrusta a
 * propósito en el host de la plataforma (live preview), así que NO se envía
 * `X-Frame-Options` ni `frame-ancestors` — la aislaría del preview. La
 * superficie de sitios hermanos ya está cubierta con cookies `__Host-` y la
 * verificación Fetch-Metadata de `src/lib/auth/isolation.server.ts`. Tampoco se
 * envía HSTS: las respuestas llegan al navegador a través del host proxy del
 * preview, y un HSTS aquí se aplicaría a ese host compartido.
 */

/**
 * @param {{ production: boolean }} options
 * @returns {Record<string, string>}
 */
export function buildSecurityHeaders({ production }) {
  /**
   * Política de contenido. `script-src` necesita `'unsafe-inline'` (TanStack
   * Start emite un script en línea como límite del stream SSR y Vite inyecta
   * el preámbulo de react-refresh en dev) y `https://grok.com` (chrome de la
   * plataforma: extensions.js). La app no renderiza HTML de terceros (React
   * escapa todo; no hay dangerouslySetInnerHTML), así que el resto de la
   * política mantiene el valor: object-src none, base-uri, form-action e img
   * restringidos. `img-src data:` es indispensable: las fotos de los
   * departamentos se guardan como data URLs. `style-src 'unsafe-inline'` cubre
   * los atributos style que React genera (p. ej. retrasos de animación).
   * En dev se permite además ws:/wss: para el HMR de Vite.
   */
  const contentSecurityPolicy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://grok.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com" +
      (production ? "" : " ws: wss: ws://localhost:* ws://127.0.0.1:*"),
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  return {
    "content-security-policy": contentSecurityPolicy,
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    // Apaga APIs del navegador que la app no usa (cámara, micrófono, GPS…).
    "permissions-policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), interest-cohort=()",
    // Aísla el documento en su propio grupo de agentes de navegación.
    "cross-origin-opener-policy": "same-origin",
    "origin-agent-cluster": "?1",
  };
}
