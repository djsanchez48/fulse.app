# Fulse — HU: Editar una receta guardada con IA

**Historia de usuario:** Como dueño de Fulse, quiero poder pedirle a la IA que ajuste una receta
ya guardada —"hazla para mi airfryer", "dobla las porciones", "quítale el lácteo"— en vez de
reescribir los pasos a mano, para cambios difusos que no calzan en un formulario.

Desarrolla la Fase 2 esbozada en [HU-edit-recipe.md](./HU-edit-recipe.md), cuya Fase 1 (edición
manual) ya está implementada.

## Contexto

Editar a mano funciona bien para un cambio puntual: corregir una temperatura, ajustar una
cantidad. Se queda corto cuando el cambio es transversal —"hazla sin gluten" toca ingredientes,
pasos y quizá tiempos a la vez— y reescribir todo eso a mano es justo lo que la app debería
evitar.

## Corrección al plan original

El esbozo de la Fase 2 proponía pedirle a la IA un **patch parcial** (solo los campos que cambian).
**Lo descarto**, por dos razones:

1. Es ambiguo en los arreglos. Si devuelve tres pasos, ¿son los tres únicos pasos de la receta, o
   los tres que cambiaron? Lo mismo con ingredientes. Esa ambigüedad la resuelve el modelo
   adivinando, y adivina distinto cada vez.
2. Obliga a un esquema nuevo con todo opcional, en vez de reutilizar `generatedRecipeSchema`, que
   ya está probado en el generador.

**Decisión:** se le pide la **receta completa ya modificada**, con el mismo esquema que usa el
generador. La seguridad no viene de limitar lo que el modelo devuelve, sino del diff que se le
muestra al usuario antes de guardar.

## Alcance

### Flujo
1. En modo edición (donde ya se entra para modificar a mano) aparece arriba un campo:
   *"Pídele un ajuste a la IA"* + botón **Ajustar**.
2. `POST /api/recipes/[id]/adjust { instruction }` manda a DeepSeek la receta actual, la
   instrucción y el contexto del perfil.
3. La respuesta **no se guarda**: se muestra un **diff** campo por campo — qué pasos cambiaron,
   qué ingredientes entran o salen, qué cantidades se movieron.
4. **Aplicar** o **Descartar**. Aplicar reutiliza el `PATCH /api/recipes/[id]` que ya existe y ya
   está probado; el endpoint de IA solo propone, nunca escribe.

### El diff no es opcional
Es el corazón de esta función, por tres razones:
- Un modelo puede alucinar y reescribir partes que nadie pidió cambiar.
- Las recetas ya se pueden **compartir por link público**: una edición mala se propaga a lo que
  tus amigos están viendo.
- Las recetas guardadas suelen estar afinadas a mano. Pisarlas a ciegas destruye ese trabajo.

### Contexto del perfil
Se reutiliza el prompt de sistema del generador, que ya inyecta alergias, restricciones,
ingredientes que no te gustan y **equipamiento**. Esto importa para el caso que originó todo:
"ajústala a mi airfryer" funciona mejor si el perfil ya sabe qué airfryer tienes. Si hay objetivo
nutricional activo, también aplica.

### Qué puede cambiar y qué no
Modificable: título, descripción, pasos, ingredientes, tiempos, porciones, tags.

Intocable, porque no viaja en el payload: `cookedCount`, `lastCookedAt`, las colecciones y el
`shareToken`. Un ajuste de IA no puede despublicar una receta ni borrar su historial de uso.

Si cambian ingredientes o porciones, se invalida el análisis nutricional — misma regla que ya
aplica la edición manual, y ya está implementada en el PATCH.

## Lógica y tests

- `buildAdjustPrompt(recipe, instruction, profile)` — función pura, testeable sin llamar a la IA.
- `diffRecipes(actual, propuesta)` — pura y con tests: detecta campos escalares cambiados, pasos
  agregados/eliminados/modificados e ingredientes que entran, salen o cambian de cantidad. Es la
  pieza que decide qué ve el usuario antes de aceptar, así que merece cobertura real.
- La respuesta del modelo se valida con `generatedRecipeSchema` antes de siquiera mostrarse. Si no
  valida, se descarta con un error claro en vez de intentar arreglarla.

## Costo

Cada ajuste es **una llamada a DeepSeek**. Es la primera función que gasta crédito sobre recetas
que ya existen (hasta ahora solo se gastaba al generar o importar). Con uso personal es
despreciable, pero conviene saberlo: pedir cinco ajustes seguidos a una receta son cinco llamadas.

El endpoint queda detrás de sesión, como el resto de `/api/` — la página pública compartida no
puede dispararlo.

## Decisión abierta

**Si la receta tiene un link público activo**, un ajuste cambia lo que están viendo quienes tengan
el link. ¿Avisar en el diff ("esta receta está compartida") antes de aplicar, o dejarlo pasar en
silencio? Mi recomendación es avisar: es barato y evita una sorpresa.

## Fuera de alcance
- Historial de versiones o deshacer un ajuste ya aplicado.
- Ajustar varias recetas a la vez.
- Ajustes automáticos sin confirmación.

## Estado: Implementado ✅

Implementado 2026-11-22. Verificado contra DeepSeek y la base con un test desechable sobre una
receta real ("Tzatziki cremoso y ligero", instrucción: *"hazla apta para freidora de aire de 3.5L,
a menor temperatura"*): la IA devolvió una receta completa válida según `generatedRecipeSchema`, el
diff mostró 4 campos, 2 ingredientes y 8 pasos cambiados, y **la receta en base quedó intacta** —el
endpoint solo propone—.

Decisión abierta resuelta: **sí se avisa** cuando la receta tiene link público activo. El endpoint
devuelve `compartida` y el diff muestra el aviso arriba de los cambios.

Nota: al aplicar se reutiliza el `PATCH /api/recipes/[id]` que ya existía y ya estaba probado, en
vez de escribir desde el endpoint de ajuste. Así el guardado tiene un solo camino.
