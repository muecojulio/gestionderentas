import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { computeAlerts, upcomingDue } from "@/lib/rentals.logic";
import { useRentals } from "@/lib/use-rentals";
import { Button, Toggle } from "@/components/ui";

export const Route = createFileRoute("/avisos")({ component: Avisos });

function Avisos() {
  const { portfolio, holidays } = useRentals();
  const [enabled, setEnabled] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setEnabled(
      localStorage.getItem("gr-notif") === "on" &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted",
    );
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function toggle(next: boolean) {
    if (!next) {
      localStorage.setItem("gr-notif", "off");
      setEnabled(false);
      return;
    }
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    const ok = permission === "granted";
    localStorage.setItem("gr-notif", ok ? "on" : "off");
    setEnabled(ok);
  }

  const data = portfolio.data;
  const alerts = data ? computeAlerts(data.apartments, data.today, holidays.data ?? []) : [];
  const lateIds = new Set(alerts.filter((alert) => alert.kind === "mora").map((alert) => alert.apartmentId));
  const soon =
    data?.apartments.filter((apt) => {
      if (!apt.ocupado || !apt.diaPago || lateIds.has(apt.id)) return false;
      const { daysUntil } = upcomingDue(apt.diaPago, data.today);
      return daysUntil > 1 && daysUntil <= 7;
    }) ?? [];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">Avisos</h1>
        <p className="mt-2 text-sm text-muted">
          Un día antes de la renta. Si ya pasó el día y no la marcaste como recibida, aquí verás cuántos días
          lleva sin pagar. También desde 35 días antes de que venza el contrato.
        </p>
      </header>
      <Toggle
        checked={enabled}
        onCheckedChange={(value) => void toggle(value)}
        label="Notificaciones del teléfono"
        hint="En iPhone funcionan mejor con la app instalada en la pantalla de inicio"
      />
      {alerts.length === 0 ? (
        <p className="text-sm text-muted">Hoy no hay avisos pendientes.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li key={alert.key}>
              <Link
                to="/depto/$id"
                params={{ id: alert.apartmentId }}
                className="press block rounded-xl border border-accent/40 bg-accent/10 px-4 py-3"
              >
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-sm text-muted">{alert.detail}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {soon.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-display text-2xl">Esta semana</h2>
          <ul className="space-y-2">
            {soon.map((apt) => {
              const due = upcomingDue(apt.diaPago as number, data?.today ?? "");
              return (
                <li key={apt.id} className="text-sm text-muted">
                  {apt.nombre}: renta en {due.daysUntil} días
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <section className="space-y-3 rounded-xl border border-line p-4">
        <h2 className="font-display text-2xl">Instalar en el teléfono</h2>
        <p className="text-sm text-muted">
          No es una página suelta: se instala como aplicación. En iPhone abre el instructivo, pulsa
          Compartir y elige Agregar a inicio.
        </p>
        <div className="flex flex-col gap-2">
          <a href="/?install=1&platform=ios">
            <Button className="w-full">Instalar en iPhone</Button>
          </a>
          {installEvent ? (
            <Button
              tone="quiet"
              onClick={() => {
                void installEvent.prompt();
                setInstallEvent(null);
              }}
            >
              Instalar en Android
            </Button>
          ) : null}
        </div>
      </section>
      <div className="space-y-3 border-t border-line pt-4">
        <UserButton />
        <Link to="/privacidad" className="block text-sm text-muted">
          Privacidad
        </Link>
      </div>
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};
