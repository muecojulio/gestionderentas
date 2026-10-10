import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/motion";

/**
 * Contador animado para montos: cuenta hasta el valor con ease-out cubic.
 * Con movimiento reducido salta directo al valor final.
 */
export function AnimatedCounter({
  value,
  format,
  duration = 700,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
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
  return <>{format(display)}</>;
}

/** Anillo de progreso accesible (anuncia el porcentaje con texto). */
export function ProgressRing({
  value,
  max,
  size = 76,
  stroke = 8,
  label,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label: string;
}) {
  const reduced = useReducedMotion();
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      role="img"
      aria-label={label}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
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
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{
            transition: reduced ? "none" : "stroke-dashoffset 700ms cubic-bezier(0.2, 0, 0, 1)",
          }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-lg text-fg">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}
