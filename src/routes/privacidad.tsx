import { createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  CalendarDays,
  Coins,
  Database,
  KeyRound,
  Lock,
  QrCode,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Card, IconTile, SectionTitle } from "@/components/surface";
import type { Tone } from "@/lib/tones";

export const Route = createFileRoute("/privacidad")({ component: Privacidad });

const SECCIONES: { icon: typeof Camera; tone: Tone; title: string; body: string }[] = [
  {
    icon: Database,
    tone: "accent",
    title: "Qué guarda la app",
    body: "Esta aplicación guarda departamentos, fotos, medidores, rentas, depósitos, incrementos, contratos y la lista de personas a las que no volverías a rentar. Nada de eso se vende ni se comparte con redes de publicidad ni con terceros. El Excel se arma en tu teléfono o computadora y no se envía a ningún otro servicio.",
  },
  {
    icon: KeyRound,
    tone: "iris",
    title: "Sin cuentas: un solo dueño",
    body: "La app no pide iniciar sesión ni crear una cuenta: todo lo que ves aquí es de quien instaló o abrió esta copia. Por eso el enlace de tu app es, en los hechos, la llave de tus datos — no lo compartas ni lo publiques en ningún sitio donde pueda llegar gente ajena a tus rentas, porque cualquiera con el enlace vería y podría editar la misma información.",
  },
  {
    icon: Camera,
    tone: "sage",
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
    tone: "azure",
    title: "Solo pesos mexicanos",
    body: "Todas las rentas se cobran, calculan y muestran únicamente en pesos mexicanos (MXN). No se aceptan pagos en dólares ni en otra moneda, y la app no consulta ningún tipo de cambio ni servicio externo para mostrar tus montos: la gráfica de ingresos y el resumen del mes salen siempre de lo que tú capturaste.",
  },
  {
    icon: QrCode,
    tone: "iris",
    title: "Código QR de instalación",
    body: "El código QR de la pestaña Instalar se dibuja en tu propio aparato con el enlace de esta app; no pasa por ningún generador de QR en línea ni por un tercero. Apunta siempre a la misma app que ya estás usando, así que compártelo solo con quien deba tener acceso a tus datos.",
  },
  {
    icon: ShieldCheck,
    tone: "crimson",
    title: "Avisos y salida del inquilino",
    body: "Los avisos del teléfono se muestran en este dispositivo. Puedes apagarlos en Avisos. Al salir un inquilino se borra su información de la ficha actual; la foto y los números de medidor se conservan. El historial de estancias anteriores permanece para que sepas cuánto tiempo estuvo rentado.",
  },
  {
    icon: Lock,
    tone: "accent",
    title: "Cómo se protege la conexión",
    body: "Cada respuesta del servidor incluye encabezados de seguridad (política de contenido, protección contra clics invisibles entre sitios, bloqueo de rastreo de tipo MIME y apagado de cámara, micrófono y ubicación, que esta app no usa). Toda la información viaja cifrada (HTTPS) entre tu aparato y el servidor.",
  },
  {
    icon: Trash2,
    tone: "sage",
    title: "Borrar cuando quieras",
    body: "Puedes eliminar un departamento completo, o quitar un nombre de la lista de no rentar, cuando quieras. No hay papelera: borrar es definitivo.",
  },
];

function Privacidad() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-1 py-4">
      <SectionTitle
        eyebrow="Gestión de rentas"
        title="Privacidad"
        detail="Qué guarda la app, qué consulta fuera, cómo se protege y qué puedes borrar."
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
    </div>
  );
}
