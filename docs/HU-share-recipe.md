# RecepIA — HU: Compartir receta (WhatsApp)

**Historia de usuario:** Como usuario de Fulse, quiero compartir una receta desde el celular
—principalmente por WhatsApp— para poder mandársela a alguien sin tener que copiarla a mano ni
tomarle captura.

## Contexto

Hoy no existe ninguna forma de sacar una receta de la app: la pantalla de detalle solo tiene
Guardar, Editar y Eliminar. Para pasarle una receta a alguien toca capturar pantalla o copiar el
texto a mano.

## Decisión de diseño: se comparte el TEXTO, no un link

Esta es la decisión central y conviene dejarla registrada porque no es obvia.

Fulse está detrás de un muro de contraseña: el `middleware.ts` solo deja pasar sin sesión
`/acceso`, `/api/auth/login`, `/manifest.json`, `/sw.js` y `/favicon.ico`. Cualquier link a
`/recipes/[id]` que mandemos por WhatsApp le va a mostrar al que lo reciba **la pantalla de login**,
no la receta. Un link así no sirve para compartir.

Por eso la Fase 1 comparte la receta como **texto plano**, que además es lo que la gente ya hace
con recetas en WhatsApp (de hecho la propia app tiene un importador que dice "pega aquí la receta…
de WhatsApp"). Es útil desde el primer día y no abre ninguna superficie de seguridad nueva.

Compartir por link queda como Fase 2 opcional, y **requiere exponer contenido públicamente** — ver
abajo.

## Alcance — Fase 1 (compartir texto)

### Mecanismo
- **En móvil:** `navigator.share({ title, text })` — la Web Share API abre la hoja nativa de
  compartir de iOS/Android, donde WhatsApp aparece como destino junto a Mensajes, Notas, etc.
  Esto es lo que hace el botón "compatible con WhatsApp" sin integrar nada específico de WhatsApp.
  Requiere HTTPS (ya lo tenemos en `www.fulse.app`) y un gesto del usuario (el click del botón).
- **Fallback cuando no hay `navigator.share`** (la mayoría de navegadores de escritorio):
  abrir `https://wa.me/?text=<texto codificado>`, que abre WhatsApp Web/Desktop con el mensaje
  listo. Si el texto excede el límite práctico de URL (~2.000 caracteres), caer a copiar al
  portapapeles y avisar con un toast.

### Qué se comparte
Se comparte **lo que el usuario está viendo**, no lo que está en la base: si escaló la receta a 4
porciones, el texto va con las cantidades escaladas a 4.

Formato propuesto:

```
*Bowl proteico de pollo*
Rápido, alto en proteína y listo en 20 minutos.

🍽 4 porciones · ⏱ 25 min

*Ingredientes*
• 400 g de pollo
• 2 de aguacate (en cubos)
• sal — al gusto

*Preparación*
1. Cocinar el pollo a fuego medio.
2. Cortar el aguacate.
3. Servir.

— Compartido desde Fulse
```

Los asteriscos son el formato de negrita de WhatsApp. Tradeoff aceptado: en destinos que no son
WhatsApp (Notas, Mail) los asteriscos se ven literales. Se prioriza WhatsApp porque es el caso de
uso que motiva la HU.

## Cambios al modelo de datos

Ninguno.

## API

Ninguna ruta nueva. Todo ocurre en el cliente.

## Lógica y tests

- `buildShareText(recipe, servings)` en `src/lib/recipes/share.ts`: función pura, recibe la receta
  y las porciones mostradas, devuelve el string. Con tests (Regla #7): escalado de cantidades,
  ingredientes sin cantidad (`sal — al gusto`), notas, receta sin descripción, sin tiempos.
- El escalado de cantidades hoy vive dentro del componente de la pantalla de detalle
  (`formatQuantity`). Hay que moverlo a la lib para que el texto compartido y la pantalla no se
  desincronicen.

## UI

La fila de acciones al final de `/recipes/[id]` pasa a ser **cuatro botones solo de ícono**, sin
texto, repartidos en la fila. Resuelve el apretujamiento de meter un cuarto botón en móvil:

| Acción | Ícono (lucide) |
| --- | --- |
| Guardar en colección | `Bookmark` |
| Editar | `Pencil` |
| Compartir | `Share` (el de iOS: caja con flecha) |
| Eliminar | `Trash2` |

Al quitar las etiquetas se pierde el texto como pista de qué hace cada botón, así que cada uno
lleva `aria-label` y `title` traducidos — es obligatorio para accesibilidad y para el tooltip en
escritorio, no es opcional.
- Feedback: si se usó el fallback de portapapeles, mostrar confirmación ("Receta copiada").
- Si `navigator.share` falla porque el usuario cancela la hoja nativa (lanza `AbortError`), no
  mostrar error — es una cancelación, no un fallo.

## Fase 2: compartir por link

Desarrollada en su propio documento: **[HU-public-recipe-link.md](./HU-public-recipe-link.md)**.

## Fuera de alcance
- Compartir imagen/tarjeta de la receta.
- Compartir a un contacto específico de WhatsApp (`wa.me/<número>`): la hoja nativa ya deja elegir.
- Analítica de cuántas veces se comparte.
- Compartir colecciones completas.

## Estado: Implementado ✅ (Fase 1)

Implementado 2026-11-22. Verificado en el navegador: hoja nativa en móvil (interceptada para
comprobar el payload: lleva `title` y `text`, **sin** `url`), fallback `wa.me` en escritorio
(URL de ~2.100 caracteres), y los cuatro íconos sin desbordarse a 375px.

**Bug grande encontrado al implementar esto, y corregido:** el escalado por porciones **no
funcionaba en absoluto**. El generador guarda las dos columnas a la vez (`quantity: 400` *y*
`quantityText: "400 g"`), y tanto la pantalla como el helper miraban `quantityText` primero, así
que la multiplicación por el factor nunca corría: el selector de porciones cambiaba el número y
nada más. Se invirtió la precedencia (`quantity` manda; `quantityText` solo cuando no hay número),
que es el contrato que ya describía `HU-plan-mvp.md`. Ahora 2→3 porciones sí lleva 400 g a 600 g,
en pantalla y en el texto compartido. El escalado quedó en `src/lib/recipes/share.ts` y la pantalla
lo consume de ahí, para que no vuelvan a divergir.

Otro ajuste sobre lo planeado: el límite para el fallback `wa.me` quedó en **8000** caracteres, no
2000. Con 2000 una receta normal (~2.100 ya codificada) se iba al portapapeles en vez de a
WhatsApp, que era justo lo que se quería evitar.

La Fase 2 (link público) sigue sin implementar.
