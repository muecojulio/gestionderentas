import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Clock,
  Droplets,
  FileSignature,
  KeyRound,
  PartyPopper,
  Sun,
  Wallet,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/reveal";
import { Badge, Card, IconTile, SectionTitle } from "@/components/surface";
import { agendaOn, longDate, tenureLabel, type AgendaItem } from "@/lib/rentals.logic";
import { useRentals } from "@/lib/use-rentals";
import { toneStyle, type Tone } from "@/lib/tones";

export const Route = createFileRoute("/calendario")({ component: Calendario });

function localIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}

/** Cada evento de la agenda tiene su icono y su color (ver `agendaOn`). */
const KIND: Record<
  string,
  { tone: Tone; icon: typeof Wallet; label: string }
> = {
  h: { tone: "muted", icon: Sun, label: "Feriado" },
  r: { tone: "accent", icon: Wallet, label: "Renta" },
  l: { tone: "amber", icon: Zap, label: "Luz" },
  a: { tone: "azure", icon: Droplets, label: "Agua" },
  i: { tone: "sage", icon: KeyRound, label: "Ingreso" },
  ci: { tone: "iris", icon: FileSignature, label: "Inicio de contrato" },
  cf: { tone: "crimson", icon: FileSignature, label: "Vencimiento" },
  an: { tone: "iris", icon: PartyPopper, label: "Aniversario" },
};

function kindOf(item: AgendaItem) {
  return KIND[item.id.slice(0, item.id.indexOf("-"))] ?? KIND.r;
}

function Calendario() {
  const { portfolio, holidays } = useRentals();
  const serverToday = portfolio.data?.today;
  const [picked, setPicked] = useState<string | null>(null);
  const [month, setMonth] = useState<Date>(() => new Date());
  const iso = picked ?? serverToday ?? localIso(new Date());
  const selected = isoToLocal(iso);
  useEffect(() => {
    if (serverToday && !picked) setMonth(isoToLocal(serverToday));
  }, [serverToday, picked]);
  const apartments = useMemo(() => portfolio.data?.apartments ?? [], [portfolio.data]);
  const holidayList = useMemo(() => holidays.data ?? [], [holidays.data]);
  const marked = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const count = new Date(year, monthIndex + 1, 0).getDate();
    const dates: Date[] = [];
    for (let day = 1; day <= count; day += 1) {
      const dayIso = localIso(new Date(year, monthIndex, day));
      if (agendaOn(dayIso, apartments, holidayList).length > 0) {
        dates.push(new Date(year, monthIndex, day));
      }
    }
    return dates;
  }, [month, apartments, holidayList]);
  const items = agendaOn(iso, apartments, holidayList);
  const today = serverToday ?? iso;
  const rented = apartments.filter((apt) => apt.ocupado);

  return (
    <div className="space-y-7">
      <SectionTitle
        eyebrow="Agenda"
        title="Qué toca y cuándo"
        detail="Rentas, luz, agua, ingresos, años de contrato, vencimientos y feriados de México."
        icon={<CalendarDays size={18} aria-hidden />}
      />

      <Card spotlight className="rise overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
          <p className="font-display text-xl text-fg capitalize">
            {format(month, "MMMM yyyy", { locale: es })}
          </p>
          <Badge tone={marked.length > 0 ? "accent" : "muted"} dot={marked.length > 0}>
            {marked.length} {marked.length === 1 ? "día marcado" : "días marcados"}
          </Badge>
        </div>
        <div className="agenda p-3">
          <DayPicker
            mode="single"
            locale={es}
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={(date) => date && setPicked(localIso(date))}
            modifiers={{ mark: marked }}
            modifiersClassNames={{ mark: "day-mark" }}
          />
        </div>
        <p className="flex items-center gap-2 border-t border-line-soft px-4 py-2.5 text-[11px] text-muted">
          <span aria-hidden className="inline-block h-0.5 w-4 rounded-full bg-accent" />
          Los días con una rayita abajo tienen algo apuntado: tócalos para verlo.
        </p>
      </Card>

      <section className="space-y-3">
        <SectionTitle
          eyebrow="Día elegido"
          title={longDate(iso)}
          icon={<Clock size={18} aria-hidden />}
          tone={items.length > 0 ? "accent" : "muted"}
          detail={
            items.length > 0
              ? `${items.length} ${items.length === 1 ? "evento" : "eventos"} este día`
              : undefined
          }
        />
        {items.length === 0 ? (
          <Card className="px-4 py-6 text-center" spotlight={false}>
            <p className="font-display text-xl text-fg">Nada marcado este día</p>
            <p className="mt-1 text-sm text-muted">
              Busca los días con rayita: ahí sí hay rentas, luz, agua o contratos.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => {
              const kind = kindOf(item);
              const Icon = kind.icon;
              return (
                <li key={item.id}>
                  <Reveal index={index}>
                    {item.apartmentId ? (
                      <Link
                        to="/depto/$id"
                        params={{ id: item.apartmentId }}
                        className="rail card card-hover spotlight press group flex items-center gap-3 py-3 pr-3 pl-4"
                        style={toneStyle(kind.tone)}
                      >
                        <IconTile tone={kind.tone} size={38}>
                          <Icon size={17} />
                        </IconTile>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-fg">
                            {item.title}
                          </span>
                          <span className="block truncate text-sm text-muted">{item.detail}</span>
                        </span>
                        <ChevronRight
                          size={16}
                          aria-hidden
                          className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
                        />
                      </Link>
                    ) : (
                      <div
                        className="rail card flex items-center gap-3 py-3 pr-3 pl-4"
                        style={toneStyle(kind.tone)}
                      >
                        <IconTile tone={kind.tone} size={38}>
                          <Icon size={17} />
                        </IconTile>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-fg">
                            {item.title}
                          </span>
                          <span className="block truncate text-sm text-muted">{item.detail}</span>
                        </span>
                        <Badge tone={kind.tone}>{kind.label}</Badge>
                      </div>
                    )}
                  </Reveal>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle
          eyebrow="Antigüedad"
          title="Cuánto llevan rentados"
          detail="Se cuenta desde el ingreso o, si no lo anotaste, desde el inicio del contrato."
          icon={<Building2 size={18} aria-hidden />}
          tone="iris"
        />
        {rented.length === 0 ? (
          <Card className="px-4 py-6 text-center" spotlight={false}>
            <p className="font-display text-xl text-fg">Ninguna propiedad está rentada</p>
            <p className="mt-1 text-sm text-muted">
              En cuanto registres un inquilino verás aquí sus años y meses.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {rented.map((apt, index) => (
              <li key={apt.id}>
                <Reveal index={index % 6}>
                  <Link
                    to="/depto/$id"
                    params={{ id: apt.id }}
                    className="card card-hover spotlight press group flex items-center gap-3 p-3"
                    style={toneStyle("iris")}
                  >
                    <span className="relative shrink-0">
                      {apt.foto ? (
                        <img
                          src={apt.foto}
                          alt=""
                          loading="lazy"
                          className="size-12 rounded-lg border border-line object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="photo-fallback grid size-12 place-items-center rounded-lg border border-line"
                        >
                          <Building2 size={18} className="text-muted" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-fg">{apt.nombre}</span>
                      <span className="block truncate text-xs text-muted">
                        {apt.inquilino || "Inquilino sin nombre"}
                      </span>
                    </span>
                    <span className="num shrink-0 text-sm font-medium text-iris">
                      {tenureLabel(apt.ingreso ?? apt.contratoInicio, today)}
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
