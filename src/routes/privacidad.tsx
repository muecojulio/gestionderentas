import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  CalendarDays,
  Coins,
  Database,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Card, IconTile, SectionTitle } from "@/components/surface";
import { Button } from "@/components/ui";
import type { Tone } from "@/lib/tones";

export const Route = createFileRoute("/privacidad")({ component: Privacidad });

const SECCIONES: { icon: typeof Camera; tone: Tone; title: string; body: string }[] = [
  {
    icon: Database,
    tone: "accent",
    title: "Tus datos son tuyos",
    body: "Esta aplicación guarda departamentos, fotos, medidores, rentas, depósitos, incrementos, contratos y la lista de personas a las que no volverías a rentar. Esos datos pertenecen a tu cuenta y no se muestran a otros usuarios. El Excel se arma en tu teléfono y no se envía a ningún otro servicio.",
  },
  {
    icon: Camera,
    tone: "iris",
    title: "Fotos",
    body: "Las fotos se reducen en tu teléfono antes de guardarse. No se venden ni se envían a redes de publicidad.",
  },
  {
    icon: CalendarDays,
    tone: "amber",
    title: "Feriados de México",
    body: "El calendario consulta los feriados oficiales de México en servicios públicos que no piden llave ni registro: la API de Nager.Date y, como respaldo, las reglas oficiales del artículo 74 de la Ley Federal del Trabajo (las mismas que publican los repositorios abiertos date-holidays y mx-feriados en GitHub). Esas consultas solo envían el año y el país. No incluyen nombres, teléfonos ni montos.",
  },
  {
    icon: Coins,
    tone: "sage",
    title: "Solo pesos mexicanos",
    body: "Todas las rentas se cobran únicamente en pesos mexicanos (MXN). No se aceptan pagos en dólares ni en otra moneda. El tipo de cambio USD/MXN solo se consulta de forma opcional como referencia informativa en fuentes públicas sin llave ni registro (GitHub AllRates-Today/central-bank-exchange-rates con tasas oficiales de Banxico, licencia CC BY 4.0, y respaldo Frankfurter del BCE). Esas consultas solo piden la paridad USD/MXN, no envían datos tuyos y se guardan en caché 12 horas; los montos, la gráfica de ingresos y el resumen del mes se calculan siempre en MXN dentro de tu cuenta.",
  },
  {
    icon: ShieldCheck,
    tone: "azure",
    title: "Avisos y salida del inquilino",
    body: "Los avisos del teléfono se muestran en este dispositivo. Puedes apagarlos en Avisos. Al salir un inquilino se borra su información de la ficha actual; la foto y los números de medidor se conservan. El historial de estancias anteriores permanece para que sepas cuánto tiempo estuvo rentado.",
  },
  {
    icon: Trash2,
    tone: "crimson",
    title: "Borrar cuando quieras",
    body: "Puedes eliminar un departamento completo, o quitar un nombre de la lista de no rentar, cuando quieras.",
  },
];

function Privacidad() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-1 py-4">
      <SectionTitle
        eyebrow="Gestión de rentas"
        title="Privacidad"
        detail="Qué guarda la app, qué consulta fuera y qué puedes borrar."
        icon={<ShieldCheck size={18} aria-hidden />}
      />
      <div className="space-y-3">
        {SECCIONES.map((seccion) => {
          const Icon = seccion.icon;
          return (
            <Card key={seccion.title} spotlight className="flex items-start gap-3 p-4">
              <IconTile tone={seccion.tone} size={38}>
                <Icon size={17} />
              </IconTile>
              <div className="min-w-0">
                <h2 className="font-display text-xl leading-tight text-fg">{seccion.title}</h2>
                <p className="mt-1 text-sm text-muted">{seccion.body}</p>
              </div>
            </Card>
          );
        })}
      </div>
      <Link to="/" className="block">
        <Button tone="quiet" className="w-full">
          <ArrowLeft size={16} aria-hidden />
          Volver a la app
        </Button>
      </Link>
    </div>
  );
}
