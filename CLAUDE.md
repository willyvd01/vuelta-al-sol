# Vuelta al Sol — calendario familiar de cumpleaños y recuerdos

Lee este archivo completo antes de escribir código. Resume las decisiones ya tomadas con el dueño del proyecto, Wilmar. Si algo que pida en el momento choca con lo que dice aquí, pregúntale antes de cambiar la decisión, y actualiza este archivo cuando se decida algo nuevo.

## Qué es

Un producto con dos caras:

1. **Calendario físico.** 13 páginas A3 verticales con anillado metálico arriba (portada + 12 meses), para colgar en la pared. El mes se cambia volteando la hoja. Cada mes muestra los retratos de quienes cumplen años con su día, nombre y signo zodiacal. Un solo código QR por mes.
2. **Álbum digital.** El QR abre ese mes en el celular con la misma rejilla del papel. Al tocar un retrato se abre la ficha de la persona con sus recuerdos agrupados por año.

La web también **genera** el calendario físico: exporta cada página a PDF para la imprenta.

Primer cliente: la familia de Wilson. Después se venderá a muchas familias, así que **todo es multifamilia desde el día uno**: cada persona, recuerdo y foto pertenece a una familia. Todas las familias conviven en el **mismo** proyecto de Supabase (una sola base de datos, aislada por fila con RLS según `familia_id`) — vender a una familia nueva es una fila más en `familias`, nunca un proyecto de Supabase aparte.

## Stack

- **Next.js** (App Router) con **TypeScript**
- **Supabase**: PostgreSQL, Auth (correo y contraseña), Storage (bucket privado `fotos`)
- **CSS Modules** + variables CSS con los tokens de diseño (`src/styles/tokens.css`)
- **Vercel** para publicar
- `qrcode` para los QR · `sharp` en el servidor para la versión web de cada foto
- PDF, fase 1: vista de impresión con CSS `@page` y "Guardar como PDF" de Chrome (genera PDF vectorial con fuentes incrustadas). La generación automática en servidor queda para después.

## Archivos que ya existen (no los reemplaces; úsalos)

- `supabase/schema.sql` — esquema completo, probado en PostgreSQL: tablas, permisos por fila, almacenamiento, funciones.
- `supabase/seed.sql` — familia de prueba `demo` con los 9 cumpleaños de enero. Solo desarrollo.
- `src/lib/meses.ts` — nombres, abreviaturas, números romanos y traducciones en 7 idiomas.
- `src/lib/zodiaco.ts` — cálculo del signo (idéntico a la función SQL, verificado los 366 días), rangos de fechas e íconos de línea de los 12 signos.

## Rutas

Álbum público (protegido con código de acceso de la familia):

- `/f/[familia]` — portada digital
- `/f/[familia]/[mes]` — mes, `01` a `12`. **Aquí apunta el QR impreso.**
- `/f/[familia]/p/[codigo]` — ficha de persona

Administración (sesión de Supabase Auth):

- `/admin` — familias del usuario · crear familia nueva
- `/admin/[familia]/personas` — lista, nueva, editar
- `/admin/[familia]/recuerdos` — lista, nuevo
- `/admin/[familia]/imprimir` — vista de impresión: portada + 12 páginas A3

**Las URL de los QR son permanentes.** `familias.slug` y `personas.codigo` no cambian nunca; la base de datos lo impide con triggers.

## Acceso y seguridad

- RLS activado en todas las tablas. Roles por familia: `admin` (todo) y `colaborador` (ve todo, añade recuerdos, edita los suyos, no borra ni crea personas).
- Quien escanea el QR no tiene usuario. Flujo: la página pide el código de acceso → una ruta del servidor llama `verificar_codigo_familia(slug, codigo)` con la service role key → si es correcto, guarda una cookie httpOnly firmada con el id de la familia → las páginas del álbum consultan en el servidor con la service role y entregan las fotos con URL firmadas de corta duración.
- Limitar intentos de código por IP (fuerza bruta).
- La service role key vive solo en `.env.local` y en las variables de Vercel. **Nunca** en código del navegador, nunca en Git, nunca en el chat.
- Crear familias solo con la función `crear_familia()`: deja al creador como admin.

## Reglas del calendario

- **Orden dentro del mes:** día ascendente; si coinciden, primero la persona de mayor edad (`anio` ascendente, sin año al final); después por apellidos.
- **Rejilla:** 1–4 personas → 2 columnas; 5–9 → 3 columnas; más de 9 → el mes ocupa dos páginas.
- **Signo:** columna calculada `personas.signo` en la base; en la interfaz, `signoZodiacal()`. Nombre visible con `SIGNOS[clave].nombre`.
- **Cabecera del mes:** número, nombre, `traduccionesVisibles(mes)` y los signos que tocan el mes con sus fechas (`signosDelMes`, `rangoSigno`).
- **Recuerdos:** agrupados por año, del más reciente al más antiguo. Un recuerdo puede incluir a varias personas (`recuerdo_personas`) y varias fotos (`recuerdo_fotos`).
- **Personas fallecidas:** permanecen (`fallecida = true`). Cómo se señala está pendiente.
- **Ediciones:** cada vez que se imprime un calendario se registra en `ediciones`. Agregar personas nunca borra recuerdos.

## Fotos

Cada foto se guarda dos veces en Storage:

- **original** — sin modificar, para imprimir. Mínimo 1000 × 1000 px; rechazar las menores con un mensaje claro que explique por qué.
- **web** — WebP, lado mayor 1200 px, generada con sharp al subir.

La primera carpeta de toda ruta es el id de la familia (las políticas de Storage dependen de eso):

```
{familia_id}/personas/{persona_id}/original.jpg
{familia_id}/personas/{persona_id}/web.webp
{familia_id}/recuerdos/{recuerdo_id}/{foto_id}-original.jpg
{familia_id}/recuerdos/{recuerdo_id}/{foto_id}-web.webp
```

Retratos: recorte cuadrado, rostro centrado, de los hombros hacia arriba. La impresión usa siempre `original`; la web, siempre `web`.

## Sistema de diseño

Diseño aprobado en el lienzo de Claude: https://claude.ai/artifact/FWsQYv3AH2HoUPyHgS9FfG (fila "Propuesta 2").

Estilo: minimalista y elegante. Filetes de 1 px, mucho aire, sin sombras, sin degradados, sin esquinas redondeadas (salvo el arco de la portada B).

| Token | Valor | Uso |
|---|---|---|
| `--marfil` | `#FAF8F4` | fondo de páginas |
| `--tinta` | `#1C1A17` | texto principal; fondo de la portada A |
| `--bronce` | `#8A6D3F` | acento: días, filete del marco, íconos, mes activo |
| `--filete` | `#D9D2C6` | líneas divisorias |
| `--secundario` | `#6E675C` | rótulos y texto secundario |
| `--foto-vacia` | `#EDEAE4` | fondo de retrato sin foto |
| `--marca-agua` | `#ECE5D8` | monograma sobre marfil |
| `--marca-agua-oscura` | `#27241F` | monograma sobre la portada oscura |
| `--oro` | `#B9A57E` | líneas y texto de la portada A |
| `--sol` | `#C9B28A` | el sol de la portada A |

Tipografías (Google Fonts):

- **Cormorant Garamond** 300, 400, 500 e itálica 400, 500 — nombres de mes, nombres de personas, títulos
- **Jost** 300, 400, 500 — rótulos y datos

Rasgos recurrentes:

- Rótulos: Jost 10–11 px, mayúsculas, `letter-spacing` 0.18–0.34em, color secundario
- Día del cumpleaños: Cormorant 42 px, bronce · Nombre: Cormorant 22 px, peso 500 · Signo: rótulo + ícono bronce de 28 px
- **Marca de agua:** el monograma de la familia (`familias.monograma`, p. ej. "W&W") en Cormorant 28 px, repetido en filas alternadas con un patrón SVG de 240 × 168 px, detrás del contenido y dentro del marco. Las fotos la tapan.
- **Íconos del zodiaco:** `ZODIACO_ICONOS`, trazo 1.2, siempre en línea, nunca emojis.

## Página A3 del mes (impresión)

Medidas a 96 ppp → milímetros:

- Página 297 × 420 mm, vertical: `@page { size: 297mm 420mm; margin: 0 }`
- Franja superior de 17 mm **en blanco** para el anillado (la imprenta perfora; no imprimir agujeros)
- Márgenes laterales e inferior 10,6 mm → marco con filete bronce de 1 px → relleno interno 8,5 mm
- **Cabecera:** "01 — [apellidos]" en rótulo bronce; mes en Cormorant 300, 112 px, mayúsculas, `letter-spacing` 0.1em; traducciones; a la derecha, separados por un filete vertical, los signos del mes con ícono y fechas
- **Rejilla** de retratos según las reglas; separación 5,8 mm entre columnas y 5,3 mm entre filas; barra de 17 mm bajo cada foto: día · nombre y signo · ícono
- **Pie:** texto "Escanea para abrir [mes] en el álbum digital", tira con los 12 meses (el actual relleno en bronce con texto marfil) y el QR del mes de 23 × 23 mm
- Imprimir colores de fondo: `print-color-adjust: exact`

**Portada: A — Rueda solar** (decidido; la opción B, retrato familiar en arco, queda descartada por ahora). Fondo `--tinta`, sin marco. Contenido centrado, de arriba abajo: nombre de la familia en rótulo oro, la rueda, el bloque de título, y al pie el monograma con la edición.

**Geometría exacta de la rueda** (SVG propio, no es contenido de usuarios): `viewBox 0 0 760 760`, centro en `(380, 380)`, todo sin relleno y trazo color oro `#B9A57E` salvo donde se indique lo contrario.

1. Dos círculos exteriores concéntricos: radio 366 (trazo 1,1) y radio 356 (trazo 0,6).
2. Los 12 íconos de `ZODIACO_ICONOS` a radio 312, cada uno como `<g transform="translate(x-22, y-22) scale(1.833)">` con trazo 0,8 (fill none, stroke `#B9A57E` directo, no `currentColor`). Ángulo de cada ícono: empieza en -105° (capricornio) y suma 30° por signo, en el orden capricornio, acuario, piscis, aries, tauro, géminis, cáncer, leo, virgo, libra, escorpio, sagitario.
3. Círculo de radio 266 (trazo 0,9).
4. Escala de 60 marcas cada 6° desde -105°: la marca de cada 5 (i % 5 === 0 → coincide con el ángulo de cada ícono del zodiaco) va de radio 250 a 266 con trazo 1,1; las otras 48, de radio 258 a 266 con trazo 0,6.
5. Abreviaturas de los 12 meses (`MESES[].abreviatura`) a radio 226, centradas (`text-anchor: middle`, centrado también vertical) en los ángulos -90° + 30° × (número de mes − 1) — es decir, enero en -90°, independiente de los ángulos del zodiaco. Jost 13 px, `letter-spacing` 2,5 px, relleno oro.
6. Círculo de radio 200 (trazo 0,6).
7. Órbita: círculo de radio 154, trazo 1,2, punteado (`stroke-dasharray: 0.1 7`, extremos redondeados). Un planeta encima: círculo relleno marfil `#F3EEE4` de radio 7, sobre la órbita en el ángulo -38°.
8. El sol: círculo relleno `#C9B28A` de radio 50 en el centro (sin trazo), y 24 rayos cada 15° desde radio 64, alternando largo (hasta 100) y corto (hasta 84), trazo 1,5 oro.

**Texto de la portada** (debajo de la rueda salvo el nombre de familia, que va arriba de todo): "Nuestra" en Cormorant itálica 50 px color `#D9CBB0`; el título en Cormorant 300 de 116 px color `#F3EEE4` — el texto del título ("Vuelta al Sol") es provisional y vive en una sola constante (`NOMBRE_PRODUCTO` en `src/lib/producto.ts`) para poder cambiarlo sin tocar el componente; debajo, rótulo Jost 12 px espaciado oro "Cumpleaños y recuerdos de la familia". Al pie: el monograma de la familia en Cormorant, un filete vertical, y el número de edición en palabras ("Primera edición", "Segunda edición"…), calculado como una más que el número de filas ya guardadas en `ediciones` para esa familia.

## Vista del mes (celular)

`/f/[familia]/[mes]`. Solo lectura: sin botones de añadir o editar.

- Diseñada para celular (390 px de ancho) y centrada en pantallas grandes (ancho máximo ~480 px).
- Fondo marfil con la marca de agua del monograma de la familia (`familias.monograma`), igual que en impresión pero muy sutil.
- **Cabecera centrada:** rótulo con el nombre de la familia; fila con flecha al mes anterior, nombre del mes en Cormorant 300 mayúsculas con espaciado amplio, y flecha al mes siguiente (diciembre enlaza a enero y viceversa; zonas táctiles de 44 px mínimo). Debajo, `traduccionesVisibles()` y los signos del mes con su ícono y rango de fechas (`signosDelMes`, `rangoSigno`).
- Filete y el rótulo "Toca un retrato para abrir su historia".
- **Rejilla de 3 columnas:** foto cuadrada (`foto_web` con URL firmada; sin foto → fondo `--foto-vacia` con ícono de persona en línea), nombre en Cormorant 500, debajo el día, el nombre del signo y su ícono pequeño en bronce. Cada tarjeta enlaza a `/f/[familia]/p/[codigo]`. Orden según las reglas del calendario.
- Al final, la tira de los 12 meses con el actual resaltado en bronce; cada mes enlaza directo a esa página.
- Sin cumpleaños ese mes: mensaje elegante "Nadie cumple años en [mes]", con la navegación intacta.
- Mes fuera de 01–12: página 404. Familia desconocida: la puerta de acceso (ver "Acceso al álbum"), nunca un 404 — así no se distingue de un código equivocado.
- Ningún texto menor a 11 px.
- Los datos se consultan en el servidor (`src/lib/supabase-admin.ts`, con la service role key); nada de esa llave llega al navegador. Las fotos se muestran con URL firmadas de corta duración generadas también en el servidor.

## Ficha de persona (celular)

`/f/[familia]/p/[codigo]`. Mismo marco que la vista del mes: celular primero, máximo ~480 px, fondo marfil con la marca de agua sutil. Ningún texto menor a 11 px. Solo lectura: sin botones de añadir o editar.

- Arriba, enlace de regreso "← [Mes]" a `/f/[familia]/[mes de la persona]`.
- Retrato cuadrado grande (`foto_web` con URL firmada, o el mismo marcador de silueta que en la rejilla).
- Nombre completo en Cormorant 34 px. Debajo, en rótulo: "14 de enero · Capricornio" con el ícono del signo en bronce, y el parentesco si existe.
- Si hay año de nacimiento y la persona no está marcada como fallecida: "Cumple N años el 14 de enero", calculado con la fecha actual. Sin año, no se muestra edad.
- Filete y sección "Recuerdos", agrupados por año del más reciente al más antiguo. Cada año con su número en Cormorant bronce y una línea fina.
- **Cada recuerdo:** fotos (si hay varias, carrusel horizontal que se desliza con el dedo; al tocar una foto se abre en grande con botón de cerrar), título en Cormorant, fecha y lugar en rótulo, historia en Jost 15 px con buen interlineado. Si aparecen otras personas, "Con: [nombres]", cada nombre enlazado a su ficha.
- Sin recuerdos: "Aún no hay recuerdos de [nombre]".
- 404 si el código no existe, o si la persona pertenece a otra familia distinta a la del acceso ya verificado (nunca a la del slug de la URL sin verificar).
- Título de la pestaña: "[Nombre] — Vuelta al Sol". Todas las páginas bajo `/f/` (incluida la vista del mes) llevan `noindex` — no deben aparecer en buscadores.
- Mismo patrón de datos que la vista del mes: se consultan en el servidor con la service role key; las fotos, con URL firmadas.

## Acceso al álbum

Protege todo lo que cuelga de `/f/[familia]/...` (vista del mes, ficha de persona, y lo que se agregue después). La página de entrada es la única excepción.

**Flujo**

- Cualquier página bajo `/f/[familia]/...` sin un acceso válido redirige a `/f/[familia]/entrar?siguiente=<ruta original>`. `siguiente` se valida: debe empezar por `/f/[familia]/`, si no, se ignora (evita abrir redirecciones a otros sitios).
- La página de entrada nunca revela si la familia existe ni muestra su nombre: con un slug inventado se ve exactamente igual y el código simplemente falla. Diseño: marfil, marca de agua, el sol pequeño, "Vuelta al Sol", "Escribe el código de tu familia", un campo grande y el botón "Entrar".
- Campo de código: texto visible (no contraseña), tamaño de fuente ≥16 px (para que Safari en iPhone no haga zoom al enfocar), sin mayúscula automática ni autocorrector.
- El código se normaliza (recorta espacios, minúsculas) tanto al guardarlo como al verificarlo — en la base de datos, con `normalizar_codigo()`.

**Verificación y cookie**

- El servidor llama a `verificar_codigo_familia(slug, codigo)` con la service role key. Si es correcto, firma una cookie con HMAC (variable `ACCESO_SECRETO` en `.env.local`, nunca en el repo ni en el chat): `httpOnly`, `secure` en producción, `sameSite lax`, ruta `/f/[familia]`, un año de duración.
- La cookie guarda el id de la familia y `familias.codigo_version`. Cambiar el código (`cambiar_codigo_acceso`) incrementa esa columna, así que la cookie vieja deja de coincidir y cierra la sesión en todos los teléfonos a la vez.
- Toda función que lee datos de una familia recibe el id que viene de la cookie ya verificada (`verificarAcceso()` en `src/lib/acceso.ts`), nunca el slug de la URL directamente. La cookie de una familia no sirve para otra: aunque alguien reenvíe la cookie bajo otro slug, el id que lleva dentro no coincide y el acceso se rechaza.

**Límite de intentos**

- Máximo 5 intentos fallidos por IP cada 15 minutos, y 30 fallidos por familia cada hora.
- Tabla `intentos_acceso`: guarda la IP como hash (nunca en claro), RLS activado y sin políticas — solo la usa el servidor con la service role key. Los registros de más de un día se borran en cada intento (sin tarea programada aparte).
- Mensajes: "Código incorrecto. Te quedan N intentos." y, al llegar al límite, "Demasiados intentos. Vuelve a intentarlo en 15 minutos."

## Vista de impresión (Fase 7)

`/admin/[familia]/imprimir`. La ve cualquier miembro (admin o colaborador), como "Ver álbum"; es de solo lectura salvo el botón de registrar edición (solo admin).

- **En pantalla:** cada hoja A3 (portada y las 12 de mes) se muestra en miniatura a escala fija 0,4 (una hoja verdadera de 297 × 420 mm dentro de un contenedor del mismo tamaño escalado, con `transform: scale`), apiladas en una lista vertical dentro del panel — es solo para revisar el contenido, no hace falta que se vea a tamaño real en pantalla.
- **Para imprimir/exportar:** un botón "Guardar como PDF" llama a `window.print()`. En `@media print`, cada hoja vuelve a su tamaño real (297 × 420 mm, sin escala) y con `page-break-after: always` (una hoja = una página); el encabezado y la navegación del panel (`<header>` del layout de `[familia]`) se ocultan, y el `<main>` que envuelve el contenido pierde su `max-width`/relleno para que las hojas no queden descuadradas. No hay generación de PDF en servidor todavía (queda para después, según el plan).
- **Registrar edición:** botón aparte, solo para admin, que inserta una fila en `ediciones` (`numero` = uno más que las que ya existen para esa familia, `notas` opcional) — deja constancia de que se imprimió un lote, sin intentar detectar automáticamente si la persona canceló el diálogo de impresión.
- **Fotos:** siempre `foto_original` (nunca `foto_web`), con el cliente de sesión del admin (RLS), igual que el resto del panel — nunca la service role key.
- **QR de cada mes:** se genera en el servidor como SVG (paquete `qrcode`), apunta a `/f/[familia]/[mes]`. La base de la URL es `NEXT_PUBLIC_SITIO_URL` (sin barra final) cuando está definida — **siempre tiene prioridad**, porque un QR ya impreso apuntando a una IP de red o a `localhost` queda inservible para siempre y no hay forma de corregirlo después. Si esa variable no está definida, se arma con el origen (protocolo + host) de la propia petición, para poder probar la vista en `localhost` o en la IP de red sin configurar nada. La página muestra una advertencia visible (no solo en consola) en dos casos: la variable no está definida y el host de la visita no es `localhost`/`127.0.0.1` (probablemente alguien probando desde la IP de red o ya en producción sin configurarla); o la variable sí está definida pero su valor igual resuelve a `localhost`/`127.0.0.1` (quedó de una prueba anterior). Sin la variable definida, entrar por `localhost` no avisa — es lo esperado al probar en el propio computador.
- **Guía de impresión en pantalla:** debajo de los botones, un bloque de texto (no se imprime, `@media print { display: none }` como los botones) con los ajustes exactos de Chrome — Guardar como PDF, márgenes "Ninguno", gráficos de fondo activado — y las especificaciones para la imprenta: A3, 297 × 420 mm, papel opalina o algodón mate de 250 a 300 g, anillado metálico superior con la perforación dentro de la franja blanca de 17 mm.
- **Meses con más de 9 personas:** se reparten en dos hojas seguidas, manteniendo el orden de las reglas del calendario (la primera hoja se lleva `ceil(n/2)`, la segunda el resto); ambas repiten la cabecera y el pie del mes, y la etiqueta pequeña de la cabecera ("01 — [nombre de la familia]") suma " · 1/2" / " · 2/2".
- **Etiqueta de cabecera de cada página de mes:** "01 — [nombre de la familia]" del diseño aprobado se arma como `{número de mes a dos dígitos} — {familias.nombre}`.

## Panel de administración

`/admin/...`. Se construye en cuatro partes (6a–6d); una a la vez, con confirmación entre cada una (ver "Plan por fases").

**Generales**

- Diseño con la misma estética del álbum (tokens, tipografías) pero funcional ante todo, y que sirva bien en celular: muchos familiares suben recuerdos desde el teléfono.
- Las operaciones usan el cliente de Supabase con la sesión del usuario (cookies de Auth vía `@supabase/ssr`), para que la seguridad por filas (RLS) decida qué puede hacer cada quien — nunca la service role key para leer o escribir datos de familias/personas/recuerdos en nombre del usuario.
- La service role key solo se usa en el servidor para: procesar fotos (Storage + sharp) y crear cuentas de colaboradores — y siempre después de comprobar con el cliente de sesión que quien lo pide es admin de esa familia.
- Si el usuario tiene sesión de Supabase Auth y es miembro (admin o colaborador) de la familia, el álbum `/f/[familia]/...` no le pide el código de acceso: `verificarAcceso()` primero intenta por sesión (una consulta protegida por RLS: si vuelve vacía, no es miembro) y solo si eso falla, cae al código con cookie firmada.
- Todo `/admin` lleva `noindex`, igual que `/f/`.

**6a — Sesión y familias**

- `/admin/entrar`: correo y contraseña (Supabase Auth). El registro público está desactivado; las cuentas las crea un admin (ver 6d) o se crean a mano en Supabase.
- Todo lo demás bajo `/admin` exige sesión; sin ella, redirige a `/admin/entrar`.
- `/admin`: familias donde el usuario es miembro (la propia consulta a `familias` ya queda filtrada por RLS) y botón "Crear familia" (llama a `crear_familia`).
- `/admin/[familia]`: resumen con cuántas personas cumplen años en cada uno de los 12 meses, y accesos a Personas, Recuerdos, Ajustes y "Ver álbum" (abre `/f/[familia]/[mes actual]`).
- `/admin/[familia]/ajustes`: nombre, monograma y cambiar el código de acceso — con una advertencia antes de guardar: cambiarlo obliga a todos a escribir el código nuevo (sube `codigo_version`).

**6b — Personas y fotos**

- Lista de personas agrupada por mes. Formulario: nombres, apellidos, día y mes (listas desplegables), año opcional, parentesco, casilla "fallecida".
- Foto: acepta JPG, PNG y WebP. HEIC (fotos de iPhone que no se convirtieron) da un mensaje claro pidiendo JPG. Recorte cuadrado en pantalla, con arrastre y zoom. Si la zona recortada queda por debajo de 1000 × 1000 px, se rechaza con una explicación.
- Las fotos suben directo del navegador a Storage con una URL de subida firmada (Vercel limita a unos 4,5 MB lo que pasa por el servidor). Después, el servidor procesa con sharp: aplica el recorte, corrige la orientación EXIF, quita los metadatos (incluida la ubicación GPS), y guarda `original.jpg` a resolución completa y `web.webp` de 800 px.

**6c — Recuerdos**

- Lista de recuerdos por año. Formulario: fecha, título, historia, lugar, personas (casillas con buscador) y varias fotos, reordenables — la primera es la portada.
- Mismo procesamiento de fotos que en personas, pero sin recorte y con la versión web a 1600 px en el lado mayor.
- Permisos: el colaborador crea recuerdos y edita los suyos; solo el admin borra (ya están las políticas de RLS para esto en `schema.sql`).

**6d — Colaboradores**

- En Ajustes: lista de miembros con su rol. El admin crea un colaborador con nombre y correo; el sistema genera una contraseña temporal que se muestra una sola vez para compartirla fuera de la app. El colaborador puede cambiarla al entrar.
- El admin puede quitar miembros, pero no puede quitarse a sí mismo si es el único admin de la familia. Esto se valida en pantalla (`quitarMiembroAction`) y además lo impide un trigger en la base (`proteger_ultimo_admin`, migración 004): ninguna familia puede quedar sin al menos un admin, venga el cambio de donde venga.

## Plan por fases

Trabaja **una fase a la vez**. Al terminar cada una: explica en lenguaje sencillo qué se hizo, cómo probarlo, y espera confirmación antes de seguir.

1. **Base:** proyecto Next.js + TypeScript en esta carpeta, conexión a Supabase, `.env.local`, `.gitignore`, tokens de diseño y fuentes.
2. **Base de datos:** guiar al dueño para crear el proyecto en Supabase y correr `schema.sql` y `seed.sql`; generar los tipos de TypeScript de la base.
3. **Vista del mes** `/f/[familia]/[mes]` con la familia `demo` (sin código de acceso todavía).
4. **Ficha de persona** con la línea de tiempo de recuerdos.
5. **Código de acceso** + cookie + límite de intentos.
6. **Panel de administración:** inicio de sesión, personas (con subida y validación de fotos), recuerdos, colaboradores.
7. **Vista de impresión:** portada y 12 páginas A3; prueba de exportación a PDF.
8. **Lanzamiento:** QR por mes, dominio, pruebas en celular, prueba de impresión real de enero.

## Forma de trabajar

- Interfaz en español. Nombres del dominio en español, igual que la base de datos (`Persona`, `Recuerdo`, `signo`).
- Explica cada comando que ejecutes y cada decisión técnica sin jerga, o definiéndola cuando sea necesaria.
- Antes de instalar una dependencia nueva, di para qué sirve.
- Haz commits pequeños con mensajes en español.

## Antes de imprimir de verdad (lista de lanzamiento, Fase 8)

- [ ] Comprar el dominio definitivo.
- [ ] Repositorio en GitHub (privado) y proyecto en Vercel conectado a él.
- [ ] Proyecto de Supabase **nuevo** para producción (no el de pruebas): correr solo `supabase/schema.sql` — ya incluye lo de las tres migraciones, no hace falta correrlas aparte — y no correr `seed.sql` (esa familia `demo` es solo para desarrollo).
- [ ] Cargar en Vercel las 5 variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (las tres del proyecto de Supabase de producción, no el de pruebas), `ACCESO_SECRETO` (uno nuevo, distinto al de `.env.local`), `NEXT_PUBLIC_SITIO_URL` (el dominio definitivo, sin barra final).
- [ ] Crear la familia real desde `/admin` (con `crear_familia`) y cargar las personas y fotos reales.
- [ ] **Subir el plan de Supabase de Free a Pro ($25/mes) — justo antes de entregar el primer calendario impreso, no antes.** Mientras se desarrolla, Free alcanza porque hay actividad diaria y no importa que se pause. Decidido 2026-09-23: ver la investigación completa (pausa a los 7 días de inactividad, reactivación manual, Pro nunca pausa) en el historial de esta conversación. Además, el plan Free permite solo **2 proyectos activos por cuenta**, y entre el de pruebas y el de producción ya se llega a ese límite — otra razón para no dejarlo todo en Free por mucho tiempo. Esto no es un problema al vender a más familias: todas conviven en el **mismo** proyecto/base de datos de producción (ver "Stack" — multifamilia desde el día uno, con RLS por `familia_id`), así que vender a la familia número 10 o 50 no pide un proyecto de Supabase nuevo, solo una fila más en `familias`.
- [ ] Entrar a `/admin/[familia]/imprimir` ya en el dominio real y confirmar que **no** sale la advertencia del QR (si sale, `NEXT_PUBLIC_SITIO_URL` está mal puesta o sigue en localhost).
- [ ] Prueba de impresión real de enero en la imprenta, siguiendo la guía de impresión de esa misma página (A3, 297 × 420 mm, papel opalina o algodón mate 250-300 g, anillado metálico superior con perforación en la franja blanca de 17 mm).

## Pendientes por decidir

- ~~Plan de Supabase al lanzar~~ — decidido 2026-09-23, ver "Antes de imprimir de verdad" más abajo.
- Cómo se señala a una persona fallecida.
- Si los recuerdos de colaboradores necesitan aprobación del admin.
- Nombre definitivo del producto (se trabaja con "Vuelta al Sol"; la constante `NOMBRE_PRODUCTO` en `src/lib/producto.ts` centraliza el texto de la portada para cuando se decida).
- Datos de enero: apellido de Yorla; confirmar si son dos personas llamadas Wilson Tabares (19 y 20).
- Precio y forma de venta.
- Hoy cualquier usuario con sesión puede crear familias (`crear_familia` solo exige `auth.uid()`), incluidos los colaboradores. Antes de vender hay que definir quién puede hacerlo y reforzarlo en la base de datos, no solo ocultando el botón en la pantalla.
- Durante la Fase 6, la membresía de admin de Wilmar en la familia `demo` desapareció de la tabla `miembros` sin que se pudiera determinar la causa: se revisó `quitarMiembroAction` (nunca se ejecutó contra su cuenta) y el resto de scripts corridos en esa sesión (ninguno toca `miembros`). Sospecha sin confirmar: el script `hacer-admin.mjs` original no verificó con `.select()` que el `upsert` realmente insertara la fila. Vigilar si se repite — si vuelve a pasar, revisar los logs de Supabase (Dashboard → Logs → Postgres/API) en el momento exacto.
