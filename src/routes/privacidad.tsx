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
        El calendario consulta los feriados oficiales de México en un servicio público (Nager.Date). Esa
        consulta solo envía el año y el país. No incluye nombres, teléfonos ni montos.
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
