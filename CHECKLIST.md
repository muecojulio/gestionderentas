# Checklist de la aplicación

Todo lo que pediste para la gestión de rentas, con **dónde está** en la app y **cómo
comprobarlo**. Marca `[x]` = ya funciona. Lo que se agregó o se corrigió en esta
revisión lleva la nota **(nuevo)**.

| # | Requisito | Estado | Dónde |
| - | --------- | ------ | ----- |
| 1 | Foto que puedas subir | ✅ | Nuevo / Editar datos → "Subir foto" |
| 2 | Ficha técnica: medidor de luz y de agua | ✅ | Ficha → "Ficha técnica" |
| 3 | Cuándo y cuánto se paga de luz | ✅ | Ficha técnica + Agenda |
| 4 | Cuándo y cuánto se paga de agua | ✅ | Ficha técnica + Agenda |
| 5 | Cuánto cobras de renta por departamento | ✅ | Ficha → "Estancia" |
| 6 | Calendario: día de ingreso | ✅ | Agenda |
| 7 | Cuántos años y meses lleva rentando | ✅ | Ficha, Inicio y Agenda |
| 8 | Pestaña con cuánto recibes al mes en total | ✅ | Ingresos |
| 9 | Cuándo inicia y cuándo vence el contrato | ✅ | Ficha → "Estancia" |
| 10 | Qué día le toca pagar la renta | ✅ | Ficha → "Estancia" + Agenda |
| 11 | Pestaña de personas a las que no volverías a rentar | ✅ | Lista |
| 12 | Aviso 1 día antes de la renta | ✅ **(nuevo: más confiable)** | Avisos + notificación |
| 13 | Aviso 35 días antes del vencimiento del contrato | ✅ **(nuevo: más confiable)** | Avisos + notificación |
| 14 | Botón por departamento: borrar datos cuando sale el inquilino | ✅ **(nuevo: también en la lista)** | Ficha y Propiedades |
| 15 | La foto y los medidores NO se borran al salir el inquilino | ✅ | Ficha (siguen ahí) |

---

## 1. Foto para saber cuál es cada departamento

- [x] Se sube desde el teléfono o la computadora (botón **Subir foto**).
- [x] Se comprime sola para que no pese y no reviente el guardado (`compressPhoto`).
- [x] Se ve en tres lugares: la tarjeta de **Inicio**, la lista de **Propiedades** y
      al abrir la **ficha**.
- [x] Se puede cambiar después con **Editar datos → Cambiar foto**.
- Prueba: Propiedades → Nuevo → Subir foto → Guardar. La miniatura aparece al instante.
- Código: `src/components/photo.ts`, `src/components/apartment-form.tsx`.

## 2 a 4. Ficha técnica: medidores, luz y agua

- [x] **Número de medidor de luz**.
- [x] **Número de medidor de agua**.
- [x] **Nota de los medidores** (por ejemplo, dónde está el medidor).
- [x] **Día del mes en que le toca pagar la luz** y **cuánto**.
- [x] **Día del mes en que le toca pagar el agua** y **cuánto**.
- [x] Esos días aparecen marcados en la **Agenda** ("Luz · Depto 3", "Agua · Depto 3").
- [x] Todo esto **sobrevive** cuando sale el inquilino (ver punto 15).
- Prueba: abre una ficha → sección "Ficha técnica".
- Código: `src/routes/depto.$id.tsx`, campo `medidorLuz`, `medidorAgua`, `luzDia`,
  `luzCentavos`, `aguaDia`, `aguaCentavos` en `src/lib/rentals.logic.ts`.

## 5. Cuánto cobras de renta

- [x] Renta mensual por departamento, en pesos mexicanos (MXN).
- [x] Validación: si está rentado, la app exige nombre, renta y día de pago.
- [x] Aumento al cumplirse el año de contrato (tarjeta **Año de contrato** en la ficha,
      con el historial de rentas anteriores).

## 6 y 7. Calendario: ingreso y antigüedad

- [x] **Fecha de ingreso** del inquilino (campo "Ingreso" del formulario).
- [x] **Años y meses que lleva rentando** ("2 años y 6 meses"):
  - [x] en la ficha ("Lleva rentando"),
  - [x] en la tarjeta de Inicio,
  - [x] en la Agenda, sección **"Cuánto llevan rentados"** (todos de un vistazo).
- [x] La **Agenda** marca con punto los días que tienen algo: renta, luz, agua,
      ingreso, inicio de contrato, vencimiento, aniversario del contrato y feriados
      oficiales de México.
- Prueba: Agenda → toca un día con punto.

## 8. Pestaña de cuánto recibes al mes (Ingresos)

- [x] **Total esperado del mes** en grande.
- [x] **Ya anotado** y **por cobrar**, con barra de progreso y porcentaje.
- [x] **Total del año** en curso.
- [x] Gráfica de los **últimos 12 meses**.
- [x] Interruptor por departamento para marcar la renta como **recibida** (se guarda
      por mes, así el historial no se pierde).
- [x] Flechas para ver meses anteriores (hasta 35 meses atrás).
- [x] Días de mora por departamento si no pagó ("Lleva 4 días sin pagar").

## 9 y 10. Contrato y día de pago

- [x] **Inicio del contrato** y **vencimiento del contrato** en la ficha.
- [x] Validación: el contrato no puede vencer antes de iniciar.
- [x] **Día del mes en que paga la renta**, y aviso si ese día cae en feriado.
- [x] El vencimiento también se ve en la Agenda.

## 11. Lista de personas a las que no volverías a rentar

- [x] Pestaña **Lista** con nombre, teléfono y motivo.
- [x] Si intentas dar de alta a alguien de la lista, la app **te avisa antes de
      guardar** y te deja decidir (interruptor "Rentar de todos modos").
- [x] Coincide nombres con o sin acentos y mayúsculas.
- [x] Se quita deslizando la fila (o con ⋯ → Quitar).

## 12 y 13. Notificaciones

Reglas (están escritas una sola vez, en `src/lib/notifications.ts`):

- [x] **1 día antes** de que toque la renta de cada departamento → "Mañana toca la
      renta de Depto 3".
- [x] **El mismo día** → "Hoy toca la renta de Depto 3".
- [x] **35 días antes** de que venza el contrato, y cada día hasta que vence →
      "El contrato de Depto 3 está por vencer · Faltan 35 días".
- [x] Además: días de mora y 30 días antes del aniversario (para el aumento).

Qué se mejoró en esta revisión:

- [x] **(nuevo)** Los avisos ya no dependen de que la pestaña se haya abierto justo
      ese día: mientras la app esté abierta se vuelve a revisar cada 5 minutos, al
      regresar a la pestaña y al recuperar la señal. Antes, si dejabas la app abierta
      de un día para otro, seguía calculando con la fecha de ayer.
- [x] **(nuevo)** Se ofrecen en **Inicio** con el botón **Activar avisos** (antes solo
      se podían prender entrando a Avisos).
- [x] **(nuevo)** Botón **Mandar un aviso de prueba** en Avisos, para comprobar en el
      momento que sí suenan en tu teléfono.
- [x] **(nuevo)** Se entrega por el *service worker* cuando el navegador lo permite
      (se ve aunque la pestaña no esté al frente) y cae a `Notification` si no.
- [x] **(nuevo)** Las marcas de "ya avisé" caducan y se limpian: antes se acumulaban
      en el almacenamiento del teléfono para siempre.
- [x] **(nuevo)** El recordatorio no suena si la renta de ese mes ya la marcaste como
      recibida (antes avisaba de algo ya cobrado).
- [x] El interruptor de Avisos dice con claridad en qué estado está: prendidos,
      apagados, falta permiso, bloqueados por el navegador o navegador sin soporte.

Límite honesto (del navegador, no de la app): sin un servidor que mande *push*, ningún
sitio puede encender la pantalla del teléfono con la app cerrada. Por eso conviene
**instalarla** (Avisos → "Instalar en iPhone/Android") y abrirla: los avisos del día
sueltan en cuanto la abres, y mientras la traigas abierta suenan a su hora.

- Código: `src/lib/notifications.ts`, `src/lib/use-alert-notifications.ts`,
  `src/components/shell.tsx`, `src/routes/avisos.tsx`, `src/routes/index.tsx`.
- Pruebas: `src/lib/notifications.test.ts` y el bloque "computeAlerts" de
  `src/lib/rentals.logic.test.ts`.

## 14 y 15. Botón para cuando el inquilino sale

- [x] **(nuevo)** Botón **"Salió"** en **cada departamento de la lista**
      (Propiedades → desliza la fila a la izquierda, o ⋯, o en escritorio a la vista).
- [x] Botón **"El inquilino salió"** dentro de la ficha.
- [x] Pide confirmación y explica qué se borra antes de hacerlo.
- [x] **Se borra**: nombre, teléfono, renta, día de pago, inicio y vencimiento del
      contrato, fecha de ingreso, notas de la estancia, días y montos de luz y agua,
      y el depósito de esa estancia.
- [x] **NO se borra**: la **foto**, el **número de medidor de luz**, el **número de
      medidor de agua** y la **nota de los medidores**. Tampoco el nombre ni la
      dirección del departamento.
- [x] La estancia que terminó queda guardada en **Historial** de la ficha (inquilino,
      fechas, renta y qué pasó con su depósito).
- [x] Enseguida puedes registrar al siguiente inquilino con **Editar datos**.
- [x] Aparte existe **Eliminar departamento**, que sí borra todo (incluida la foto),
      con su propia confirmación.
- Prueba: Propiedades → desliza un departamento rentado → Salió → confirmar →
      abre la ficha: sigue la foto y siguen los medidores; dice "Libre".
- Código: `vacateApartment` en `src/lib/rentals.functions.ts` y `localVacateApartment`
  en `src/lib/local-store.ts` (las dos conservan foto y medidores).

---

## Lo que la app ya traía además de tu lista

- [x] Departamentos **y accesorias** (mismo formato de ficha, filtros por tipo).
- [x] **Depósito en garantía**: monto, fecha, estado (en tu poder / devuelto /
      retenido) y nota.
- [x] **Exportar a Excel** cada departamento (ficha, historial, cobros y aumentos).
- [x] Buscador por nombre, dirección o inquilino.
- [x] **Respaldo en el dispositivo**: si el servidor no tiene base de datos, la app
      sigue funcionando guardando en este teléfono y lo avisa.
- [x] Feriados oficiales de México en la agenda (con caché y respaldo local).
- [x] Instalable como app (PWA) en iPhone y Android.

## Cambios de esta revisión (archivos)

| Archivo | Qué cambió |
| ------- | ---------- |
| `src/lib/notifications.ts` | **Nuevo.** Reglas de los avisos (1 día / 35 días), permiso, entrega por *service worker*, marcas que caducan. |
| `src/lib/use-alert-notifications.ts` | **Nuevo.** Entrega los avisos y mantiene la fecha del día fresca mientras la app está abierta. |
| `src/components/shell.tsx` | Usa el módulo nuevo en vez de disparar notificaciones a mano. |
| `src/routes/avisos.tsx` | Interruptor con estado real, aviso de prueba, reglas a la vista. |
| `src/routes/index.tsx` | Tarjeta para activar los avisos desde el inicio. |
| `src/routes/departamentos.tsx` | Botón **Salió** en cada departamento de la lista, con confirmación. |
| `src/lib/rentals.logic.ts` | El recordatorio de renta no suena si ese mes ya está cobrado. |
| `src/lib/notifications.test.ts` | **Nuevo.** Pruebas de las reglas de avisos. |
| `src/lib/rentals.logic.test.ts` | Pruebas nuevas: 1 día antes, 35 días antes, antigüedad en años y meses. |
| `package.json` | `npm test` corre también las pruebas de avisos. |

## Cómo verificar todo de un golpe

```sh
npm test        # 44 pruebas: reglas de avisos, mora, aumentos, meses, feriados
npm run typecheck
npm run lint
npm run dev     # app en http://localhost:8080
```
