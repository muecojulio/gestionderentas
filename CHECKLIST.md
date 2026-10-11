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
| 16 | Interfaz viva: botones, pestañas, carruseles, swipe, buscador y movimiento reducido | ✅ **(nuevo)** | Toda la app → apartado 16 |

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

## 16. Interfaz viva: cómo responde cada control **(nuevo)**

Un solo sistema de interacciones para toda la app, reutilizable y accesible. Las
piezas viven en `src/components/` y las utilidades visuales en `src/styles.css`
(inspiradas en componentes abiertos públicos: shadcn/ui para estados y foco,
magicui para el haz del borde, el foco que sigue al cursor y el brillo de los
botones, y motion/primitives para la pulsación).

- [x] **Botones**: objetivo táctil de 44 px o más, se hunden al presionar
      (`.press`), se elevan solo con ratón (`.lift`), el principal tiene un
      brillo que lo cruza (`.sheen`).
- [x] **Estados del botón**: inactivo, **cargando** (spinner + `aria-busy`, no se
      puede volver a enviar), **éxito** (palomita) y **error** (sacudida breve +
      icono de alerta, no solo color). El estado también se anuncia con
      `role="status"`.
- [x] **Pestañas**: semántica completa (`tablist` / `tab` / `tabpanel`,
      `aria-selected`, `aria-controls`), píldora que se desliza a la opción
      activa y la centra, teclado con ← → Inicio Fin, bordes difuminados y pista
      "Desliza" cuando no caben, y **swipe horizontal** entre paneles con eje
      bloqueado (solo si el gesto lateral supera 1,2 veces al vertical).
- [x] **Carriles y chips**: scroll nativo con *momentum* y `scroll-snap`, barra
      oculta solo a la vista, indicadores de desbordamiento que aparecen solo
      cuando hay contenido fuera, la opción activa se centra sola, y cada chip
      marcado lleva **palomita + contador** (no solo color).
- [x] **Tarjetas y carruseles**: en el teléfono las propiedades y el resumen se
      deslizan de lado con la siguiente tarjeta asomando; en pantallas grandes se
      vuelven cuadrícula. Elevación al pasar el cursor, foco que sigue al ratón y
      entrada escalonada al hacer scroll.
- [x] **Swipe para revelar acciones**: en Propiedades y en la Lista negra. Tope
      del ancho del panel, umbral para abrir/cerrar, el clic posterior al arrastre
      no activa la tarjeta, el scroll vertical sigue siendo del navegador, y las
      acciones ocultas quedan fuera del foco (`inert`). Siempre hay un botón ⋯
      visible y en escritorio las acciones están a la vista.
- [x] **Buscador (combobox)**: filtra mientras escribes ignorando mayúsculas y
      acentos, **resalta el trozo que coincide**, anuncia cuántas opciones quedan,
      se maneja completo con teclado (↑ ↓ Inicio Fin Enter Esc), mantiene visible
      la opción activa, dice con claridad cuando no hay coincidencias y se cierra
      al tocar fuera.
- [x] **Campos**: etiqueta propia (el *placeholder* no es el nombre), halo de foco
      de 3 px y superficie hundida. **Interruptores** con `role="switch"` y
      `aria-checked`, área táctil de 48 px y color por estado (verde salvia =
      cobrado, carmín = mora). **Plegables** que abren y cierran sin saltos y con
      `aria-expanded` + contenido `inert` al cerrarse.
- [x] **Movimiento reducido**: con `prefers-reduced-motion` se apagan aurora,
      haz, brillo, flotación, barras y sacudidas; el scroll suave pasa a ser
      inmediato y las entradas al hacer scroll se quedan quietas (con una red de
      seguridad por si no hay JavaScript).
- [x] **Aspecto**: fondo por capas (cielo, aurora, retícula de libro de cuentas,
      grano y viñeta), tarjetas con gradiente y borde iluminado, tejas de icono
      por tono (luz ámbar, agua azul, mora carmín, contrato iris, cobrado verde
      salvia) y cifras grandes con gradiente y números tabulares.
- Prueba: toca un botón y mira cómo se hunde; en la ficha desliza entre **Ficha**
      e **Historial**; en Propiedades desliza una fila hacia la izquierda; busca
      "roma" en el buscador y mira el resaltado; activa "reducir movimiento" en
      tu sistema y recorre la app otra vez.
- Código: `src/components/{ui,tabs,hscroller,swipeable,combobox,accordion,surface,reveal,alert-card,animated-counter,spotlight-layer}.tsx`,
  `src/lib/{motion,tones,spotlight,search-highlight,use-action-status}.ts` y
  `src/styles.css`.

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
| `package.json` | `npm test` corre también las pruebas de avisos y del resaltado del buscador. |
| `src/styles.css` | Sistema visual por capas: tokens nuevos (sage, carmín, ámbar, azul, iris), superficies (`.card`, `.well`, `.glass`), microinteracciones (`.press`, `.lift`, `.sheen`, `.beam`, `.spotlight`, `.reveal`) y todo el apartado de movimiento reducido. |
| `src/components/surface.tsx` | **Nuevo.** Tarjetas, cabeceras de sección, tejas de icono, insignias, mosaicos de cifras y filas de datos. |
| `src/components/reveal.tsx` | **Nuevo.** Entrada escalonada al hacer scroll, con `IntersectionObserver`. |
| `src/components/alert-card.tsx` | **Nuevo.** Tarjeta de aviso compartida por Inicio y Avisos. |
| `src/components/spotlight-layer.tsx` | **Nuevo.** Un solo listener global para el foco que sigue al cursor. |
| `src/lib/tones.ts` | **Nuevo.** Tonos semánticos y sus clases/variables. |
| `src/lib/spotlight.ts` | **Nuevo.** Alimenta `--mx`/`--my` sin re-renders; se apaga con táctil o movimiento reducido. |
| `src/lib/search-highlight.ts` | **Nuevo.** Resaltado de la coincidencia del buscador (ignora acentos y signos). |
| `src/lib/search-highlight.test.ts` | **Nuevo.** Pruebas del resaltado. |
| `src/components/ui.tsx` | Botones con tonos/estados/brillo, `IconButton`, campos con halo de foco, interruptor con área táctil de 48 px, diálogo y estado vacío rediseñados. |
| `src/components/tabs.tsx` | Indicador con gradiente, dirección de entrada del panel, bordes difuminados y pista de "Desliza". |
| `src/components/hscroller.tsx` | Chips con tono, palomita y contador; aviso accesible de más opciones. |
| `src/components/swipeable.tsx` | `RowAction` compartido (spinner y tono propios), superficie de fila y botón ⋯ con icono de cerrar. |
| `src/components/combobox.tsx` | Resaltado de coincidencias, anuncio del número de opciones, detalle por opción y guía de teclado. |
| `src/components/accordion.tsx` | Cabecera con teja de icono, detalle y chequeta en círculo. |
| `src/components/shell.tsx` | Barra lateral con tarjeta "Hoy", cabecera de vidrio con contador de avisos y acceso directo a "Nueva propiedad", navegación inferior con píldora animada y transición entre pantallas. |
| `src/components/apartment-form.tsx` | Selector de tipo y de depósito como fichas marcables, zona de foto con "Cambiar foto" siempre visible, luz y agua en paneles propios, errores con icono y `role="alert"`. |
| `src/components/data-error.tsx` | Error con teja carmín, motivo a la vista y reintento. |
| `src/lib/error-component.tsx` | Pantalla de error global con la piel de la app (el mensaje sigue visible). |
| `src/routes/*.tsx` | Inicio, Propiedades, ficha, Ingresos, Agenda, Lista, Avisos, Nueva propiedad y Privacidad usan el sistema (héroe con haz, mosaicos, carruseles, rieles de color y entradas escalonadas). |
| `src/routes/__root.tsx` | Fondo por capas, avisos emergentes con la piel de la app y red de seguridad sin JavaScript. |


## Cómo verificar todo de un golpe

```sh
npm test        # 217 pruebas: avisos, mora, aumentos, meses, feriados, resaltado…
npm run typecheck
npm run lint
npm run dev     # app en http://localhost:8080
```

---

## Revisión de seguridad, limpieza y pestañas nuevas (esta revisión)

- [x] **Seguridad revisada**: `npm audit` sin vulnerabilidades (dependencias y la
      nueva `qrcode-generator`, que no tiene dependencias). Encabezados de
      seguridad (CSP, `nosniff`, `referrer-policy`, `permissions-policy`,
      aislamiento de agentes de navegación) ya estaban activos en dev y en
      producción; se documentan ahora también en **Privacidad**.
- [x] **Código muerto eliminado**: todo el inicio de sesión quedó desmontado hace
      tiempo, pero quedaban ~15 archivos stub de `src/lib/auth/*` que ya no
      importaba nadie (`isolation.server.ts`, `gate-identity.server.ts`,
      `gate-session*.ts`, `verify.server.ts`, `popup.server.ts`,
      `sign-in-gate.ts`, `providers.ts`, `email-password.ts`,
      `pglite-dialect.ts`, `preview.ts`, `server.ts`, `client.ts`,
      `use-current-user.ts`, `provider.tsx`, `gates.tsx`); el único archivo real
      es `middleware.ts`. También se quitó `src/lib/env.server.ts` (sin uso), el
      módulo completo de tipo de cambio USD/MXN (`exchange.ts`,
      `exchange.functions.ts`, `exchange.test.ts`, `useExchangeRate`) que nunca
      se mostraba en ninguna pantalla (Ingresos ya solo usa MXN), y varias
      funciones/CSS huérfanas (`Sparkbars`, `toneColor`, `localClearAll`,
      `localApartment`, `canStoreLocally`, `lastDbStatus`, `hasLocalStorage`,
      `TIPOS`, `TIPO_PLURAL`, `.bar`/`.bar-fill`).
- [x] **Política de privacidad actualizada** (`src/routes/privacidad.tsx`): ya no
      menciona el tipo de cambio (se quitó esa consulta externa), explica que no
      hay cuentas (un solo dueño por instalación: no compartas el enlace),
      describe el nuevo código QR de instalación y resume los encabezados de
      seguridad activos.
- [x] **Pestaña Privacidad** ahora en la navegación principal (antes solo se
      llegaba desde un enlace al fondo de Avisos).
- [x] **Pestaña Instalar (nueva)**: `src/routes/instalar.tsx` +
      `src/components/qr-code.tsx`. Código QR dibujado como SVG en el propio
      dispositivo (sin servicio externo) con el enlace `/?install=1`, que ya
      detectaba iPhone, Android, tablet o escritorio; además del código, trae
      enlace para copiar y los botones de instalar que antes vivían en Avisos.
- Prueba: barra lateral o navegación inferior → **Legal** e **Instalar**; en
  Instalar, escanea el QR con otro teléfono y confirma que abre el instructivo.
- Código: `src/routes/{privacidad,instalar}.tsx`, `src/components/qr-code.tsx`,
  `src/components/shell.tsx` (NAV), `src/routes/avisos.tsx`.
