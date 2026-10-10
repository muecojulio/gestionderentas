import { useEffect, useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready || isPending) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="text-sm text-muted">Abriendo tu cuenta…</p>
      </main>
    );
  }
  if (user) return <Navigate to="/" />;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <p className="text-sm tracking-wide text-muted uppercase">Gestión de rentas</p>
      <h1 className="mt-3 font-display text-5xl leading-none text-fg">Tus departamentos, en orden.</h1>
      <p className="mt-4 text-base text-muted">
        La renta, los contratos, los medidores y los avisos quedan ligados a tu cuenta. Nadie más los ve.
      </p>
      <div className="mt-8 space-y-3">
        {authEnabled ? (
          GROK_PROVIDERS.map((provider) => (
            <button
              key={provider.providerId}
              type="button"
              onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
              className="press h-12 w-full rounded-xl border border-line bg-raised text-sm font-medium text-fg"
            >
              Continuar con {provider.label}
            </button>
          ))
        ) : (
          <p className="text-sm text-muted">El acceso está desactivado.</p>
        )}
      </div>
      <a href="/privacidad" className="mt-8 text-sm text-muted underline-offset-4 hover:underline">
        Privacidad
      </a>
    </main>
  );
}
