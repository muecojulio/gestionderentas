import { useState } from "react";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { SpotlightLayer } from "@/components/spotlight-layer";
import { Frame } from "@/components/shell";
import appCss from "../styles.css?url";

const APP_NAME = "Gestión de Rentas";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Lleva la renta, los contratos, los medidores y los avisos de tus departamentos.",
      },
      { name: "theme-color", content: "#121410" },
      { name: "apple-mobile-web-app-title", content: "Rentas" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650;9..144,750&family=Outfit:wght@300..700&display=swap",
      },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
    ],
  }),
  component: RootComponent,
});

/** Aviso emergente con la misma piel que el resto de la app. */
const toastStyle = {
  background: "linear-gradient(178deg, #242821 0%, #1c1f19 62%, #191c16 100%)",
  border: "1px solid #343930",
  color: "#f4f1e9",
  borderRadius: "1.1rem",
  boxShadow:
    "inset 0 1px 0 rgb(255 255 255 / 0.07), 0 26px 50px -26px rgb(0 0 0 / 0.95)",
};

function RootComponent() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 20_000, retry: 1 } },
      }),
  );
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Fondo vivo por capas: cielo, aurora, retícula, grano y viñeta.
            Todo decorativo, oculto a lectores de pantalla y sin puntero. */}
        <div className="sky" aria-hidden="true" />
        <div className="aurora" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="ledger" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />
        {/* Si no hay JavaScript, lo que entra con scroll se queda visible. */}
        <noscript>
          <style>{".reveal{opacity:1 !important;transform:none !important}"}</style>
        </noscript>
        <SpotlightLayer />
        <PreviewHostBridge />
        <QueryClientProvider client={client}>
          <Frame>
            <Outlet />
          </Frame>
          <Toaster
            theme="dark"
            position="top-center"
            toastOptions={{
              style: toastStyle,
              classNames: {
                title: "text-sm font-medium",
                description: "text-xs text-[#a5a296]",
                success: "text-[#96b46c]",
                error: "text-[#e2605a]",
              },
            }}
          />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
