import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { toneStyle, TONE_BORDER, TONE_SOFT_BG, TONE_TEXT, type Tone } from "@/lib/tones";

/**
 * Superficies reutilizables de la app: tarjetas con profundidad, cabeceras de
 * sección, tejas de icono, insignias y mosaicos de cifras. Todo se apoya en
 * las utilidades de `styles.css` (`.card`, `.spotlight`, `.beam`, `.tile`…).
 */

export function Card({
  children,
  className,
  hero = false,
  spotlight = true,
  beam = false,
  hover = true,
  style,
  tone = "accent",
}: {
  children: ReactNode;
  className?: string;
  /** Superficie destacada (héroe de la pantalla). */
  hero?: boolean;
  /** Foco que sigue al cursor en dispositivos con ratón. */
  spotlight?: boolean;
  /** Haz que recorre el borde: solo para la tarjeta más importante. */
  beam?: boolean;
  hover?: boolean;
  style?: CSSProperties;
  tone?: Tone;
}) {
  return (
    <div
      className={cn(
        "card",
        hero && "card-hero",
        spotlight && "spotlight",
        beam && "beam",
        hover && "card-hover",
        className,
      )}
      style={toneStyle(tone, style)}
    >
      {children}
    </div>
  );
}

/** Teja de icono con el color del tono (luz ámbar, agua azul, mora carmín…). */
export function IconTile({
  tone = "accent",
  size = 40,
  children,
  className,
  style,
}: {
  tone?: Tone;
  size?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={cn("tile", className)}
      style={toneStyle(tone, { width: size, height: size, ...style })}
    >
      {children}
    </span>
  );
}

/** Cabecera de sección: antetítulo, título display, detalle y acción. */
export function SectionTitle({
  eyebrow,
  title,
  detail,
  icon,
  tone = "accent",
  action,
  className,
  level = 2,
}: {
  eyebrow?: string;
  title: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  action?: ReactNode;
  className?: string;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <IconTile tone={tone} size={38}>
            {icon}
          </IconTile>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              {eyebrow}
            </p>
          ) : null}
          <Heading className="font-display text-2xl leading-tight text-fg">{title}</Heading>
          {detail ? <p className="mt-0.5 text-sm text-muted">{detail}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Insignia de estado: punto + texto (el estado no depende solo del color). */
export function Badge({
  children,
  tone = "muted",
  dot = false,
  className,
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        TONE_BORDER[tone],
        TONE_SOFT_BG[tone],
        TONE_TEXT[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden
          className={cn("size-1.5 shrink-0 rounded-full bg-current", tone === "sage" && "pulse-dot")}
        />
      ) : null}
      {children}
    </span>
  );
}

/** Mosaico de cifra: icono, etiqueta, número grande y nota. */
export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "accent",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("card spotlight card-hover p-4", className)} style={toneStyle(tone)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{label}</p>
        {icon ? (
          <IconTile tone={tone} size={30} className="rounded-lg">
            {icon}
          </IconTile>
        ) : null}
      </div>
      <p className={cn("num mt-2 font-display text-3xl leading-none", TONE_TEXT[tone])}>{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Fila etiqueta/valor de las fichas, con separador sutil. */
export function DataRow({
  label,
  value,
  tone,
  emphasis = false,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: Tone;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line-soft py-2 text-sm last:border-b-0">
      <span className="text-muted">{label}</span>
      <span
        className={cn(
          "text-right",
          emphasis && "font-display text-lg",
          tone ? TONE_TEXT[tone] : "text-fg",
        )}
      >
        {value}
      </span>
    </div>
  );
}
