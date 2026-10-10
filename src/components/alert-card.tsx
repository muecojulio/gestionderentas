import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { IconTile } from "@/components/surface";
import { ALERT_META } from "@/lib/alert-meta";
import type { Alert } from "@/lib/rentals.logic";
import { toneStyle } from "@/lib/tones";

/** Tarjeta de aviso: abre la ficha de la propiedad que lo provoca. */
export function AlertCard({ alert, showKind = false }: { alert: Alert; showKind?: boolean }) {
  const meta = ALERT_META[alert.kind];
  const Icon = meta.icon;
  return (
    <Link
      to="/depto/$id"
      params={{ id: alert.apartmentId }}
      className="rail card card-hover spotlight press group flex items-center gap-3 py-3 pr-3 pl-4"
      style={toneStyle(meta.tone)}
    >
      <IconTile tone={meta.tone} size={38}>
        <Icon size={17} />
      </IconTile>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">{alert.title}</span>
        <span className="block truncate text-sm text-muted">{alert.detail}</span>
      </span>
      {showKind ? (
        <span className="hidden shrink-0 text-[11px] font-medium tracking-wide text-muted uppercase sm:block">
          {meta.label}
        </span>
      ) : null}
      <ChevronRight
        size={16}
        aria-hidden
        className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
      />
    </Link>
  );
}
