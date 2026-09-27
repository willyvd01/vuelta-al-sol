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

- RLS activado en todas las tablas. Roles por familia: `admin` y `colaborador` — desde la Fase 9 (9b/9c/9d), ambos agregan, editan y borran (a la papelera) personas y recuerdos por igual; lo único exclusivo del admin es la papelera de Ajustes y la administración de colaboradores.
- Quien escanea el QR no tiene usuario. Flujo: la página pide el código de acceso → una ruta del servidor llama `verificar_codigo_familia(slug, codigo)` con la service role key → si es correcto, guarda una cookie httpOnly firmada con el id de la familia → las páginas del álbum consultan en el servidor con la service role y entregan las fotos con URL firmadas de corta duración.
- Limitar intentos de código por IP (fuerza bruta).
- La service role key vive solo en `.env.local` y en las variables de Vercel. **Nunca** en código del navegador, nunca en Git, nunca en el chat.
- Crear familias solo con la función `crear_familia()`: deja al creador como admin.

## Reglas del calendario

- **Orden dentro del mes:** día ascendente; si coinciden, primero la persona de mayor edad (`anio` ascendente, sin año al final); después por apellidos.
- **Rejilla (Fase 10a):** siempre 9 casillas, 3 columnas × 3 filas, del mismo tamaño, llenas en orden de lectura (izquierda a derecha, arriba a abajo) con las personas del mes ya ordenadas. Ya no varía el número de columnas según cuántas personas haya. Más de 9 personas: sigue una segunda hoja del mismo mes, con la misma rejilla de 9 (en pantalla, dentro de la misma página del mes; en la impresión, una hoja A3 más — ver "Página A3 del mes"). Las casillas que sobran sin persona quedan vacías (ver más abajo), nunca se estiran ni cambian de tamaño para llenar el espacio.
- **Casillas vacías:** mismo marco que las ocupadas, con una silueta de persona muy tenue en vez de foto. En el álbum digital son tocables y abren "Agregar a alguien" (el formulario de agregar persona de la Fase 9c, con el mes ya elegido); en el calendario impreso no llevan texto ni son interactivas — Ajustes tiene una casilla para mostrarlas u ocultarlas al imprimir (`mostrar_siluetas_impresas` en `familias`, activada por defecto).
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
- **Marco de casilla (Fase 10a), mismo en pantalla y en impresión:** filete exterior de 1 px color `--filete` alrededor de toda la casilla; la foto (o la silueta, si está vacía) va separada de ese filete por un margen pequeño (6 px en pantalla, 1,5 mm impreso); en las cuatro esquinas, dentro de ese margen, una marca discreta en `--bronce` (un par de líneas cortas en L, no un punto). Sin sombras ni degradados, igual que el resto del sistema. Casilla ocupada y vacía llevan el mismo marco — lo único que cambia es la foto por la silueta tenue.

## Página A3 del mes (impresión)

Medidas a 96 ppp → milímetros:

- Página 297 × 420 mm, vertical: `@page { size: 297mm 420mm; margin: 0 }`
- Franja superior de 17 mm **en blanco** para el anillado (la imprenta perfora; no imprimir agujeros)
- Márgenes laterales e inferior 10,6 mm → marco con filete bronce de 1 px → relleno interno 8,5 mm
- **Cabecera:** "01 — [apellidos]" en rótulo bronce (con "· 1/2" o "· 2/2" si el mes ocupa dos hojas); mes en Cormorant 300, 112 px, mayúsculas, `letter-spacing` 0.1em; traducciones; a la derecha, separados por un filete vertical, los signos del mes con ícono y fechas
- **Rejilla (Fase 10a):** siempre 3 × 3, del mismo tamaño en las doce hojas — ver "Reglas del calendario". Separación 5,8 mm entre columnas y 5,3 mm entre filas; barra de 17 mm bajo cada foto: día · nombre y signo · ícono. Casillas vacías: mismo marco, silueta muy tenue, sin texto — se pueden ocultar desde Ajustes (`mostrar_siluetas_impresas`)
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

`/f/[familia]/[mes]`. Desde la Fase 9c ya no es de solo lectura: tiene el botón "Agregar a alguien de la familia"; desde la 10a, las casillas vacías de la rejilla también son tocables con el mismo fin.

- Diseñada para celular (390 px de ancho) y centrada en pantallas grandes (ancho máximo ~480 px).
- Fondo marfil con la marca de agua del monograma de la familia (`familias.monograma`), igual que en impresión pero muy sutil.
- **Cabecera centrada:** rótulo con el nombre de la familia; fila con flecha al mes anterior, nombre del mes en Cormorant 300 mayúsculas con espaciado amplio, y flecha al mes siguiente (diciembre enlaza a enero y viceversa; zonas táctiles de 44 px mínimo). Debajo, `traduccionesVisibles()` y los signos del mes con su ícono y rango de fechas (`signosDelMes`, `rangoSigno`).
- Filete y el rótulo "Toca un retrato para abrir su historia".
- **Rejilla fija de 9 casillas, 3 × 3** (Fase 10a — ver "Reglas del calendario"): foto cuadrada (`foto_web` con URL firmada), nombre en Cormorant 500, debajo el día, el nombre del signo y su ícono pequeño en bronce. Cada tarjeta ocupada enlaza a `/f/[familia]/p/[codigo]`. Orden según las reglas del calendario. Las casillas sin persona muestran la silueta tenue y enlazan a "Agregar a alguien" con el mes ya elegido — nunca se ve la rejilla vacía de verdad, ni siquiera sin cumpleaños ese mes: son 9 invitaciones a agregar a alguien.
- Al final, la tira de los 12 meses con el actual resaltado en bronce; cada mes enlaza directo a esa página.
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

## Qué puede hacer la familia desde el álbum (Fase 9)

Hasta la Fase 8, `/f/[familia]/...` era de solo lectura. Desde la Fase 9, quien tiene el código (o sesión de miembro) puede aportar contenido directamente desde el álbum, no solo desde `/admin`.

**Tabla de permisos**

| Quién | Puede |
|---|---|
| Visitante con el código (cookie de acceso, sin cuenta) | Ver todo, agregar recuerdos y personas, editar solo lo que él mismo creó |
| Miembro con cuenta (admin o colaborador de la familia) | Todo lo anterior, y además edita y borra lo de **cualquiera** |
| Nadie sin el código y sin sesión | No puede escribir nada |

**Cambio importante respecto a lo ya construido:** en la Fase 6c el colaborador solo editaba lo suyo y no borraba nada; en la 6b, personas era terreno exclusivo del admin. La tabla de arriba lo amplía: de ahora en adelante cualquier miembro con cuenta (admin o colaborador) edita y borra el contenido de cualquiera, tanto recuerdos como personas, y también puede agregar personas — no solo el admin. Como los permisos son una sola capa de RLS compartida entre el álbum y `/admin`, este cambio se nota en los dos lugares. Se implementa en la parte de la Fase 9 (9b o 9c) que primero toque esa tabla, no en la 9a.

**Seguridad — todo esto es nuevo con la Fase 9**

Los visitantes del álbum no tienen usuario de Supabase Auth: la seguridad por filas (RLS) no los protege, porque RLS decide según `auth.uid()` y para ellos siempre es nulo. Por eso, toda escritura que venga de una visita (no de una sesión de miembro) pasa por una acción de servidor que:

1. Verifica la cookie de acceso (`verificarAcceso()`) antes de aceptar nada.
2. Usa **solo** el id de familia que viene de esa cookie ya verificada — nunca el slug de la URL ni ningún id que mande el formulario — para decidir a qué familia pertenece lo que se guarda.
3. Para editar o borrar algo existente, comprueba que la fila pertenezca a esa familia y, si quien edita no es un miembro con sesión, que el `autor_token` de la fila coincida con el de la cookie de identidad de quien pide el cambio.
4. Usa la service role key (se salta RLS a propósito, igual que ya hace el procesamiento de fotos) — la validación queda enteramente en el código de la acción, así que estas son las acciones de mayor cuidado de todo el proyecto.
5. Respeta un límite de aportes por familia y por hora (ver 9a).

## 9a — Edad e identidad del visitante

**Edad:** ya existía en la ficha de persona (Fase 4) un cálculo simple (`añoActual − año de nacimiento`), sin considerar si el cumpleaños de este año ya pasó. Se ajusta ese mismo cálculo, no uno nuevo:

- Compara el día de hoy en la zona horaria `America/Bogota` (no la del servidor, que puede estar en otro huso) contra el día y mes de la persona.
- Ya pasó este año → "Cumplió N años el 14 de enero".
- Todavía no llega → "Cumple N años el 14 de enero".
- Es hoy → "Hoy cumple N años".
- Solo se muestra si hay año de nacimiento y la persona no está marcada como fallecida (regla que ya existía).
- 29 de febrero: en un año que no es bisiesto, se compara como si fuera 28 de febrero (el texto siempre dice "29 de febrero"; solo cambia cuándo se considera "ya pasó").
- La página ya tiene `export const dynamic = "force-dynamic"` desde la Fase 4: se vuelve a calcular en cada visita, así que ya cumple de sobra con que el año cambie solo — no hace falta agregar una revalidación aparte.

**Identidad del visitante:** la primera vez que alguien sin sesión intenta aportar algo (Fases 9b/9c), el álbum le pide su nombre y lo guarda en una cookie firmada con HMAC — mismo mecanismo y mismo secreto (`ACCESO_SECRETO`) que la cookie de acceso — `httpOnly`, `secure` en producción, `sameSite lax`, ruta `/f/[familia]`, un año de duración. Guarda el nombre y un identificador propio generado en el servidor (`autor_token`). Mientras esa cookie exista, sus aportes nuevos llevan ese mismo token, y es lo que le permite verlos como propios y editarlos.

Columnas nuevas, opcionales, en `personas` y `recuerdos`: `autor_nombre text`, `autor_token text` (quedan vacías en lo creado desde `/admin`, donde ya existe `creado_por` para lo mismo). Migración `005_autor_visitante.sql`, y el cambio también entra a `schema.sql`, que sigue siendo la fuente de verdad para un proyecto nuevo.

**Límite de aportes:** se extiende la tabla `intentos_acceso` (no se crea una nueva) con una columna `tipo text not null default 'acceso'`; ahora también admite filas `tipo = 'aporte'`. Límite propuesto: **20 aportes por familia por hora** (ajustable; los límites de acceso existentes son 5/15 min por IP y 30/hora por familia, este queda en ese mismo orden). Pasado el límite: "Ya se agregaron muchos recuerdos y personas en la última hora. Intenta de nuevo más tarde." Reutiliza el mismo patrón de conteo por familia que ya existe para los intentos de código.

## 9b — Agregar recuerdos desde el álbum

- Botón "Agregar un recuerdo de [nombre]" en la ficha de persona.
- Formulario simplificado del panel: fecha, título, historia, fotos, esa persona ya marcada, con opción de etiquetar a otras de la misma familia.
- Máximo 10 fotos por recuerdo, 15 MB por foto (el panel no tiene este límite explícito porque lo sube un admin de confianza; aquí sí, porque es de cualquiera con el código).
- Mismo procesamiento que en el panel (`procesarFotoRecuerdo`): versión original y web, sin metadatos de ubicación.
- Bajo cada recuerdo: "Agregado por [nombre]" — el nombre sale de `autor_nombre` si lo creó un visitante, o del nombre del miembro (`user_metadata.nombre`, vía `creado_por`) si lo creó alguien del panel. Quien lo creó (mismo `autor_token`, o su propia sesión) ve "Editar"; un miembro con cuenta ve además "Borrar", sin importar quién lo creó; nadie más ve ningún control.
- Aquí es donde se amplía la política de RLS de `recuerdos` (migración 006): cualquier miembro **edita** el de cualquiera, no solo el admin. Borrar se queda como estaba (solo admin) hasta la Fase 9d, que construye la papelera — no tenía sentido ampliar ese permiso todavía sin el borrado suave.
- Aviso en el panel (Resumen) cuando el Storage de la familia pase de 800 MB (deja margen antes del 1 GB del plan Free). Se calcula al vuelo listando las carpetas de esa familia en Storage, no con un contador aparte: a la escala de fotos de una familia (decenas o cientos, no miles) es rápido, y así nunca se puede desincronizar de lo que de verdad hay guardado.

## 9c — Agregar personas desde el álbum

- Botón discreto "+ Agregar a alguien de la familia" en la vista del mes (`/f/[familia]/personas-nueva?mes=…&volver=…`).
- Formulario: nombres, apellidos, día y mes, año opcional ("Si lo pones, el álbum mostrará la edad que cumple cada año"), parentesco, foto con el mismo recorte cuadrado del panel (se reutiliza `RecortadorFoto` del panel tal cual).
- Antes de guardar, si ya existe alguien con nombre y fecha parecidos, avisa para evitar duplicados (avisa y confirma, no bloquea). "Parecido" es exacto o uno contiene al otro (sin tildes, sin mayúsculas) — no es una coincidencia difusa de verdad: "Martha" con h no avisa contra "Marta" sin h, aunque sea el mismo día. Suficiente para el caso típico (alguien que escribe solo el nombre de pila, o con un apellido de más), no para cualquier error de tipeo.
- La persona aparece de inmediato en el álbum. En la base queda marcada como no impresa todavía (`impresa_en_edicion int`, el número de la última `ediciones.numero` en la que ya salió impresa, o `null` si nunca ha salido — migración 007). La vista de impresión y el resumen del panel muestran cuántas personas están sin imprimir desde la última edición registrada; al registrar una edición nueva (`registrarEdicionAction`, Fase 7) se marcan todas las que había sin imprimir como impresas en esa edición.
- En el álbum (rejilla del mes y ficha), una marca discreta "Nueva" mientras no esté impresa.
- Aquí es donde se amplía la política de RLS de `personas` (migración 007): cualquier miembro **agrega y edita**, no solo el admin; y un visitante con el código también agrega. Borrar se queda solo para el admin hasta la Fase 9d, igual que con los recuerdos.

**Editar (agregado después de confirmar 9c):** en la ficha de persona, si quien la ve fue quien la creó (mismo `autor_token` que ya usan los recuerdos, Fase 9a) o es un miembro con cuenta, ve "Editar" — nombres, apellidos, día, mes, año, parentesco y foto, mismo recorte cuadrado. Nadie más ve ese control. No hay revisión de duplicados al editar (solo aplica a crear uno nuevo).

Si el día o el mes cambian y esa persona ya había salido en algún calendario impreso (`impresa_en_edicion` no era null), vuelve a quedar en null — cambió de hoja física, así que hay que reimprimirla. Esto reutiliza el mismo aviso de "personas sin imprimir" del Resumen y la vista de impresión (Fase 9c) en vez de un mecanismo aparte: no distingue "es alguien nuevo" de "cambió de mes", pero en los dos casos lo que el admin necesita saber es lo mismo — falta volver a imprimir.

## 9d — Papelera

- Borrar (recuerdos o personas) no elimina de verdad: marca `borrado_en timestamptz` y `borrado_por` (quién, `auth.users.id` — migración 008), y desde ahí queda oculto del álbum y de las listas normales del panel. No hizo falta tocar RLS para esto: como "borrar" ahora es un `update` (no un `delete`), ya queda cubierto por las mismas políticas `_editar` que la Fase 9b/9c dejaron abiertas a cualquier miembro; las consultas de lectura normales (panel y álbum) simplemente agregan `.is("borrado_en", null)`.
- Con esto se completó el reparto de permisos que faltaba desde la 9b/9c: los botones "Borrar" del panel (personas y recuerdos) dejaron de estar detrás de `esAdmin` — ahora cualquier miembro los ve y los usa, igual que "Editar" y "Agregar". El admin sigue siendo el único que ve la papelera y puede restaurar.
- No hay botón de borrar en el álbum (ni para visitantes ni para miembros): solo existe en el panel. La tabla de permisos dice que el visitante nunca borra; para el miembro con cuenta, borrar solo se construyó en el panel — no se pidió un botón de borrar en la ficha de persona ni en los recuerdos del álbum.
- El admin ve una papelera en Ajustes: qué se borró (persona o recuerdo), quién y cuándo, con un botón para restaurar (limpia `borrado_en`/`borrado_por`). Usa el cliente de sesión igual que el resto de Ajustes — RLS ya deja ver y actualizar cualquier fila de la familia a un miembro, la página es la que decide mostrar esto solo si `esAdmin`.
- Lo borrado hace más de 30 días se elimina de verdad (la fila y sus fotos en Storage) — se purga con la service role key (hay que borrar Storage, eso no es cosa de RLS) cada vez que se abre la papelera, igual que `limpiarIntentosViejos()`, sin tarea programada aparte.

## Reparto final de responsabilidades (al terminar la Fase 9)

Nosotros (el panel de `/admin`) creamos familias, las configuramos (Ajustes) y generamos la impresión. La familia, desde el álbum con su código, se mantiene sola: agrega a quien nace o falta, agrega los recuerdos según van pasando, y corrige lo suyo — sin depender de que alguien entre al panel.

## Fase 10 — Rediseño visual y centro de ayuda

Se construye en cuatro partes (10a–10d), una a la vez, con confirmación entre cada una — igual que la Fase 9.

## 10a — Rejilla fija de nueve casillas

- La regla de la rejilla (siempre 3 × 3, 9 casillas, llenas en orden de lectura; más de 9 → segunda hoja del mismo mes) y el marco de cada casilla ya quedaron en "Reglas del calendario" y "Sistema de diseño" — esta sección es la parte de implementación.
- Un solo componente de casilla (`Casilla.tsx` o similar) para las dos vistas del álbum (vista del mes) — nada de dos implementaciones paralelas; el marco y el tamaño se comparten. La impresión (`PaginaMes.tsx`, Fase 7) tiene su propio componente porque ya vive en mm, pero replica el mismo marco visual descrito en "Sistema de diseño".
- **Casilla ocupada:** foto cuadrada, sin cambios respecto a lo que ya había (día · nombre y signo · ícono en pantalla; barra de 17 mm en impresión).
- **Casilla vacía:** `<IconoPersona>` muy tenue centrado (mismo ícono que ya se usa para "sin foto", pero con opacidad baja — no es un ícono nuevo). En el álbum, envuelta en un enlace a `/f/[familia]/personas-nueva?mes=…&volver=…` (la misma ruta de la Fase 9c) con texto accesible "Agregar a alguien"; en la impresión, sin enlace ni texto — solo la silueta (o ni eso, si `mostrar_siluetas_impresas` está desactivada).
- **Segunda hoja del mismo mes:** ya existía para la impresión desde la Fase 7 (el reparto en dos hojas cuando hay más de 9). En el álbum digital es nuevo: si un mes tiene más de 9 personas, la vista del mes muestra dos rejillas de 9 seguidas, no una rejilla que crece — la segunda con las personas que sobraron y las casillas vacías que le falten a esa segunda hoja.
- `familias.mostrar_siluetas_impresas boolean not null default true` (migración nueva): controla solo la impresión: en el álbum digital las siluetas tocables siempre se muestran (son la forma de agregar gente); lo que se apaga es la silueta en la hoja que se manda a imprimir. Ajustes tiene la casilla para cambiarlo, con el texto exacto que pidió el dueño: "Mostrar siluetas en las casillas vacías del calendario impreso".

## 10b — Animaciones

Solo viven en el álbum digital (`/f/...`); nunca en la impresión (`@media print` las apaga todas, de raíz, en `src/styles/animaciones.css`) ni en el panel de administración. Respetan `prefers-reduced-motion`: con esa preferencia activa, todo lo que tenga una animación propia se vuelve un simple desvanecido, sin movimiento — una sola regla global lo cubre (`animation-name: vs-desvanecer !important` bajo la media query), así que ningún componente nuevo necesita su propio caso especial para eso. Solo se anima `transform` y `opacity`, por rendimiento en celular. Todo en CSS puro — sin librerías de animación.

- **Entrada de la rejilla:** las 9 casillas de cada hoja aparecen con `opacity` y suben 8 px, escalonadas 60 ms entre sí, 320 ms cada una, `ease-out`. Cada `<li>` de la rejilla lleva la variable CSS `--indice` (0 a 8) y `.tarjeta`/`.tarjetaVacia` leen `animation-delay: calc(var(--indice) * 60ms)` — nada de JS para el escalonado.
- **Toque/hover de una casilla:** la foto (o silueta) escala a 1.03 y el filete del marco pasa a bronce, en 240 ms. Con `prefers-reduced-motion`, el escalado se anula pero el cambio de color del marco se deja (es un color, no movimiento).
- **Cambio de mes:** deslizamiento horizontal en la dirección de la navegación (como voltear una hoja del calendario), con la View Transitions API nativa del navegador — sin soporte, es una navegación normal sin animación. `src/components/EnlaceAnimado.tsx` envuelve cada enlace de navegación de mes (flechas y tira de meses inferior); antes de navegar, marca `data-vs-direccion="siguiente"|"anterior"` en `<html>` (si el visitante no prefiere menos movimiento) y llama a `document.startViewTransition()`. El contenido del mes (`.contenido`, en `[mes]/page.tsx`) lleva `view-transition-name: vs-mes`; `animaciones.css` define las curvas de entrada/salida según la dirección. Con `prefers-reduced-motion`, `EnlaceAnimado` no marca dirección, así que se usa el cruce de opacidad por defecto del navegador (nunca el deslizamiento).
- **Abrir una persona:** la foto de la casilla (`.foto` en la rejilla) y el retrato de la ficha (`.retrato` en `p/[codigo]/page.tsx`) comparten el mismo `view-transition-name` (`vs-persona-<código>`), así que el navegador la hace crecer de una a otra automáticamente, en cualquier sentido (ir y volver). Sin soporte de View Transitions, `EnlaceAnimado` navega normal y `.contenido` de la ficha tiene un desvanecido simple (`vs-desvanecer`, 240 ms) como reemplazo.
- **Carga de fotos:** `src/components/FotoConEsqueleto.tsx` envuelve `next/image`; mientras la foto no ha cargado (`onLoad`), cubre el espacio (ya fijo por el `aspect-ratio` del contenedor, así que nunca hay salto de layout) con un brillo sutil que barre de lado a lado (`.vs-esqueleto`, solo `transform` en el barrido). Se usa en la rejilla del mes y en el retrato de la ficha.

## Vista de impresión (Fase 7)

`/admin/[familia]/imprimir`. La ve cualquier miembro (admin o colaborador), como "Ver álbum"; es de solo lectura salvo el botón de registrar edición (solo admin).

- **En pantalla:** cada hoja A3 (portada y las 12 de mes) se muestra en miniatura a escala fija 0,4 (una hoja verdadera de 297 × 420 mm dentro de un contenedor del mismo tamaño escalado, con `transform: scale`), apiladas en una lista vertical dentro del panel — es solo para revisar el contenido, no hace falta que se vea a tamaño real en pantalla.
- **Para imprimir/exportar:** un botón "Guardar como PDF" llama a `window.print()`. En `@media print`, cada hoja vuelve a su tamaño real (297 × 420 mm, sin escala) y con `page-break-after: always` (una hoja = una página); el encabezado y la navegación del panel (`<header>` del layout de `[familia]`) se ocultan, y el `<main>` que envuelve el contenido pierde su `max-width`/relleno para que las hojas no queden descuadradas. No hay generación de PDF en servidor todavía (queda para después, según el plan).
- **Registrar edición:** botón aparte, solo para admin, que inserta una fila en `ediciones` (`numero` = uno más que las que ya existen para esa familia, `notas` opcional) — deja constancia de que se imprimió un lote, sin intentar detectar automáticamente si la persona canceló el diálogo de impresión.
- **Fotos:** siempre `foto_original` (nunca `foto_web`), con el cliente de sesión del admin (RLS), igual que el resto del panel — nunca la service role key.
- **QR de cada mes:** se genera en el servidor como SVG (paquete `qrcode`), apunta a `/f/[familia]/[mes]`. La base de la URL es `NEXT_PUBLIC_SITIO_URL` (sin barra final) cuando está definida — **siempre tiene prioridad**, porque un QR ya impreso apuntando a una IP de red o a `localhost` queda inservible para siempre y no hay forma de corregirlo después. Si esa variable no está definida, se arma con el origen (protocolo + host) de la propia petición, para poder probar la vista en `localhost` o en la IP de red sin configurar nada. La página muestra una advertencia visible (no solo en consola) en dos casos: la variable no está definida y el host de la visita no es `localhost`/`127.0.0.1` (probablemente alguien probando desde la IP de red o ya en producción sin configurarla); o la variable sí está definida pero su valor igual resuelve a `localhost`/`127.0.0.1` (quedó de una prueba anterior). Sin la variable definida, entrar por `localhost` no avisa — es lo esperado al probar en el propio computador.
- **Guía de impresión en pantalla:** debajo de los botones, un bloque de texto (no se imprime, `@media print { display: none }` como los botones) con los ajustes exactos de Chrome — Guardar como PDF, márgenes "Ninguno", gráficos de fondo activado — y las especificaciones para la imprenta: A3, 297 × 420 mm, papel opalina o algodón mate de 250 a 300 g, anillado metálico superior con la perforación dentro de la franja blanca de 17 mm.
- **Meses con más de 9 personas (Fase 10a):** se reparten en dos hojas seguidas de 9 casillas cada una, manteniendo el orden de las reglas del calendario — la primera hoja se llena (9), la segunda se queda con el resto (nunca a la mitad); ambas repiten la cabecera y el pie del mes, y la etiqueta pequeña de la cabecera ("01 — [nombre de la familia]") suma " · 1/2" / " · 2/2".
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
- Permisos: desde la Fase 9b, cualquier miembro (admin o colaborador) edita el recuerdo de cualquiera, no solo el suyo (migración 006). Borrar se queda solo para el admin hasta la Fase 9d (papelera).

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
9. **Acciones de la familia dentro del álbum** (9a–9d, ver esa sección): edad e identidad del visitante, agregar recuerdos, agregar personas, papelera.
10. **Rediseño visual y centro de ayuda** (10a–10d, ver esa sección): rejilla fija de 9 casillas, animaciones, cumpleaños de hoy, centro de ayuda y solicitudes.

## Forma de trabajar

- Interfaz en español. Nombres del dominio en español, igual que la base de datos (`Persona`, `Recuerdo`, `signo`).
- Explica cada comando que ejecutes y cada decisión técnica sin jerga, o definiéndola cuando sea necesaria.
- Antes de instalar una dependencia nueva, di para qué sirve.
- Haz commits pequeños con mensajes en español.
- Para mostrar el avance sin publicar nada todavía: `cloudflared tunnel --url http://localhost:3000` (con `npm run dev` corriendo) expone el servidor de desarrollo en una URL temporal `https://algo.trycloudflare.com`. `next.config.ts` ya permite ese dominio en `allowedDevOrigins`.

## Antes de imprimir de verdad (lista de lanzamiento, Fase 8)

- [x] ~~Comprar el dominio definitivo~~ — decidido 2026-09-23: **por ahora no hay dominio propio.** Con solo dos familias, se publica en Vercel con su dominio gratuito `algo.vercel.app`. Riesgo anotado: los QR impresos van a apuntar a ese `.vercel.app`; si más adelante se compra un dominio propio, hay que dejar el `.vercel.app` respondiendo con una redirección permanente (301) al dominio nuevo — Vercel permite apuntar varios dominios al mismo proyecto — porque un QR ya impreso no se puede corregir. **Revisar esta decisión antes de imprimir calendarios para otras familias distintas a las dos iniciales:** a esa escala ya conviene tener dominio propio, para no depender de que Vercel siga ofreciendo el subdominio gratuito tal cual.
- [ ] Repositorio en GitHub (privado) y proyecto en Vercel conectado a él.
- [ ] Proyecto de Supabase **nuevo** para producción (no el de pruebas): correr solo `supabase/schema.sql` — ya incluye lo de las tres migraciones, no hace falta correrlas aparte — y no correr `seed.sql` (esa familia `demo` es solo para desarrollo).
- [ ] Cargar en Vercel las 5 variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (las tres del proyecto de Supabase de producción, no el de pruebas), `ACCESO_SECRETO` (uno nuevo, distinto al de `.env.local`), `NEXT_PUBLIC_SITIO_URL` (el dominio de producción **de Vercel** — `https://algo.vercel.app`, sin barra final; se sabe el nombre exacto solo después del primer despliegue, así que se agrega esta variable después, no en el primer intento).
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
