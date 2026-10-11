import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Copy, QrCode as QrCodeIcon, Smartphone } from "lucide-react";
import { Card, IconTile, SectionTitle } from "@/components/surface";
import { Button } from "@/components/ui";
import { QrCode } from "@/components/qr-code";
import { previewPathPrefix } from "@/lib/preview-path-prefix";

export const Route = createFileRoute("/instalar")({ component: Instalar });

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

/** URL pública a `/?install=1`: el instructivo que detecta iPhone, Android, tablet o escritorio. */
function installUrl(): string {
  if (typeof window === "undefined") return "/?install=1";
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
  return `${window.location.origin}${prefix}/?install=1`;
}

function Instalar() {
  const [url, setUrl] = useState<string | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(installUrl());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionTitle
        eyebrow="Cualquier dispositivo"
        title="Instalar la app"
        detail="Escanea el código o abre el instructivo: se adapta solo a iPhone, Android, tablet o computadora."
        icon={<QrCodeIcon size={18} aria-hidden />}
        tone="iris"
      />

      <Card hero beam spotlight={false} className="flex flex-col items-center gap-4 p-6 text-center">
        <span aria-hidden className="card-glow">
          <span className="absolute -top-16 -right-10 size-48 rounded-full bg-iris/20 blur-3xl" />
        </span>
        <div className="relative rounded-2xl bg-[#121410] p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
          {url ? (
            <QrCode value={url} size={220} />
          ) : (
            <div className="skeleton size-[220px] rounded-lg" />
          )}
        </div>
        <p className="relative max-w-sm text-sm text-muted">
          Apunta la cámara de otro teléfono, tablet o computadora hacia este código: abrirá el
          instructivo de instalación adecuado para ese aparato, sin escribir nada.
        </p>
        {url ? (
          <div className="relative flex w-full flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 truncate rounded-xl border border-line-soft bg-fg/5 px-3 py-2.5 text-left text-xs text-muted">
              {url}
            </code>
            <Button tone="quiet" onClick={() => void copyLink()} aria-label="Copiar enlace">
              {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        ) : null}
      </Card>

      <Card spotlight className="space-y-3 p-5">
        <div className="flex items-center gap-3">
          <IconTile tone="accent" size={40}>
            <Smartphone size={18} />
          </IconTile>
          <h2 className="font-display text-xl text-fg">Instalar en este aparato</h2>
        </div>
        <p className="text-sm text-muted">
          No es una página suelta: se instala como aplicación. En iPhone abre el instructivo, pulsa
          Compartir y elige Agregar a inicio. Instalada suena aunque no la tengas a la vista.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a href="/?install=1&platform=ios" className="flex-1">
            <Button className="w-full" size="lg">
              Instalar en iPhone
            </Button>
          </a>
          {installEvent ? (
            <Button
              tone="quiet"
              size="lg"
              className="flex-1"
              onClick={() => {
                void installEvent.prompt();
                setInstallEvent(null);
              }}
            >
              Instalar en Android
            </Button>
          ) : (
            <a href="/?install=1&platform=android" className="flex-1">
              <Button tone="quiet" size="lg" className="w-full">
                Instalar en Android
              </Button>
            </a>
          )}
        </div>
      </Card>

      <p className="text-center text-xs text-muted">
        El código QR se dibuja en este dispositivo; el enlace no pasa por ningún servicio externo de
        generación de códigos.
      </p>
    </div>
  );
}
