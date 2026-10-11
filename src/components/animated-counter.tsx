import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motion";

/**
 * Contador animado para montos: cuenta hasta el valor con ease-out cubic.
 * Con movimiento reducido salta directo al valor final. Las cifras usan
 * números tabulares (`.num`) para que el ancho no "baile" mientras cuenta.
 */
export function AnimatedCounter({
  value,
  format,
  duration = 700,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const settledRef = useRef(value);
  useEffect(() => {
    if (reduced) {
      settledRef.current = value;
      setDisplay(value);
      return;
    }
    const from = settledRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else settledRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced, duration]);
  return <span className={cn("num", className)}>{format(display)}</span>;
}

/**
 * Anillo de progreso accesible (anuncia el porcentaje con texto): trazo con
 * gradiente cálido y resplandor suave sobre una pista hundida.
 */
export function ProgressRing({
  value,
  max,
  size = 84,
  stroke = 9,
  label,
  className,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const gradientId = useId();
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const complete = pct >= 1;
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {/* Halo detrás del anillo cuando ya se cobró todo */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full blur-xl transition-opacity duration-500",
          complete ? "bg-sage/35 opacity-100" : "bg-accent/20 opacity-70",
        )}
      />
      <svg width={size} height={size} className="relative -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={complete ? "#b6d18a" : "#f0b189"} />
            <stop offset="100%" stopColor={complete ? "var(--color-sage)" : "var(--color-accent)"} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{
            transition: reduced ? "none" : "stroke-dashoffset 800ms cubic-bezier(0.2, 0, 0, 1)",
          }}
        />
      </svg>
      <span className="num absolute inset-0 grid place-items-center font-display text-lg text-fg">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}
