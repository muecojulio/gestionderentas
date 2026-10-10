import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import { BellRing } from "lucide-react";
import {
  CONTRATO_AVISO_DIAS,
  RENTA_AVISO_DIAS,
  activateNotifications,
  notifState,
  sendTestNotification,
  silenceNotifications,
  type NotifState,
} from "@/lib/notifications";
import { computeAlerts, upcomingDue } from "@/lib/rentals.logic";
import { useRentals } from "@/lib/use-rentals";
import { Button, Toggle } from "@/components/ui";

export const Route = createFileRoute("/avisos")({ component: Avisos });

/** Qué decir según el estado de los avisos en este dispositivo. */
const STATE_HINT: Record<NotifState, string> = {
  on: "Prendidos: los avisos suenan en este dispositivo.",
  muted: "El navegador los permite, pero el interruptor está apagado.",
  default: "Falta dar el permiso: prende el interruptor para activarlos.",
  blocked:
    "El navegador los bloqueó. Ábrelo desde la app instalada (en iPhone: Compartir → Agregar a inicio) y vuelve a intentar.",
  unsupported: "Este navegador no admite avisos. Aquí siguen apareciendo en pantalla.",
};

function Avisos() {
  const { portfolio, holidays } = useRentals();
  const [state, setState] = useState<NotifState>("unsupported");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setState(notifState());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function toggle(next: boolean) {
    if (!next) {
      silenceNotifications();
      setState(notifState());
      return;
    }
    const ok = await activateNotifications();
    setState(notifState());
    if (!ok) {
      toast.error("El navegador no dio permiso para los avisos.");
    } else {
      toast.success("Avisos prendidos");
    }
  }

  const data = portfolio.data;
  const holidayList = holidays.data ?? [];
  const alerts = data ? computeAlerts(data.apartments, data.today, holidayList) : [];
  const lateIds = new Set(
    alerts.filter((alert) => alert.kind === "mora").map((alert) => alert.apartmentId),
  );
  const soon =
    data?.apartments.filter((apt) => {
      if (!apt.ocupado || !apt.diaPago || lateIds.has(apt.id)) return false;
      const { daysUntil } = upcomingDue(apt.diaPago, data.today);
      return daysUntil > 1 && daysUntil <= 7;
    }) ?? [];

  /** Manda un aviso de ejemplo para comprobar que sí suenan en el teléfono. */
  async function test() {
    setTesting(true);
    try {
      const ok = await sendTestNotification();
      setState(notifState());
      if (ok) toast.success("Aviso enviado: revisa las notificaciones del teléfono");
      else toast.error("El navegador no dejó mostrar el aviso.");
    } finally {
      setTesting(false);
    }
  }

  if (portfolio.isPending) {
    return (
      <div className="mx-auto max-w-xl space-y-6" aria-busy="true" aria-live="polite">
        <div className="space-y-2">
          <div className="skeleton h-10 w-32" />
          <div className="skeleton h-4 w-full" />
        </div>
        <div className="skeleton h-16 w-full" />
        <div className="space-y-2">
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="rise">
        <h1 className="font-display text-4xl">Avisos</h1>
        <p className="mt-2 text-sm text-muted">Esto es lo que la app te avisa:</p>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          <li>
            · {RENTA_AVISO_DIAS === 1 ? "Un día antes" : `${RENTA_AVISO_DIAS} días antes`} de que
            toque la renta de cada departamento, y el mismo día.
          </li>
          <li>· Si ya pasó el día y no la marcaste como recibida, cuántos días lleva sin pagar.</li>
          <li>
            · Desde {CONTRATO_AVISO_DIAS} días antes de que venza el contrato, y cada día hasta que
            vence.
          </li>
          <li>
            · Desde 30 días antes de que se cumpla un año de contrato (para el aumento de renta).
          </li>
          <li>· Los días de pago de luz y agua, en la agenda.</li>
        </ul>
      </header>
      <Toggle
        checked={state === "on"}
        onCheckedChange={(value) => void toggle(value)}
        label="Notificaciones del teléfono"
        hint={STATE_HINT[state]}
      />
      <div className="space-y-1">
        <Button
          tone="quiet"
          className="w-full"
          onClick={() => void test()}
          disabled={testing || state !== "on"}
        >
          <BellRing size={16} aria-hidden />
          {testing ? "Enviando…" : "Mandar un aviso de prueba"}
        </Button>
        {state === "on" ? null : (
          <p className="text-xs text-muted">
            Prende el interruptor de arriba para poder probarlos.
          </p>
        )}
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-muted">Hoy no hay avisos pendientes.</p>
      ) : (
        <ul className="space-y-2" aria-label="Avisos pendientes">
          {alerts.map((alert, index) => (
            <li key={alert.key} className="rise" style={{ animationDelay: `${index * 60}ms` }}>
              <Link
                to="/depto/$id"
                params={{ id: alert.apartmentId }}
                className="press lift block rounded-xl border border-accent/40 bg-accent/10 px-4 py-3"
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
          Compartir y elige Agregar a inicio. Instalada suena aunque no la tengas a la vista.
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
