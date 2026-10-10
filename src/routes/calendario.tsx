import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { agendaOn, longDate, tenureLabel } from "@/lib/rentals.logic";
import { useRentals } from "@/lib/use-rentals";

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
  const apartments = portfolio.data?.apartments ?? [];
  const holidayList = holidays.data ?? [];
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl">Agenda</h1>
        <p className="mt-1 text-sm text-muted">
          Rentas, luz, agua, ingresos, años de contrato, vencimientos y feriados de México.
        </p>
      </header>
      <div className="agenda rounded-xl border border-line bg-raised p-3">
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
      <section className="space-y-2">
        <h2 className="font-display text-2xl">{longDate(iso)}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted">Nada marcado este día.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-xl border border-line px-4 py-3">
                {item.apartmentId ? (
                  <Link to="/depto/$id" params={{ id: item.apartmentId }} className="block">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted">{item.detail}</p>
                  </Link>
                ) : (
                  <>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-muted">{item.detail}</p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="font-display text-2xl">Cuánto llevan rentados</h2>
        <ul className="space-y-2">
          {apartments.filter((apt) => apt.ocupado).length === 0 ? (
            <li className="text-sm text-muted">Ningún departamento está rentado.</li>
          ) : (
            apartments
              .filter((apt) => apt.ocupado)
              .map((apt) => (
                <li key={apt.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <Link to="/depto/$id" params={{ id: apt.id }}>
                    {apt.nombre}
                  </Link>
                  <span className="text-muted">
                    {tenureLabel(apt.ingreso ?? apt.contratoInicio, today)}
                  </span>
                </li>
              ))
          )}
        </ul>
      </section>
    </div>
  );
}
