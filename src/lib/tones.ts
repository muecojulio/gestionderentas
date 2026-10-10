import type { CSSProperties } from "react";

/**
 * Tonos semánticos de la interfaz. Cada tono tiene un color, un icono propio y
 * un texto: el color nunca es el único que comunica el estado (regla de
 * accesibilidad del proyecto).
 */
export type Tone = "accent" | "sage" | "crimson" | "amber" | "azure" | "iris" | "muted";

const TONE_COLOR: Record<Tone, string> = {
  accent: "var(--color-accent)",
  sage: "var(--color-sage)",
  crimson: "var(--color-crimson)",
  amber: "var(--color-amber)",
  azure: "var(--color-azure)",
  iris: "var(--color-iris)",
  muted: "var(--color-muted)",
};

/** Clases Tailwind por tono para textos, bordes y fondos suaves. */
export const TONE_TEXT: Record<Tone, string> = {
  accent: "text-accent",
  sage: "text-sage",
  crimson: "text-crimson",
  amber: "text-amber",
  azure: "text-azure",
  iris: "text-iris",
  muted: "text-muted",
};

export const TONE_SOFT_BG: Record<Tone, string> = {
  accent: "bg-accent/14",
  sage: "bg-sage/14",
  crimson: "bg-crimson/14",
  amber: "bg-amber/14",
  azure: "bg-azure/14",
  iris: "bg-iris/14",
  muted: "bg-muted/12",
};

export const TONE_BORDER: Record<Tone, string> = {
  accent: "border-accent/40",
  sage: "border-sage/40",
  crimson: "border-crimson/40",
  amber: "border-amber/40",
  azure: "border-azure/40",
  iris: "border-iris/40",
  muted: "border-line",
};

/** Variables CSS para las utilidades que pintan con `--tone` / `--rail`. */
export function toneStyle(tone: Tone, extra?: CSSProperties): CSSProperties {
  return { ...extra, "--tone": TONE_COLOR[tone], "--rail": TONE_COLOR[tone] } as CSSProperties;
}

export function toneColor(tone: Tone): string {
  return TONE_COLOR[tone];
}
