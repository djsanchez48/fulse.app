# RecepIA — Smart Quick Prompts

## Objetivo
Los chips de sugerencia rápida en "¿Qué quieres cocinar hoy?" se adaptan a:
1. **Hora del día** (zona horaria del dispositivo)
2. **Objetivos del usuario** configurados en Ajustes

## Cómo funciona

### Detección de hora (`src/lib/suggestions.ts`)
- 05:00–09:59 → desayunos
- 10:00–13:59 → almuerzos
- 14:00–17:59 → snacks
- 18:00–21:59 → cenas
- 22:00–04:59 → antojos nocturnos

### Sugerencias por objetivo
Cada chip se mezcla: primero los de la hora del día, luego los del objetivo (si hay). Máximo 6 chips.

| Objetivo | Chips extra |
|---|---|
| bajar_peso | Ensalada ligera, Wrap saludable, Bowl vegetales |
| ganar_musculo | Bowl proteína, Pollo con batata, Batido proteico |
| mas_saludable | Tazón verde, Pescado al horno, Smoothie bowl |
| mas_proteina | Huevos revueltos, Pollo a la plancha, Tofu salteado |
| mas_vegetales | Buddha bowl, Curry de garbanzos, Ensalada arcoíris |

## Estado: Implementado ✅
