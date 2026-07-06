# RecepIA — Plan: Objetivos y guía nutricional

## Objetivo

Que el usuario pueda definir en Ajustes qué quiere lograr con su alimentación (hasta 2 objetivos combinables) y opcionalmente compartir datos personales para afinar la guía. Con eso, cada receta —generada, importada o guardada— muestra un **match con el objetivo**, **badges cualitativos** entendibles, y **calorías/macros plegadas** para quien las quiera ver.

**Prerequisito:** Fase 1 implementada. Compatible con la funcionalidad de Importar receta si ya existe.

## Principios de diseño (CRÍTICOS)

1. **Es una guía, no una prescripción.** La app sugiere y etiqueta; nunca prohíbe, sermonea ni prescribe. El disclaimer es parte del producto.
2. **Adjetivos antes que números.** Lo visible son el match y los badges; los números (kcal, macros) existen pero plegados y siempre marcados como estimaciones.
3. **Modo antojo sin culpa.** El toggle de objetivo se puede apagar; la app entrega el brownie sin juzgar, solo lo etiqueta honestamente ("🍰 Antojo").
4. **Minimización de datos:** los datos corporales (edad, peso, estatura) NUNCA viajan a DeepSeek ni a ningún proveedor de IA. La app calcula localmente los derivados necesarios y solo envía conclusiones anónimas.
5. **Todo dato personal es opcional.** El objetivo funciona sin datos corporales; darlos solo mejora la precisión.
6. **Guardrail de seguridad:** el generador nunca produce recetas de restricción extrema.

## Cambios al modelo de datos

### Extender `UserProfile`
```prisma
model UserProfile {
  id                  String   @id @default("main")
  allergies           String[] @default([])
  restrictions        String[] @default([])
  dislikedIngredients String[] @default([])
  lovedIngredients    String[] @default([])
  equipment           String[] @default([])
  defaultServings     Int      @default(2)
  updatedAt           DateTime @updatedAt

  // NUEVOS (todos opcionales)
  goals            String[] @default([])     // máximo 2 del catálogo
  goalsActive      Boolean  @default(true)
  age              Int?
  weightKg         Float?
  heightCm         Float?
  activityLevel    String?  // "sedentario"|"ligero"|"moderado"|"activo"|"muy_activo"
  biologicalSex    String?  // "m"|"f"
  healthDataConsentAt DateTime?
}
```

### Extender `Recipe`
```prisma
model Recipe {
  // ...existentes...
  caloriesPerServing Int?      // estimación IA
  proteinG           Float?    // por porción
  carbsG             Float?
  fatG               Float?
  nutriBadges        String[]  @default([])
  nutriAnalyzedAt    DateTime? // null = pendiente
}
```

## Catálogo de objetivos
`bajar_peso` ⚖️ · `ganar_musculo` 💪 · `mas_saludable` 🥗 · `mas_proteina` 🍗 · `menos_azucar` 🍬 · `menos_sal` 🧂 · `mas_vegetales` 🥦 · `economico` 💸

## Lógica de cálculo
- `targets.ts`: Mifflin-St Jeor local, nunca en IA
- `match.ts`: función pura `(recipe, goals) => "ideal" | "neutral" | "antojo"`

## API
- `PUT /api/profile`: valida máx 2 goals, consentimiento para datos corporales
- `DELETE /api/profile/health-data`: borra datos personales
- `POST /api/recipes/[id]/analyze`: análisis perezoso

## UI
- Ajustes → sección "Mi objetivo 🎯": selector de objetivos, datos opcionales, consentimiento, borrar datos
- Crear → toggle de objetivo
- Tarjetas → match + badges + detalle nutricional plegado
- Disclaimers obligatorios

## Fuera de alcance
- Tracking de consumo, integración salud, planes semanales, metas numéricas, recálculo automático
