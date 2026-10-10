import { createFileRoute } from "@tanstack/react-router";

/**
 * El inicio de sesión fue eliminado. Esta ruta ya no hace nada: responde 404
 * para cualquier petición a `/api/auth/*`.
 */
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: () => new Response("Not Found", { status: 404 }),
      POST: () => new Response("Not Found", { status: 404 }),
    },
  },
});
