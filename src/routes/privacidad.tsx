import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidad")({ component: Privacidad });

function Privacidad() {
  return (
    <main className="mx-auto min-h-dvh max-w-xl space-y-4 px-5 py-10">
      <p className="text-sm text-muted">Gestión de rentas</p>
      <h1 className="font-display text-4xl">Privacidad</h1>
      <p className="text-sm text-muted">
        Esta aplicación guarda departamentos, fotos, medidores, rentas, depósitos, incrementos, contratos y la lista de
        personas a las que no volverías a rentar. Esos datos pertenecen a tu cuenta y no se muestran a otros
        usuarios. El Excel se arma en tu teléfono y no se envía a ningún otro servicio.
      </p>
      <p className="text-sm text-muted">
        Las fotos se reducen en tu teléfono antes de guardarse. No se venden ni se envían a redes de
        publicidad.
      </p>
      <p className="text-sm text-muted">
        El calendario consulta los feriados oficiales de México en servicios públicos que no piden llave ni
        registro: la API de Nager.Date y, como respaldo, las reglas oficiales del artículo 74 de la Ley Federal
        del Trabajo (las mismas que publican los repositorios abiertos date-holidays y mx-feriados en GitHub).
        Esas consultas solo envían el año y el país. No incluyen nombres, teléfonos ni montos.
      </p>
      <p className="text-sm text-muted">
        El tipo de cambio USD/MXN se consulta en fuentes públicas sin llave ni registro: la API pública de GitHub
        sobre el repositorio abierto AllRates-Today/central-bank-exchange-rates (tasas oficiales de Banxico,
        licencia CC BY 4.0) y, como respaldo, Frankfurter con datos del Banco Central Europeo. Esas consultas
        solo piden la paridad USD/MXN: no envían datos tuyos ni de tus departamentos. La tasa se guarda en
        caché (12 horas) para no repetir la consulta; la gráfica de ingresos y el resumen del mes se calculan
        solo con tus propios cobros, dentro de tu cuenta.
      </p>
      <p className="text-sm text-muted">
        Los avisos del teléfono se muestran en este dispositivo. Puedes apagarlos en Avisos. Al salir un
        inquilino se borra su información de la ficha actual; la foto y los números de medidor se conservan.
        El historial de estancias anteriores permanece para que sepas cuánto tiempo estuvo rentado.
      </p>
      <p className="text-sm text-muted">
        Puedes eliminar un departamento completo, o quitar un nombre de la lista de no rentar, cuando quieras.
      </p>
      <Link to="/" className="inline-block text-sm text-accent">
        Volver
      </Link>
    </main>
  );
}
