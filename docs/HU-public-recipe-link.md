# Fulse — HU: Compartir una receta por link público

**Historia de usuario:** Como dueño de Fulse, quiero generar un link de una receta guardada y
mandárselo a un amigo, para que la vea bien presentada en el navegador sin tener que entrar a mi
app ni recibir un muro de texto por WhatsApp.

Sustituye y desarrolla la "Fase 2" esbozada en [HU-share-recipe.md](./HU-share-recipe.md).

## Contexto

Hoy compartir una receta manda **texto plano** por la hoja nativa (WhatsApp). Funciona, pero se
ve como un muro de texto y no hay forma de que alguien la abra como página.

Un link sí sirve para eso, pero choca con que Fulse entera está detrás de OAuth con allowlist de
un solo correo: cualquier link a `/recipes/[id]` le muestra a tu amigo la pantalla de login y nada
más.

## Decisión: capability URL, no "privacidad"

El modelo es **"no listado"**, no "privado". Hay que decirlo claro porque define el riesgo que se
acepta:

> Cualquiera que tenga el link ve la receta. Los links se reenvían: tu amigo lo pasa a un grupo y
> ya no controlas quién lo abre. Para una receta eso es aceptable —es justo lo que se quiere— pero
> no es lo mismo que "solo mis amigos".

Lo que sí se garantiza: **nada es público por defecto**, solo lo que marques una por una, y
siempre se puede revocar.

## Principios de diseño (los que evitan que esto sea un agujero)

1. **Ruta aparte, nunca la de la app.** `/r/[token]`, jamás abrir `/recipes/[id]`.
2. **Token imposible de adivinar.** 128 bits de `crypto.randomBytes(16)` en base64url (~22
   caracteres). Nunca el `id` de la receta: los cuid son enumerables por tiempo de creación.
3. **Opt-in explícito, uno por uno.** Ninguna receta nace con link. Compartir y publicar son la
   misma acción (ver UI), así que lo que protege la decisión es que **el botón diga lo que hace**
   y que exista un lugar donde ver y revocar lo publicado.
4. **Solo recetas guardadas.** La función vive únicamente en el detalle de una receta de "Mis
   recetas". Los borradores generados (`GenerationDraft`) no se pueden compartir: no son contenido
   que hayas decidido conservar.
4. **Lista blanca de campos.** La página pública arma su respuesta campo por campo, no devuelve el
   registro de Prisma. Hoy `Recipe` guarda `cookedCount`, `lastCookedAt` y sus colecciones: cuántas
   veces la cocinaste y cómo organizas tu cocina no le incumben a nadie más.
5. **Sin API pública.** La página se renderiza en el servidor leyendo de la base directamente. No
   se expone ningún endpoint JSON: menos superficie que golpear y nada que raspar en bloque.
6. **Revocable.** Borrar el token mata el link al instante.
7. **`noindex`.** Para que no termine en Google si alguien lo publica en un foro.

## Modelo de datos

Basta una columna en `Recipe`; no hace falta tabla nueva (y así hereda el RLS que ya está activo).

```prisma
model Recipe {
  // ...existentes...
  shareToken  String?   @unique   // null = no compartida
  sharedAt    DateTime?           // cuándo se generó el link vigente
}
```

- `@unique` da el índice para buscar por token sin escanear la tabla.
- Regenerar el link = reemplazar el token. El anterior deja de funcionar automáticamente, que es
  el comportamiento que se espera de "revocar y volver a compartir".
- **Opcional, decidir:** un `shareViewCount Int @default(0)` para saber si alguien lo abrió. Es
  simpático, pero obliga a escribir en la base en cada visita; lo dejaría fuera salvo que lo quieras.

## Rutas

### Privadas (exigen sesión, como todo lo demás)
- `POST /api/recipes/[id]/share` → genera token si no hay, o rota el existente. Devuelve la URL.
- `DELETE /api/recipes/[id]/share` → pone `shareToken = null`. Revoca.

### Pública
- `GET /r/[token]` → **Server Component**. Busca `Recipe` por `shareToken`; si no existe, 404
  genérico (sin distinguir "no existe" de "fue revocada", para no filtrar que existió).

Campos que renderiza la página pública, explícitos:

```
title, description, steps, ingredients (nombre, cantidad, unidad, nota),
prepTimeMinutes, cookTimeMinutes, servings, tags
```

Y los nutricionales **solo si ya están calculados**: `caloriesPerServing`, macros, `nutriBadges`.

Fuera: `id`, `cookedCount`, `lastCookedAt`, `collections`, `source`, `createdAt`, `updatedAt`,
`shareToken`, `nutriAnalyzedAt`.

## Cambios en el control de acceso

En `src/lib/auth-paths.ts` hay que abrir **solo** el prefijo de la vista pública:

```ts
if (pathname === "/r" || pathname.startsWith("/r/")) return true;
```

Con tests de regresión en la misma línea de los que ya existen, verificando que abrir `/r/` **no**
abre nada más —ni `/api/`, ni `/recipes`, ni una ruta que apenas empiece parecido (`/rx`,
`/recetas`)—. Es el mismo tipo de error que ya encontramos una vez con el bypass por extensión de
archivo, así que conviene cubrirlo desde el principio.

Los endpoints de IA siguen cerrados: la página pública no debe poder disparar ninguna llamada a
DeepSeek, o un link compartido se vuelve una forma de gastarte el crédito.

## UI

### En el detalle de la receta

**Decidido: el link reemplaza al texto.** Compartir pasa a significar una sola cosa, y el botón de
compartir que ya existe hace todo el trabajo:

- **Primera vez en esa receta:** al tocar compartir aparece una hoja de confirmación —
  *"Se creará un link público. Cualquiera que lo tenga podrá ver esta receta."* — con los botones
  **Crear y compartir** / **Cancelar**. Al confirmar: se genera el token y se abre la hoja nativa
  con la URL (donde está WhatsApp).
- **Siguientes veces:** ya hay link, así que abre la hoja nativa directo, sin preguntar de nuevo.
- Debajo del botón, cuando la receta tiene link activo: la URL con **copiar**, y **revocar** /
  **regenerar**.

La confirmación aparece una sola vez por receta: es el momento en que se toma la decisión. Repetirla
en cada compartida la convertiría en ruido que se acepta sin leer.

Se elimina el armado de texto plano (`buildShareText`) y, con él, `src/lib/recipes/share.ts` queda
reducido al escalado de cantidades —que lo usa la pantalla— o se mueve ese helper a su propio
módulo. Ojo: `formatScaledQuantity` **no se puede borrar**, la pantalla de detalle depende de él.

### Dónde ver lo que está publicado

Con "compartir = publicar", hace falta un lugar que responda *"¿qué tengo público ahora mismo?"*.
En **Mis recetas**, un indicador en las tarjetas que tienen link activo y un filtro
**"Compartidas"**. Sin esto, la revocación es una función que existe pero no se puede usar: no se
revoca lo que no se recuerda haber publicado.

### La página pública `/r/[token]`
- Solo lectura: sin navegación inferior, sin botones de editar/guardar, sin selector de porciones
  editable (o sí, pero puramente visual — no hay nada que persistir).
- Encabezado mínimo de Fulse y un pie discreto. Sirve de carta de presentación de la app.
- Responsive, que es como se va a abrir: desde WhatsApp, en un celular.
- `export const metadata = { robots: { index: false, follow: false } }`.
- **Open Graph**: título y descripción de la receta, para que WhatsApp muestre una vista previa
  decente en vez de una URL pelada. Es lo que hace que el link se vea bien al pegarlo.

## Riesgos y qué se hace con ellos

| Riesgo | Mitigación |
| --- | --- |
| Adivinar tokens por fuerza bruta | 128 bits: inviable. Sin endpoint JSON que facilite el barrido. |
| El link se reenvía a desconocidos | Aceptado explícitamente. Mitiga la revocación. |
| Indexación en buscadores | `noindex` + sin enlaces entrantes desde la app. |
| Filtrar datos personales de más | Lista blanca de campos, no el objeto de Prisma. |
| Que la ruta pública abra otras cosas | Prefijo `/r/` acotado + tests de regresión. |
| Gastar crédito de IA desde la página | La página no llama a ningún endpoint de IA. |
| Golpear la base con muchas visitas | Riesgo bajo (app personal). Si molesta: cachear la página pública con `revalidate`. |

## Qué pasa si mucha gente abre los links

El proyecto está en Vercel **plan hobby** y Supabase gratuito, y la app se conecta por el pooler
transaccional (puerto 6543, `pgbouncer=true`), que es lo correcto para serverless y ya evita el
problema clásico de agotar conexiones.

Qué se rompe primero, en orden:

1. **Los topes del plan hobby de Vercel** (ancho de banda e invocaciones). Al excederlos Vercel
   limita o pausa el proyecto — y eso **tumba tu app completa**, no solo los links compartidos.
   Es el fallo más probable y el más molesto.
2. **El plan gratuito de Supabase.** Cada visita a una página pública es una consulta; con mucho
   tráfico se consume el presupuesto de egreso y cómputo.
3. **Ausencia de rate limiting.** Un endpoint público sin límite se puede martillar.

**La mitigación que vuelve casi todo esto irrelevante: cachear la página pública.** Una receta es
contenido estático —solo cambia cuando tú la editas—, así que con ISR (`export const revalidate`)
mil visitas se convierten en una consulta a la base por ventana de revalidación. El problema deja
de ser de base de datos y pasa a ser de CDN, que es justo para lo que sirve Vercel. Al editar la
receta se revalida esa ruta.

**Debe implementarse junto con la función, no después.** Es poco código y es la diferencia entre
que un link popular sea gratis o te tumbe la app.

Nota de escala distinta: el límite estructural de Fulse no son los links sino que es una app de un
solo usuario por diseño (un `UserProfile` con `id = "main"`, un correo en la allowlist). Los links
públicos son ventanas de solo lectura y no cambian eso.

## Pruebas antes de desplegar

- Unitarias: generación de token (longitud y aleatoriedad), lista blanca de campos (que el objeto
  serializado **no** contenga `cookedCount`, `collections`, etc.), y `isPublicPath` con `/r/...`
  abierto y todo lo demás cerrado.
- Manuales en local: abrir `/r/<token>` **en una ventana de incógnito y sin sesión** —esa es la
  prueba que de verdad importa—, revocar y confirmar que pasa a 404, y verificar que `/recipes/[id]`
  sigue pidiendo login.
- En producción: repetir el incógnito y confirmar que el resto sigue en 401/307.

## Fuera de alcance
- Links con expiración por tiempo.
- Links protegidos por contraseña.
- Compartir colecciones completas.
- Comentarios o reacciones de quien recibe el link.
- Contador de visitas (ver nota en el modelo de datos).

## Estado: Implementado ✅

Implementado 2026-11-22. Verificado en local sin sesión: la página pública responde 200 con un
token válido, 404 con uno inventado o revocado, y `/recipes` y `/api/` siguen en 307/401. El HTML
servido no contiene `cookedCount`, `lastCookedAt`, colecciones, ids ni fechas internas. `noindex` y
Open Graph presentes.

Ajuste no previsto en el plan: la página heredaba el encabezado y la navegación inferior de la app,
así que un extraño veía accesos a "Mis recetas", "Mi nevera" y "Ajustes". `Navbar` y `AuthGuard`
ahora se desactivan en `/r/`.
