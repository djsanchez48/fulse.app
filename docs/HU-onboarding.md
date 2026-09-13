# RecepIA — Plan: Onboarding y perfil vivo

## Objetivo
Primera receta en <90s, perfil construido dentro de la experiencia (no en un formulario).

## 3 capas
1. **Micro-onboarding** (`/bienvenida`): alergias/restricciones + objetivo. Saltable. Nunca reaparece.
2. **Perfil vivo**: IA detecta preferencias en ajustes ("odio el cilantro") → chip "¿Guardo?"
3. **Nudges**: invitaciones puntuales a completar perfil, máx 1/sesión, máx 2 veces total.

## DB
- `onboardingCompletedAt DateTime?` 
- `rejectedHints String[] @default([])`
- `nudgeState Json @default("{}")`

## Estado: Implementado ✅

Validado contra código (2026-09-13): existe `/bienvenida` (167 líneas), `src/lib/nutrition/nudges.ts`
implementa el motor de nudges, y `onboardingCompletedAt` / `rejectedHints` / `nudgeState` están en
`prisma/schema.prisma`. Las 3 capas del plan están cubiertas — commits `5c974b0` (bienvenida +
AuthGuard + indicador de perfil), `bf67a65` (capas 2-3: hints + nudges), `db4ad90` y `0f60d4a`
(fixes posteriores).
