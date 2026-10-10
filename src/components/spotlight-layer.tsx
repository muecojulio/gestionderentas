import { useEffect } from "react";
import { installSpotlight } from "@/lib/spotlight";

/**
 * Capa invisible que alimenta el foco que sigue al cursor en las tarjetas
 * (`.spotlight`). Un solo listener global, sin re-renders: escribe `--mx`/`--my`
 * en la tarjeta bajo el puntero. Se apaga sola con puntero táctil o con
 * movimiento reducido.
 */
export function SpotlightLayer() {
  useEffect(() => installSpotlight(), []);
  return null;
}
