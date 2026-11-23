# Fulse — HU: Mis restaurantes (y mover "Mi nevera" a la pantalla de crear)

**Historia de usuario:** Como dueño de Fulse, quiero llevar mi lista de restaurantes y lugares
—dónde fui, qué tal estuvo, qué pedir— dentro de la misma app donde ya guardo mis recetas, para
no tenerla dispersa en notas sueltas. Y quiero que "Mi nevera" deje de ocupar una pestaña, porque
no es un lugar al que se entra sino una acción que se dispara.

## Contexto

Hoy la navegación inferior tiene cuatro pestañas: Crear, Mis recetas, Mi nevera, Ajustes.

**"Mi nevera" (`/pantry`) no guarda nada.** Es un flujo de un solo uso: tomas una foto, la IA
detecta los ingredientes (`/api/ai/vision`) y genera una receta. No hay modelo en Prisma, no hay
estado que persista entre visitas. Es una **acción**, no una sección — y por eso una pestaña de
navegación le queda grande: las pestañas deberían llevar a lugares con contenido propio.

Los restaurantes, en cambio, sí son una lista que vive y crece. El cambio es un intercambio
sensato, no solo una preferencia.

**Sobre que "no cuadra con Fulse":** cuadra más de lo que parece. Fulse ya es tu memoria de qué
te gusta comer —ingredientes, recetas, objetivos—. Los restaurantes son la otra mitad de eso: lo
que te gusta comer cuando no cocinas. Ver abajo la Fase 2, que une las dos cosas.

---

## Parte 1 — Mover "Mi nevera"

- Sale de la navegación inferior. Las pestañas quedan: **Crear · Mis recetas · Restaurantes · Ajustes**.
- En la pantalla de crear (`/`), debajo del botón **Generar receta**, aparece un botón
  **secundario** (`variant="outline"`) con ícono de nevera (`Refrigerator` de lucide) y texto
  "Mi nevera" o "¿Qué hay en mi nevera?".
- La ruta `/pantry` **se mantiene** tal cual: solo cambia cómo se llega. Menos riesgo y nada que
  reescribir.
- Hay que quitar la pestaña de `src/components/layout/navbar.tsx` y la clave `nav.pantry` deja de
  usarse ahí (la pantalla sigue usando las suyas).

---

## Parte 2 — Nueva sección: Restaurantes

Ruta nueva `/restaurantes`, con su pestaña en la navegación (ícono sugerido: `UtensilsCrossed`
o `MapPin`).

### Vistas

1. **Lista, agrupada por ciudad y luego por zona** (decidido: la lista abarca varias ciudades).

   ```
   MEDELLÍN
     El Poblado
       ★ 9.0  Carmen            italiana · $$$ · visitado
       ★ 7.5  X                 sushi · $$ · visitado
     Laureles
       —      Y                 parrilla · quiero ir
   BOGOTÁ
     Zona G
       ★ 8.5  Z                 peruana · $$$ · visitado
   ```

   Las ciudades se ordenan por cantidad de lugares (la "tuya" queda arriba) y dentro de cada zona
   van primero los visitados mejor calificados, y al final los pendientes. Filtros por estado,
   ciudad y tipo de cocina; buscador por nombre.

2. **Detalle / edición** — todos los campos, editable en la misma pantalla (mismo patrón que
   ya usamos para editar recetas).

3. **Alta rápida** — formulario corto: nombre, ciudad, zona y estado. El resto se llena después.
   Si agregar un lugar cuesta trabajo, la lista se muere.

### Modelo de datos propuesto

```prisma
model Restaurant {
  id           String   @id @default(cuid())
  name         String
  city         String?
  zone         String?        // zona dentro de la ciudad (El Poblado, Zona G...)
  cuisine      String?        // italiana, sushi, parrilla...
  status       String   @default("pendiente")  // "visitado" | "pendiente"
  rating       Float?         // 1-10, solo tiene sentido si status = visitado
  favoriteDish String?
  priceRange   String?        // "$" | "$$" | "$$$"
  address      String?
  mapsUrl      String?
  notes        String?
  lastVisitAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([status])
  @@index([city, zone])
}
```

**Sobre `rating`:** escala **1-10** (decidido). Lo dejo como `Float` y no `Int` para que puedas
poner 8.5 si quieres afinar; si prefieres enteros duros, se cambia a `Int` y listo. El formulario
acepta un número y valida el rango 1-10.

### Qué te faltaba (respuesta a tu pregunta)

Tenías ciudad, puntuación, plato favorito y dirección. Lo que agregaría, en orden de importancia:

| Campo | Por qué |
| --- | --- |
| **`status` (visitado / quiero ir)** | El más importante. "Mis restaurantes" y "mi lista de lugares" son dos cosas: los que ya probaste (con nota y plato) y los que quieres probar. Sin este campo, un pendiente se ve igual que uno que olvidaste calificar. |
| **`cuisine` (tipo de cocina)** | Es el filtro que de verdad vas a usar: "¿dónde comemos japonés?" |
| **`mapsUrl`** | Más útil que la dirección escrita: desde el celular es un toque y te lleva. La dirección en texto no es accionable. |
| **`priceRange`** | Decides con esto tanto como con la puntuación. |
| **`notes`** | "Pedir la mesa del fondo", "no abren domingo", "hay que reservar". Es donde cae todo lo que no cabe en un campo. |
| **`lastVisitAt`** | Para "¿hace cuánto no vamos?" |
| **`area` (barrio)** | Si la mayoría son de la misma ciudad, el barrio discrimina más que la ciudad. |

**Deliberadamente fuera:** teléfono (está en Maps), foto (sube el costo de agregar un lugar),
horarios (se desactualizan y están en Maps), "con quién / ocasión" (suena útil y casi nunca se
llena).

**Criterio de diseño:** solo `name` y `status` obligatorios. Todo lo demás opcional. Una lista
personal que exige muchos datos termina vacía.

### Decisiones tomadas

| Decisión | Valor |
| --- | --- |
| Escala de puntuación | **1 a 10** (`Float`, admite 8.5) |
| Agrupación de la lista | **Ciudad → zona** (varias ciudades) |
| "Quiero ir" | **Sí, desde el principio** (campo `status`) |
| Formato de la lista actual | **Texto suelto** → importación asistida por IA |

### Importar tu lista actual (texto suelto)

Como está en texto libre, no sirve un CSV: hay que interpretarla. El camino reutiliza lo que la
app ya hace con las recetas pegadas (`recipe-parser.ts` + `/api/ai/parse-recipe`):

1. Pantalla de importación con un textarea: pegas la lista completa, tal como la tengas.
2. `POST /api/ai/parse-restaurants` manda el texto a DeepSeek con un esquema Zod estricto
   (`restaurantListSchema`) y devuelve un arreglo de restaurantes estructurados.
3. **Pantalla de revisión antes de guardar**: la IA se va a equivocar en algunos —confundir zona
   con ciudad, inventar un tipo de cocina—, así que se muestran todos en una tabla editable y tú
   confirmas. Nada entra a la base sin que lo veas.
4. Al confirmar, se crean en lote.

Esto es trabajo de una sola vez, pero la pantalla queda disponible por si luego pegas más lugares
de un viaje.

**Pendiente tuyo:** pasarme la lista cuando quieras arrancar. Con una muestra de 5-10 líneas me
basta para afinar el prompt antes de procesarla entera.

### Seguridad: RLS en la tabla nueva

**Importante y fácil de olvidar.** Las 9 tablas actuales tienen RLS activo sin políticas —"denegar
todo"— que es lo que impide leer tu base con la clave pública que viaja al navegador. Una tabla
creada por una migración de Prisma **nace con RLS apagado**, así que `Restaurant` quedaría legible
desde internet con esa clave si no se activa a mano.

Al crear la tabla hay que correr:
```sql
ALTER TABLE "Restaurant" ENABLE ROW LEVEL SECURITY;
```
y verificarlo igual que en el barrido de seguridad (consultando `pg_class.relrowsecurity`) antes
de desplegar.

Nota: la tabla no se crea en la interfaz de Supabase. Se define en `prisma/schema.prisma` y se
aplica con una migración; Supabase solo es el Postgres donde vive.

---

## Fase 2 — "Hacer una versión en casa" (confirmada)

Es lo que hace que esto pertenezca a Fulse en vez de ser un módulo pegado con cinta: conecta lo
que te gusta comer afuera con lo que cocinas.

### Flujo
En el detalle de un restaurante que tenga `favoriteDish`, un botón **"Hacer una versión en casa"**
manda ese plato al generador que ya existe, con contexto: nombre del plato, tipo de cocina y el
nombre del restaurante. El resultado entra al flujo de borrador que ya conoces —lo revisas, lo
editas y decides si lo guardas—, no se guarda solo.

Reutiliza `recipe-generator.ts` completo. El trabajo real es armar el prompt y pasarle el contexto;
no hay motor nuevo.

### Trazabilidad (la mitad que vale la pena)
Que la receta recuerde de dónde salió:

```prisma
model Recipe {
  // ...existentes...
  fromRestaurantId String?
  fromRestaurant   Restaurant? @relation(fields: [fromRestaurantId], references: [id], onDelete: SetNull)
}

model Restaurant {
  // ...existentes...
  recipes Recipe[]
}
```

Con eso la receta puede mostrar "inspirada en Carmen, Medellín", y el restaurante puede listar las
recetas que salieron de él. `onDelete: SetNull` para que borrar un restaurante no se lleve recetas
por delante.

### Interacción con el perfil
El generador ya respeta tus alergias, restricciones y objetivo nutricional. Eso sigue aplicando
aquí: una versión en casa de un plato pesado debería poder salir ajustada a tu objetivo activo,
no como copia literal.

Se implementa **después** de la Fase 1, cuando la lista tenga datos reales — un botón así no se
puede evaluar con una lista vacía.

## Fuera de alcance
- Compartir la lista o colaborar con otras personas (Fulse es de un solo usuario).
- Mapa con los lugares ubicados.
- Importar desde Google Maps guardados (no hay API pública para listas guardadas).
- Reservas.

## Estado: Pendiente
