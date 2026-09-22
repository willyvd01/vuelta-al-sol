# Vuelta al Sol — calendario familiar de cumpleaños y recuerdos

Lee este archivo completo antes de escribir código. Resume las decisiones ya tomadas con el dueño del proyecto, Wilmar. Si algo que pida en el momento choca con lo que dice aquí, pregúntale antes de cambiar la decisión, y actualiza este archivo cuando se decida algo nuevo.

## Qué es

Un producto con dos caras:

1. **Calendario físico.** 13 páginas A3 verticales con anillado metálico arriba (portada + 12 meses), para colgar en la pared. El mes se cambia volteando la hoja. Cada mes muestra los retratos de quienes cumplen años con su día, nombre y signo zodiacal. Un solo código QR por mes.
2. **Álbum digital.** El QR abre ese mes en el celular con la misma rejilla del papel. Al tocar un retrato se abre la ficha de la persona con sus recuerdos agrupados por año.

La web también **genera** el calendario físico: exporta cada página a PDF para la imprenta.

Primer cliente: la familia de Wilson. Después se venderá a muchas familias, así que **todo es multifamilia desde el día uno**: cada persona, recuerdo y foto pertenece a una familia.

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

Portadas (el cliente elige una):

- **A — Rueda solar:** fondo tinta; en el centro, sol con 24 rayos, órbita punteada con un pequeño planeta, anillo con los 12 meses y anillo exterior con los 12 signos. Título "Nuestra" (itálica) / "Vuelta al Sol".
- **B — Retrato familiar:** fondo marfil, foto familiar en arco, sol pequeño, mismo título.

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

## Pendientes por decidir

- Plan de Supabase al lanzar: el gratuito pausa proyectos inactivos, y el álbum se abre de vez en cuando.
- Cómo se señala a una persona fallecida.
- Si los recuerdos de colaboradores necesitan aprobación del admin.
- Nombre definitivo del producto (se trabaja con "Vuelta al Sol").
- Portada A o B.
- Datos de enero: apellido de Yorla; confirmar si son dos personas llamadas Wilson Tabares (19 y 20).
- Precio y forma de venta.
