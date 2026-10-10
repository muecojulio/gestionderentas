import { createMiddleware } from "@tanstack/react-start";

/**
 * El inicio de sesión fue eliminado por completo. Este middleware se conserva
 * para no tener que editar cada server function que ya lo usa: resuelve
 * siempre el id del usuario local fijo (`"dev-user"`) sin tocar cookies,
 * sesiones ni Better Auth.
 */
export const authMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => next())
  .server(async ({ next }) => {
    // Mismo id que devolvía el modo sin-auth de la plantilla, para que los
    // datos existentes sigan perteneciendo a este único dueño.
    return next({ context: { userId: "dev-user" } });
  });
