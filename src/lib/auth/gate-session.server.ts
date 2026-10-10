/** Inicio de sesión eliminado: plugin nulo que no hace nada. */

export const GATE_PROVIDER_ID = "grok-gate";

/** Devuelve un plugin Better Auth "vacío"; no se usa porque el auth está desmontado. */
export function gateIdentitySessions() {
  return {
    id: "grok-gate-identity",
    hooks: { before: [] as unknown[] },
  };
}
