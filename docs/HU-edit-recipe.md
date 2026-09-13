# RecepIA — HU: Editar receta guardada

**Historia de usuario:** Como usuario de RecepIA, quiero poder editar una receta que ya guardé
(pasos, cantidades, tiempos), para poder ajustarla a mis implementos reales de cocina (mi airfryer
no llega a la temperatura que asume la receta) o para dejar guardada una variación que me gustó,
sin tener que borrar y volver a generar la receta desde cero.

## Contexto / motivación

Hoy una receta guardada es de solo lectura: en `/recetas/[id]` solo hay dos acciones al final,
**Guardar** (agregar a colección) y **Eliminar**. Si algo no calza con la realidad de mi cocina
(temperatura, tiempo, una sustitución que funcionó mejor), la única opción es borrar y regenerar
con IA — se pierde el historial de "cocinado X veces" (`cookedCount`/`lastCookedAt`) y consume
tokens de DeepSeek para algo que no necesita IA.

## Decisión: edición directa como mecanismo principal (no prompt de IA)

Editar campos directamente es más rápido, gratis (sin llamada a IA) y más predecible que
describirle el cambio a un modelo. El ajuste por IA (Fase 2, ver abajo) queda como opción para
cuando el cambio es difuso ("hazla más rápida de preparar") y no vale la pena forzarlo a un form.

## Alcance — Fase 1 (edición directa)

### Qué se puede editar
- Título, descripción
- Pasos: editar texto de un paso, reordenar, agregar paso, eliminar paso
- Ingredientes: cantidad, unidad, nota (ej. "picado fino") por ingrediente; agregar/quitar
  ingrediente de la receta
- Tiempos de preparación/cocción, porciones base, tags

### Qué pasa con lo ya calculado
- Si cambian **ingredientes, cantidades o porciones**: se limpia `nutriAnalyzedAt` (→ `null`) para
  que el análisis nutricional (calorías/macros/badges) se recalcule perezosamente la próxima vez
  que se vea la receta — mismo patrón que ya usa "Objetivos y guía nutricional"
  (`POST /api/recipes/[id]/analyze`). Editar solo el texto de un paso o el título **no** invalida
  el análisis.
- `cookedCount` y `lastCookedAt` **no se tocan** — son historial de uso, no de contenido.
- No hay versionado ni historial de ediciones: la edición reemplaza el estado actual. Si el usuario
  quiere conservar la versión anterior, la duplica manualmente (fuera de alcance, ver abajo).

## Cambios al modelo de datos

Ninguno en `Recipe` (ya tiene todos los campos necesarios). Se necesita lógica nueva —no schema
nuevo— para poder actualizar `RecipeIngredient` desde el PATCH (hoy el endpoint solo actualiza
campos escalares de `Recipe`, no toca la tabla de ingredientes).

## API

### Extender `PATCH /api/recipes/[id]` (ya existe, en `src/app/api/recipes/[id]/route.ts`)
Agregar soporte para un campo `ingredients` en el body, con upsert por ingrediente:

```
PATCH /api/recipes/:id
{
  title?, description?, steps?, prepTimeMinutes?, cookTimeMinutes?, servings?, tags?, // ya existen
  ingredients?: [
    { ingredientName: string, quantity?: number, unit?: string, quantityText?: string, note?: string }
  ]
}
```
- Reutilizar la lógica de normalización de nombre de ingrediente que ya usa el parser
  (`recipe-parser.ts` / `parse-recipe`) para no duplicar `Ingredient` por mayúsculas/singular-plural.
- Si `ingredients` viene en el body: reemplazar el set completo de `RecipeIngredient` de la receta
  (borrar + crear, como ya hace el PATCH actual con `collectionIds`) y poner `nutriAnalyzedAt: null`.
- Si `servings` cambia y no viene `ingredients`: igual limpiar `nutriAnalyzedAt`.

No se necesitan rutas nuevas para la Fase 1.

## UI

- En `src/app/recipes/[id]/page.tsx`, agregar botón **"Editar"** (ícono lápiz) junto a
  Guardar/Eliminar al final de la pantalla.
- Modo edición **en la misma pantalla** (toggle, sin ruta nueva): los campos de solo-lectura pasan
  a inputs editables in place — título, descripción, cada paso (textarea), cada ingrediente
  (cantidad/unidad/nota), tiempos, porciones. Mismo patrón de autosave-con-feedback que ya existe
  en Ajustes (`saved: "idle" | "saving" | "saved"`).
- Botón "Listo"/check para salir del modo edición y disparar el PATCH.
- Si el análisis nutricional queda invalidado por la edición, mostrar el mismo estado "pendiente de
  análisis" que ya existe para recetas recién importadas (no hay que inventar UI nueva).

## Fase 2 (opcional, no bloqueante): ajuste vía prompt de IA

Para cambios difusos que no calzan en un form ("hazla apta para freidora de aire de 3.5L a menor
temperatura"). Se implementaría como:
- `POST /api/recipes/[id]/adjust { instruction: string }` → arma un prompt con la receta actual +
  la instrucción, le pide a DeepSeek un **patch parcial** (mismo `generatedRecipeSchema` que usa
  `recipe-generator.ts`, pero permitiendo campos opcionales) en vez de una receta nueva completa.
- Mostrar un preview del diff antes de guardar (para no pisar la receta a ciegas con una
  alucinación) — el usuario confirma o descarta.
- Cuesta una llamada a DeepSeek por ajuste; por eso queda fuera de la Fase 1.

## Fuera de alcance
- Historial de versiones / deshacer una edición ya guardada.
- Editar la lista de colecciones a las que pertenece desde el modo edición (ya existe `CollectionSheet` aparte).
- Fase 2 (ajuste por IA) se implementa solo si después de usar la Fase 1 sigue haciendo falta.

## Estado: Implementado ✅ (Fase 1)

Implementado 2026-09-13. Dos desviaciones respecto al plan de arriba, ambas deliberadas:

1. **Se reutilizó `InlineRecipeEditor`** (el editor que ya existía para borradores) en vez de
   construir un form con campos por ingrediente. Los ingredientes se editan como texto, una linea
   por ingrediente. Razon: mantener una sola UX de edicion en la app en vez de dos editores
   distintos para el mismo objeto.
2. Al reutilizarlo se encontraron **dos bugs de round-trip** en su parseo de ingredientes, que hoy
   ya corrompian borradores: `2 de tomate` guardaba `"de"` como unidad, y `sal al gusto` terminaba
   como un ingrediente llamado `"de sal — al gusto"`. La logica se extrajo a `src/lib/recipes/edit.ts`,
   se corrigio y quedo cubierta con tests de round-trip. El flujo de crear receta se beneficia igual.

No se implemento el estado "pendiente de analisis" en la pantalla de detalle porque esa pantalla no
muestra informacion nutricional hoy; en su lugar el modo edicion avisa que el analisis se recalculara.

La Fase 2 (ajuste via prompt de IA) sigue sin implementar.
