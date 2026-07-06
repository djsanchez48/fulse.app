<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RecepIA — Reglas para agentes

## Regla #1: i18n obligatorio — NUNCA hardcodear texto visible

**Todo texto que el usuario vea en la UI DEBE pasar por `t()` del sistema i18n.**

- Si agregás una string nueva a cualquier componente/página, creá la key en `src/lib/i18n.ts` (ES + EN).
- Formato de keys: `seccion.accion_descripcion` (ej: `settings.objectives_title`, `goals.bajar_peso`).
- Después de modificar `src/lib/i18n.ts`, **SIEMPRE re-sincronizar `src/lib/i18n-context.tsx`** ejecutando:
  ```bash
  node -e "const fs=require('fs'); const i18n=fs.readFileSync('src/lib/i18n.ts','utf8'); const ctx=fs.readFileSync('src/lib/i18n-context.tsx','utf8'); const m=i18n.match(/export const translations = (\{[\s\S]*?\n\} as const;)/); if(m) fs.writeFileSync('src/lib/i18n-context.tsx', ctx.replace(/const translations = \{[\s\S]*?\n\};/, 'const translations = '+m[1].replace(' as const;','')+';'));"
  ```
- Verificá que el build pase y las keys nuevas aparezcan traducidas.

## Regla #2: Documentar planes nuevos en `docs/`

- Cada funcionalidad nueva va con su plan en `docs/<nombre>.md`.
- Al terminar de implementar, editar el doc para marcar `Estado: Implementado ✅`.

## Regla #3: No usar clases responsivas de Tailwind con `md:` 

- Causan hydration mismatch con Turbopack. Usar `max-w-xl` (sin prefijo) para layouts.
- En móvil la pantalla es más chica que max-w-xl así que se llena naturalmente.

## Regla #4: Service Worker

- Si agregás páginas nuevas, no las agregues al precache de `public/sw.js` — solo `/` y `/manifest.json`.
- Bumper `CACHE_NAME` a una versión nueva cuando hagas cambios que rompan cache.

## Regla #5: Prisma

- El schema usa Prisma v7 con driver adapter (`@prisma/adapter-pg`).
- URLs de Supabase: `DATABASE_URL` (pooler transaccional, puerto 6543) para la app, `DIRECT_URL` (pooler sesión, puerto 5432) para migraciones.
- No uses `url` ni `directUrl` en `schema.prisma` — solo en `prisma.config.ts`.

## Regla #6: API Routes

- Todas las rutas en `src/app/api/`. Seguir el patrón App Router de Next.js.
- Validar inputs, devolver `{ error: string }` con status apropiado.
- No exponer API keys al cliente — todas las llamadas a IA pasan por el servidor.

## Regla #7: Tests

- Ejecutar `npm test` antes de cada commit.
- Agregar tests para módulos nuevos de lógica pura (no UI).
- Usar `vi.hoisted()` para mocks de módulos en Vitest.
