import { normName } from "./rentals.logic.ts";

/**
 * Resaltado de la coincidencia en el combobox. `normName` quita diacríticos,
 * mayúsculas y signos, así que no se puede buscar directamente sobre la
 * etiqueta original: aquí se normaliza carácter por carácter y se guarda el
 * mapa de vuelta a los índices originales.
 */
export type Highlight = { before: string; hit: string; after: string };

function normChar(char: string): string {
  return char
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "");
}

/** Devuelve el trozo coincidente para pintarlo en negrita, o `null`. */
export function highlightMatch(label: string, query: string): Highlight | null {
  const needle = normName(query);
  if (!needle) return null;
  const text = label.replace(/\s+/g, " ");
  const chars = Array.from(text);
  // Cadena normalizada + índice original de cada carácter normalizado.
  let flat = "";
  const origin: number[] = [];
  chars.forEach((char, index) => {
    for (const piece of normChar(char)) {
      flat += piece;
      origin.push(index);
    }
  });
  const at = flat.indexOf(needle);
  if (at < 0) return null;
  const start = origin[at];
  const lastPiece = origin[at + needle.length - 1];
  const end = lastPiece == null ? start + 1 : lastPiece + 1;
  return {
    before: text.slice(0, start),
    hit: text.slice(start, end),
    after: text.slice(end),
  };
}
