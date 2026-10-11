import { useMemo } from "react";
import qrcode from "qrcode-generator";

/**
 * Código QR dibujado como SVG puro, generado en este dispositivo con
 * `qrcode-generator` (sin dependencias, sin red): el texto nunca sale de la
 * pantalla hacia ningún servicio externo de "generación de QR en línea".
 * Vectorial: se ve nítido a cualquier tamaño, incluso impreso.
 */
export function QrCode({
  value,
  size = 220,
  className,
  tone = "#f4f1e9",
  background = "transparent",
}: {
  /** Texto o URL a codificar. */
  value: string;
  /** Lado del SVG en px (el QR es siempre cuadrado). */
  size?: number;
  className?: string;
  /** Color de los módulos oscuros. */
  tone?: string;
  /** Color de fondo (detrás del margen incluido). */
  background?: string;
}) {
  const { cells, count } = useMemo(() => {
    // Nivel de corrección "M" (≈15%): suficiente margen de error para una
    // pantalla o una impresión sin inflar demasiado la densidad de la
    // cuadrícula. Tipo 0 deja que la librería elija el tamaño mínimo que
    // alcanza para el texto.
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const dark: boolean[][] = [];
    for (let row = 0; row < n; row += 1) {
      const line: boolean[] = [];
      for (let col = 0; col < n; col += 1) line.push(qr.isDark(row, col));
      dark.push(line);
    }
    return { cells: dark, count: n };
  }, [value]);

  // Margen (zona en blanco) de 4 módulos: lo exige el estándar para que los
  // lectores de cámara distingan el código del fondo.
  const margin = 4;
  const viewBox = count + margin * 2;

  return (
    <svg
      role="img"
      aria-label={`Código QR: ${value}`}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      width={size}
      height={size}
      className={className}
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={viewBox} height={viewBox} fill={background} />
      {cells.map((line, row) =>
        line.map((on, col) =>
          on ? (
            <rect
              key={`${row}-${col}`}
              x={col + margin}
              y={row + margin}
              width={1}
              height={1}
              fill={tone}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
