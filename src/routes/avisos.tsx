import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  CalendarClock,
  Droplets,
  FileSignature,
  Smartphone,
  TriangleAlert,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AlertCard } from "@/components/alert-card";
import { Reveal } from "@/components/reveal";
import { Badge, Card, IconTile, SectionTitle } from "@/components/surface";
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
import { toneStyle } from "@/lib/tones";

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

/** Reglas de aviso, con su icono y su color, explicadas de un vistazo. */
const RULES = [
  {
    icon: CalendarClock,
    tone: "accent" as const,
    text:
      RENTA_AVISO_DIAS === 1
        ? "Un día antes de que toque la renta de cada propiedad, y el mismo día."
        : `${RENTA_AVISO_DIAS} días antes de que toque la renta de cada propiedad, y el mismo día.`,
  },
  {
    icon: TriangleAlert,
    tone: "crimson" as const,
    text: "Si ya pasó el día y no la marcaste como recibida, cuántos días lleva sin pagar.",
  },
  {
    icon: FileSignature,
    tone: "iris" as const,
    text: `Desde ${CONTRATO_AVISO_DIAS} días antes de que venza el contrato, y cada día hasta que vence.`,
  },
  {
    icon: TrendingUp,
    tone: "amber" as const,
    text: "Desde 30 días antes de que se cumpla un año de contrato, para el aumento de renta.",
  },
  {
    icon: Zap,
    tone: "amber" as const,
    text: "Los días de pago de luz, con su monto, en la agenda.",
  },
  {
    icon: Droplets,
    tone: "azure" as const,
    text: "Los días de agua y los feriados oficiales de México, también en la agenda.",
  },
];

function Avisos() {
  const { portfolio, holidays } = useRentals();
  const [state, setState] = useState<NotifState>("unsupported");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setState(notifState());
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
      <div className="mx-auto max-w-2xl space-y-6" aria-busy="true" aria-live="polite">
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-56 w-full" />
        <div className="skeleton h-16 w-full" />
        <div className="space-y-2">
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <SectionTitle
        eyebrow="Notificaciones"
        title="Avisos"
        detail="Esto es lo que la app te avisa, y cómo comprobar que sí suena."
        icon={<BellRing size={18} aria-hidden />}
        tone="amber"
        action={
          <Badge tone={state === "on" ? "sage" : state === "blocked" ? "crimson" : "muted"} dot>
            {state === "on" ? "Activos" : state === "blocked" ? "Bloqueados" : "Apagados"}
          </Badge>
        }
      />

      <Card spotlight className="space-y-3 p-4 md:p-5">
        <h2 className="font-display text-2xl text-fg">Qué te avisa</h2>
        <ul className="space-y-2.5">
          {RULES.map((rule) => {
            const Icon = rule.icon;
            return (
              <li key={rule.text} className="flex items-start gap-3">
                <IconTile tone={rule.tone} size={32} className="mt-0.5 rounded-lg">
                  <Icon size={15} />
                </IconTile>
                <p className="min-w-0 text-sm text-muted">{rule.text}</p>
              </li>
            );
          })}
        </ul>
        <p className="well px-3 py-2 text-xs text-muted">
          Los avisos del contrato empiezan {CONTRATO_AVISO_DIAS} días antes del vencimiento y los de
          renta {RENTA_AVISO_DIAS === 1 ? "un día" : `${RENTA_AVISO_DIAS} días`} antes del día de
          pago.
        </p>
      </Card>

      <Toggle
        checked={state === "on"}
        onCheckedChange={(value) => void toggle(value)}
        label="Notificaciones del teléfono"
        hint={STATE_HINT[state]}
        tone={state === "on" ? "sage" : "amber"}
        icon={
          <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-fg/6 text-muted">
            <Smartphone size={14} />
          </span>
        }
      />

      <div className="space-y-2">
        <Button
          tone="quiet"
          size="lg"
          className="w-full"
          onClick={() => void test()}
          disabled={testing || state !== "on"}
        >
          <BellRing size={16} aria-hidden />
          {testing ? "Enviando…" : "Mandar un aviso de prueba"}
        </Button>
        {state === "on" ? null : (
          <p className="text-center text-xs text-muted">
            Prende el interruptor de arriba para poder probarlos.
          </p>
        )}
      </div>

      <section className="space-y-3">
        <SectionTitle
          eyebrow="Para hoy"
          title={alerts.length > 0 ? `${alerts.length} avisos pendientes` : "Sin avisos pendientes"}
          icon={<TriangleAlert size={18} aria-hidden />}
          tone={alerts.length > 0 ? "crimson" : "sage"}
        />
        {alerts.length === 0 ? (
          <Card className="flex items-center gap-3 p-4" spotlight={false}>
            <IconTile tone="sage" size={40}>
              <BadgeCheck size={19} />
            </IconTile>
            <p className="text-sm text-muted">
              Todo en orden: nadie debe renta y ningún contrato está por vencer.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2" aria-label="Avisos pendientes">
            {alerts.map((alert, index) => (
              <li key={alert.key}>
                <Reveal index={index % 8}>
                  <AlertCard alert={alert} showKind />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </section>

      {soon.length > 0 ? (
        <section className="space-y-3">
          <SectionTitle
            eyebrow="Próximos 7 días"
            title="Esta semana"
            icon={<CalendarClock size={18} aria-hidden />}
          />
          <ul className="grid gap-2 sm:grid-cols-2">
            {soon.map((apt) => {
              const due = upcomingDue(apt.diaPago as number, data?.today ?? "");
              return (
                <li key={apt.id}>
                  <Link
                    to="/depto/$id"
                    params={{ id: apt.id }}
                    className="card card-hover spotlight press flex items-center justify-between gap-3 p-3"
                    style={toneStyle("accent")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-fg">{apt.nombre}</span>
                      <span className="block truncate text-xs text-muted">
                        {apt.inquilino || "Inquilino sin nombre"}
                      </span>
                    </span>
                    <Badge tone="accent">en {due.daysUntil} días</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <Link
        to="/instalar"
        className="press card card-hover spotlight flex items-center gap-3 p-4"
      >
        <IconTile tone="accent" size={40}>
          <Smartphone size={18} />
        </IconTile>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg leading-tight text-fg">
            Instalar en cualquier aparato
          </span>
          <span className="block text-xs text-muted">
            Código QR y botones para iPhone, Android, tablet o computadora.
          </span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-muted" aria-hidden />
      </Link>
    </div>
  );
}
