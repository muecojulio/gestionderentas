import { useEffect, useMemo, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CalendarDays,
  HardDrive,
  LayoutDashboard,
  ShieldBan,
  Wallet,
} from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { computeAlerts } from "@/lib/rentals.logic";
import { useDataHealth, useRentals } from "@/lib/use-rentals";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/departamentos", label: "Deptos", icon: Building2 },
  { to: "/ingresos", label: "Ingresos", icon: Wallet },
  { to: "/calendario", label: "Agenda", icon: CalendarDays },
  { to: "/lista", label: "Lista", icon: ShieldBan },
] as const;

function active(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  if (to === "/departamentos") {
    return pathname.startsWith("/departamentos") || pathname.startsWith("/depto") || pathname === "/nuevo";
  }
  return pathname === to || pathname.startsWith(`${to}/`);
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

  useEffect(() => {
    if (!alerts.length) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (localStorage.getItem("gr-notif") !== "on") return;
    for (const alert of alerts) {
      const key = `gr-pushed:${alert.key}`;
      if (localStorage.getItem(key)) continue;
      try {
        new Notification(alert.title, { body: alert.detail, tag: alert.key });
        localStorage.setItem(key, "1");
      } catch {
        /* el navegador puede bloquear el aviso */
      }
    }
  }, [alerts]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-bg/60 px-4 py-6 backdrop-blur md:flex">
        <Link to="/" className="px-2">
          <p className="font-display text-3xl leading-none">Gestión</p>
          <p className="mt-1 text-sm text-muted">de rentas</p>
        </Link>
        <nav aria-label="Principal" className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "press lift relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm",
                  on ? "bg-raised text-fg" : "text-muted",
                )}
              >
                {/* Indicador activo: barra lateral que aparece con animación */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-0 h-6 w-1 rounded-full bg-accent transition-[scale] duration-200 ease-out",
                    on ? "scale-y-100" : "scale-y-0",
                  )}
                />
                <Icon size={18} strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <UserButton />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-md md:px-8">
          <Link to="/" className="md:hidden">
            <span className="font-display text-2xl leading-none">Gestión</span>
          </Link>
          <p className="hidden text-sm text-muted md:block">Tus departamentos y accesorias, en un solo lugar</p>
          <Link
            to="/avisos"
            aria-label="Avisos"
            className="press lift relative grid size-11 place-items-center rounded-full border border-line"
          >
            <Bell size={18} strokeWidth={1.75} />
            {alerts.length > 0 ? (
              <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-accent" />
            ) : null}
          </Link>
        </header>
        {onDevice ? (
          <p
            className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-line bg-raised/70 px-3 py-2 text-xs text-muted md:mx-8"
            title={health.data?.reason ?? ""}
          >
            <HardDrive size={14} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              La base del servidor no está disponible: tus propiedades se guardan en
              este dispositivo. Si conectas una base de datos, la app vuelve a usarla sin
              perder lo que ya anotaste aquí.
            </span>
          </p>
        ) : null}
        <main className="flex-1 px-4 pt-5 pb-28 md:px-8 md:pb-10">{children}</main>
      </div>
      <nav
        aria-label="Principal (móvil)"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto flex max-w-lg justify-between px-2 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "press relative flex min-w-16 flex-col items-center gap-0.5 px-2 py-1 text-xs",
                    on ? "text-accent" : "text-muted",
                  )}
                >
                  {/* Píldora activa animada detrás del icono */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-0 size-9 rounded-full bg-accent/15 transition-[scale] duration-200 ease-out",
                      on ? "scale-100" : "scale-0",
                    )}
                  />
                  <Icon size={20} strokeWidth={1.75} className="relative" />
                  <span className="relative">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
