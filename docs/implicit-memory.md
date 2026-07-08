# Fulse — Plan: Memoria de preferencias implícitas

**Estado: Planificado 📋**

## Objetivo

Que Fulse aprenda en silencio de lo que el usuario **hace** —qué recetas guarda, cocina, descarta— y de los ingredientes que aparecen una y otra vez en esas recetas. Todo lo aprendido se vuelca en una **sección "Mi Memoria" editable**, donde el usuario puede verlo, corregirlo o borrarlo. Nada más: sin preguntas, sin chips, sin interrupciones. La memoria trabaja por debajo.

**Prerequisito:** ninguno. Compatible con el perfil explícito y los profileHints existentes. No requiere autenticación.

## Principios de diseño (CRÍTICOS)

1. **Cero fricción.** La memoria aprende en segundo plano. Jamás pregunta "¿querés guardar esto?". Las preferencias se acumulan y ya.
2. **Todo editable.** El usuario entra a "Mi Memoria", ve todo lo que Fulse dedujo, y puede editar, borrar ítems individuales o resetear por completo.
3. **Los ingredientes son la señal principal.** Cada ingrediente de una receta guardada o cocinada suma. Los que aparecen en recetas descartadas restan. Tags y badges aportan contexto adicional.
4. **Alergias jamás se infieren.** Una alergia solo entra al perfil por declaración explícita del usuario.
5. **Se inyecta como contexto suave, no como restricción.** El bloque de memoria en el prompt dice "Según tu historial, solés usar estos ingredientes y preferís este tipo de cocina" — la IA lo usa como guía, no como regla.
6. **Minimización de datos.** Solo se trackean interacciones con recetas dentro de la app. A la IA solo va un resumen de preferencias (ingredientes frecuentes + patrones), nunca datos crudos.

## Señales que se capturan

| Señal | Evento | Peso |
|---|---|---|
| Guardar receta generada/importada | `recipe_saved` | +2 |
| Añadir receta a una colección | `recipe_collected` | +1 |
| Marcar "Cociné esto" (botón nuevo) | `recipe_cooked` | +3 |
| Borrar receta guardada | `recipe_deleted` | −2 |
| Descartar draft sin guardar | `draft_discarded` | −1 |

**Extracción de entidades por evento:**

- **recipe_saved / recipe_collected / recipe_cooked:** por cada ingrediente de la receta → +peso. Por cada tag → +peso. Por cada badge → +peso.
- **recipe_deleted:** por cada ingrediente de la receta → −peso. Tags y badges → −peso.
- **draft_discarded:** de los tags del draft (si los tiene) → −1.

Los ingredientes que aparecen repetidamente en recetas guardadas/cocinadas son la señal más fuerte. No hace falta que el usuario los agregue o quite explícitamente — el mero hecho de que aparezcan en recetas que eligió guardar ya es información.

## Cambios al modelo de datos

### Nuevo modelo `PreferenceEvent` (log de eventos, append-only)

```prisma
model PreferenceEvent {
  id        String   @id @default(cuid())
  type      String   // "recipe_saved"|"recipe_collected"|"recipe_cooked"|"recipe_deleted"|"draft_discarded"
  entity    String   // "ingredient"|"tag"|"badge"
  value     String   // ej: "pollo", "italiana", "alta_proteina"
  weight    Int      // según tabla de señales
  recipeId  String?  // referencia débil
  createdAt DateTime @default(now())

  @@index([entity, value])
  @@index([createdAt])
}
```

### Nuevo campo en `UserProfile`: `memoryProfile`

```prisma
model UserProfile {
  // ...existentes...
  memoryProfile    Json     @default("{}")
  // Contenido del JSON:
  // {
  //   "ingredients": { "pollo": { "score": 14, "count": 7 }, "cebolla": { "score": -4, "count": 2 }, ... },
  //   "tags":        { "italiana": { "score": 8, "count": 4 }, ... },
  //   "badges":      { "alta_proteina": { "score": 10, "count": 5 }, ... },
  //   "updatedAt": "2026-07-07T..."
  // }
}
```

**¿Por qué un blob JSON en vez de una tabla separada?** Porque es un único documento de usuario que se lee y escribe junto con el perfil. Se inyecta completo en el prompt y se edita como una sola unidad desde la UI. Simple, sin joins, sin modelo de agregación complejo. La tabla `PreferenceEvent` queda como historial crudo por si en el futuro se quiere recalcular o migrar.

### Extender `Recipe`

```prisma
model Recipe {
  // ...existentes...
  cookedCount  Int       @default(0)
  lastCookedAt DateTime?
}
```

## Cómo funciona

```
Interacción del usuario
        │
        ▼
  1. CAPTURA — el endpoint guarda PreferenceEvent(s) en DB
     y actualiza memoryProfile en UserProfile (upsert atómico)
        │
        ▼
  2. CONTEXTO SUAVE — al generar receta, buildSystemPrompt() lee
     memoryProfile y agrega un bloque:
     
     "Según tu historial de uso, estos son tus ingredientes más
      frecuentes: pollo (7 recetas), ajo (6), cebolla (5).
      Tus estilos preferidos: italiana, alta_proteina.
      No son restricciones, solo información para orientarte."
        │
        ▼
  3. "MI MEMORIA" — el usuario entra a Ajustes > Mi Memoria y ve:
     - Ingredientes más usados (ordenados por score)
     - Estilos y badges frecuentes
     - Puede editar cualquier valor (sumar/quitar ingredientes a mano)
     - Botones de quitar ítem y "Resetear memoria"
     - Toggle para pausar/reactivar el aprendizaje
```

### Lo que NO hace

- **NO pregunta ni interrumpe.** Cero chips, cero confirmaciones.
- **NO infiere alergias.**
- **NO reemplaza el perfil explícito.** El perfil explícito (allergies, dislikedIngredients, lovedIngredients) sigue siendo la fuente de restricciones duras. La memoria es contexto suave adicional.
- **NO compite con profileHints.** Los profileHints detectan preferencias del lenguaje en el chat ("odio el cilantro"). La memoria implícita detecta patrones de uso. Son complementarios y no se tocan.

## API

- `POST /api/insights/track` → registra evento + actualiza memoryProfile. Lo llaman internamente:
  - `POST /api/recipes` (al guardar) → `recipe_saved`
  - `DELETE /api/recipes/[id]` → `recipe_deleted`
  - `POST /api/recipes/[id]/collections` → `recipe_collected`
  - `POST /api/recipes/[id]/cook` (nuevo) → `recipe_cooked`
  - `DELETE /api/drafts/[id]` → `draft_discarded`
- `GET /api/profile/memory` → devuelve memoryProfile + lista de eventos recientes
- `PUT /api/profile/memory` → el usuario edita memoryProfile a mano (graba lo que mande)
- `DELETE /api/profile/memory` → borra memoryProfile + todos los PreferenceEvents
- `PUT /api/profile` → nuevo campo `memoryEnabled: boolean` (toggle)

## UI

### 1. Botón "Cociné esto" en detalle de receta

Junto al stepper de porciones y los checkboxes de ingredientes, un botón:
```
🍳 Cociné esto  (3 veces)
```
Incrementa `cookedCount`, dispara eventos `recipe_cooked` por cada ingrediente/tag/badge.

### 2. Página "Mi Memoria" (nueva ruta `/memoria` o sección en Ajustes)

```
╔══════════════════════════════════╗
║  🧠  Mi Memoria          [⚙️]  ║
║                                 ║
║  Fulse aprende en silencio de   ║
║  lo que cocinás y guardás.      ║
║  Acá podés verlo y editarlo.    ║
║                                 ║
║  Aprendizaje: [■■■ ON]          ║
║                                 ║
║  ── Ingredientes ────────────── ║
║  🟢 pollo     (7 recetas)  [✕] ║
║  🟢 ajo       (6 recetas)  [✕] ║
║  🟢 cebolla   (5 recetas)  [✕] ║
║  🟡 arroz     (3 recetas)  [✕] ║
║  🔴 camarones (1 receta)   [✕] ║
║  + Agregar ingrediente          ║
║                                 ║
║  ── Estilos y tags ──────────── ║
║  🟢 italiana       (4)    [✕]  ║
║  🟢 alta_proteina  (5)    [✕]  ║
║                                 ║
║  ── De tus recetas recientes ── ║
║  · Pasta al pesto (guardada)    ║
║  · Pollo al horno (cocinada)    ║
║  · Ensalada César (borrada)     ║
║                                 ║
║  [⛔ Borrar toda la memoria]    ║
╚══════════════════════════════════╝
```

🟢 = afinidad positiva (score > 0), 🔴 = afinidad negativa (score < 0), 🟡 = neutra/poca data.

El botón [✕] quita ese ítem del `memoryProfile`. El botón "+ Agregar ingrediente" deja agregar uno a mano.

El toggle de aprendizaje al apagarse detiene la captura de eventos pero conserva los datos existentes.

### 3. Inyección en el prompt (automática, en `recipe-generator.ts`)

```
Según tu historial en Fulse, estos son tus ingredientes más
frecuentes y estilos preferidos (orientativo, no restrictivo):

Ingredientes que más usás: pollo, ajo, cebolla, arroz
Estilos y preferencias: italiana, alta_proteina

Usá esta información para orientar las recetas, pero no la
trates como una restricción obligatoria.
```

Solo se inyectan los top 5 ingredientes con score positivo y top 3 tags/badges positivos. Los negativos no se inyectan en el prompt (son para que el usuario los vea en "Mi Memoria").

## i18n

Keys nuevas en `src/lib/i18n.ts` (ES + EN) con re-sync de `i18n-context.tsx` (Regla #1):

- `memory.title`, `memory.description`, `memory.learning_toggle`, `memory.ingredients_section`, `memory.tags_section`, `memory.recent_activity`, `memory.delete_all`, `memory.delete_all_confirm`, `memory.add_ingredient`, `memory.no_data`, `recipe.cooked_this`, `recipe.cook_button`

## Tests

- `tests/memory.test.ts`: scoring del blob memoryProfile (suma ponderada), decay de eventos > 180 días, límite de top N en inyección al prompt, toggle on/off.
- Mock de Prisma con `vi.hoisted()` (Regla #7).

## Fases de implementación

| Fase | Alcance | Entregable |
|---|---|---|
| 1 | Schema + migración + `POST /api/insights/track` + integración en endpoints existentes | Eventos + memoryProfile actualizándose |
| 2 | Inyección de contexto suave en `buildSystemPrompt()` | La IA recibe la memoria al generar |
| 3 | Botón "Cociné esto" + endpoint `POST /api/recipes/[id]/cook` | Señal `recipe_cooked` viva |
| 4 | Página "Mi Memoria" con edición, toggle y borrado | Control total del usuario sobre su memoria |

## Fuera de alcance

- Chips de confirmación / preguntas al usuario.
- Inferencia de alergias.
- Análisis de sentimiento sobre texto libre (lo cubre profileHints).
- Embeddings o vector search.
- Aprendizaje entre usuarios.
