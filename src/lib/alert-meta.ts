import {
  CalendarClock,
  FileSignature,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { Alert } from "@/lib/rentals.logic";
import type { Tone } from "@/lib/tones";

/**
 * Cada tipo de aviso tiene su icono, su color y su nombre. Los tres juntos:
 * el estado nunca se reconoce solo por el color.
 */
export const ALERT_META: Record<Alert["kind"], { tone: Tone; icon: LucideIcon; label: string }> = {
  mora: { tone: "crimson", icon: TriangleAlert, label: "Mora" },
  renta: { tone: "accent", icon: CalendarClock, label: "Renta por cobrar" },
  contrato: { tone: "iris", icon: FileSignature, label: "Contrato" },
  incremento: { tone: "amber", icon: TrendingUp, label: "Aumento de renta" },
};
