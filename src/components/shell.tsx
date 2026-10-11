import { useCallback, useMemo, type CSSProperties, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CalendarDays,
  HardDrive,
  LayoutDashboard,
  Plus,
  QrCode,
  ShieldBan,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { computeAlerts, longDate } from "@/lib/rentals.logic";
import { useAlertNotifications } from "@/lib/use-alert-notifications";
import { useDataHealth, useRentals } from "@/lib/use-rentals";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/departamentos", label: "Deptos", icon: Building2 },
  { to: "/ingresos", label: "Ingresos", icon: Wallet },
  { to: "/calendario", label: "Agenda", icon: CalendarDays },
  { to: "/lista", label: "Lista", icon: ShieldBan },
  { to: "/privacidad", label: "Legal", icon: ShieldCheck },
  { to: "/instalar", label: "Instalar", icon: QrCode },
] as const;

function active(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  if (to === "/departamentos") {
    return (
      pathname.startsWith("/departamentos") ||
      pathname.startsWith("/depto") ||
      pathname === "/nuevo"
    );
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Marca de la app: teja con gradiente y resplandor + nombre en display. */
function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="tile size-10 rounded-xl"
        style={{ "--tone": "var(--color-accent)" } as CSSProperties}
      >
        <Building2 size={19} strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-xl leading-none text-fg">
          Gestión <span className="gradient-text">de rentas</span>
        </span>
        {compact ? null : (
          <span className="mt-1 block text-[11px] tracking-wide text-muted">
            Departamentos y accesorias
          </span>
        )}
      </span>
    </span>
  );
}

export function Frame({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { portfolio, holidays } = useRentals();
  const health = useDataHealth();
  // El servidor avisa de que su base no está: la app sigue funcionando porque
  // guarda todo en este dispositivo. Decirlo evita el susto de "¿dónde quedó
  // mi información?".
  const onDevice = health.data != null && !health.data.available;
  const today = portfolio.data?.today;
  const alerts = useMemo(
    () =>
      portfolio.data && today
        ? computeAlerts(portfolio.data.apartments, today, holidays.data ?? [])
        : [],
    [portfolio.data, today, holidays.data],
  );
  const refetch = portfolio.refetch;
  // Al volver a la pestaña (o cada pocos minutos) se piden los datos otra vez:
  // sin eso, una pestaña abierta de un día para otro seguiría calculando los
  // avisos con la fecha de ayer.
  const onWake = useCallback(() => {
    void refetch();
  }, [refetch]);
  // Un día antes de la renta y desde 35 días antes del vencimiento del contrato.
  useAlertNotifications(alerts, today, onWake);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl">
      {/* ── Barra lateral (escritorio) ─────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line-soft px-4 py-6 md:flex">
        <Link to="/" className="press rounded-xl px-2 py-1">
          <Brand />
        </Link>
        <nav aria-label="Principal" className="mt-8 flex flex-1 flex-col gap-1.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "press relative flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                  on ? "nav-on" : "text-muted hover:bg-fg/5 hover:text-fg",
                )}
              >
                {/* Riel activo: crece desde el centro */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1/2 left-0 h-7 w-1 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_14px_var(--color-accent)] transition-transform duration-200 ease-out",
                    on ? "scale-y-100" : "scale-y-0",
                  )}
                />
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-lg transition-colors duration-200",
                    on ? "bg-accent/18 text-accent" : "text-muted",
                  )}
                >
                  <Icon size={17} strokeWidth={1.85} aria-hidden />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Resumen del día: la barra lateral también informa */}
        <div className="card spotlight mt-4 p-3.5">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                alerts.length > 0 ? "pulse-dot bg-crimson text-crimson" : "bg-sage text-sage",
              )}
            />
            Hoy
          </p>
          <p className="mt-1.5 font-display text-lg leading-tight text-fg capitalize">
            {today ? longDate(today) : "Cargando…"}
          </p>
          <Link
            to="/avisos"
            className="press mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-soft"
          >
            <Bell size={13} aria-hidden />
            {alerts.length > 0
              ? `${alerts.length} ${alerts.length === 1 ? "aviso pendiente" : "avisos pendientes"}`
              : "Sin avisos pendientes"}
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Cabecera fija ─────────────────────────────────────────────── */}
        <header className="glass sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3 shadow-[0_10px_30px_-24px_rgb(0_0_0/0.9)] md:px-8">
          <Link to="/" className="press rounded-lg md:hidden">
            <Brand compact />
          </Link>
          <p className="hidden min-w-0 flex-1 truncate text-sm text-muted md:block">
            Tus departamentos y accesorias, en un solo lugar
          </p>
          <div className="flex items-center gap-2">
            <Link to="/nuevo" className="hidden sm:block">
              <span className="btn-primary sheen press lift inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium text-accent-fg">
                <Plus size={16} aria-hidden />
                Nueva propiedad
              </span>
            </Link>
            <Link
              to="/avisos"
              aria-label={
                alerts.length > 0 ? `Avisos: ${alerts.length} pendientes` : "Avisos: sin pendientes"
              }
              className="press lift btn-quiet relative grid size-11 place-items-center rounded-full"
            >
              <Bell size={18} strokeWidth={1.75} aria-hidden />
              {alerts.length > 0 ? (
                <span className="num absolute -right-1 -bottom-1 grid min-w-5 place-items-center rounded-full border border-bg bg-crimson px-1 text-[10px] font-bold text-white shadow-[0_0_14px_-2px_var(--color-crimson)]">
                  {alerts.length}
                </span>
              ) : (
                <span
                  aria-hidden
                  className="pulse-dot absolute top-2 right-2 size-2 rounded-full bg-sage text-sage"
                />
              )}
            </Link>
          </div>
        </header>

        {onDevice ? (
          <div className="rail card mx-4 mt-4 flex items-start gap-3 px-4 py-3 md:mx-8" style={{ "--rail": "var(--color-azure)" } as CSSProperties}>
            <span aria-hidden className="tile mt-0.5 size-8 rounded-lg" style={{ "--tone": "var(--color-azure)" } as CSSProperties}>
              <HardDrive size={15} />
            </span>
            <p className="text-xs text-muted" title={health.data?.reason ?? ""}>
              <span className="font-medium text-fg">Guardando en este dispositivo.</span> La base
              del servidor no está disponible. Si la conectas, la app vuelve a usarla sin perder lo
              que ya anotaste aquí.
            </p>
          </div>
        ) : null}

        <main className="flex-1 px-4 pt-6 pb-32 md:px-8 md:pb-12">
          {/* Transición breve entre pantallas: fundido + subida corta. */}
          <div key={pathname} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            {children}
          </div>
        </main>
      </div>

      {/* ── Navegación inferior (móvil) ─────────────────────────────────── */}
      <nav
        aria-label="Principal (móvil)"
        className="glass fixed inset-x-0 bottom-0 z-20 border-t border-line-soft shadow-[0_-16px_36px_-28px_rgb(0_0_0/0.95)] md:hidden"
      >
        <ul className="mx-auto flex max-w-lg justify-between px-2 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))]">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.to);
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "press relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
                    on ? "text-accent" : "text-muted",
                  )}
                >
                  {/* Píldora activa: aparece con un resorte breve */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-0 grid h-9 w-12 place-items-center rounded-full transition-[scale,opacity] duration-200 ease-out",
                      on
                        ? "scale-100 bg-accent/18 opacity-100 shadow-[0_0_20px_-6px_var(--color-accent)]"
                        : "scale-50 opacity-0",
                    )}
                  />
                  <Icon
                    size={20}
                    strokeWidth={on ? 2.1 : 1.75}
                    aria-hidden
                    className={cn(
                      "relative transition-transform duration-200 ease-out",
                      on && "-translate-y-px scale-110",
                    )}
                  />
                  <span className="relative">{item.label}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -bottom-0.5 h-0.5 w-5 rounded-full bg-accent transition-[scale] duration-200",
                      on ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
