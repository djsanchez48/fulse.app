import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toPublicRecipe, type PublicRecipe } from "@/lib/recipes/public-link";

// Cacheada: una receta solo cambia cuando su dueño la edita. Sin esto, cada
// visita de un link compartido seria una consulta a la base — con un link
// popular eso agota el plan. Asi N visitas se sirven desde el CDN.
export const revalidate = 3600;

// Sin API publica: la pagina lee de la base en el servidor. Menos superficie
// que golpear y nada que raspar en bloque.
async function getRecipe(token: string): Promise<PublicRecipe | null> {
  const recipe = await prisma.recipe.findUnique({
    where: { shareToken: token },
    select: {
      title: true, description: true, steps: true, prepTimeMinutes: true,
      cookTimeMinutes: true, servings: true, tags: true,
      caloriesPerServing: true, proteinG: true, carbsG: true, fatG: true,
      nutriBadges: true, nutriAnalyzedAt: true,
      ingredients: {
        select: {
          quantity: true, unit: true, quantityText: true, note: true,
          ingredient: { select: { name: true } },
        },
      },
    },
  });

  return recipe ? toPublicRecipe(recipe) : null;
}

export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> },
): Promise<Metadata> {
  const { token } = await params;
  const recipe = await getRecipe(token);

  // noindex: el link es "no listado". Que no termine en Google si alguien lo publica.
  const robots = { index: false, follow: false };

  if (!recipe) return { title: "Receta no encontrada", robots };

  const description = recipe.description || `Receta compartida desde Fulse`;

  return {
    title: `${recipe.title} · Fulse`,
    description,
    robots,
    // Para que al pegar el link en WhatsApp salga una vista previa decente.
    openGraph: { title: recipe.title, description, type: "article", siteName: "Fulse" },
  };
}

function cantidad(ing: PublicRecipe["ingredients"][number]): string {
  if (ing.quantity != null) {
    const n = Number.isInteger(ing.quantity) ? ing.quantity : Number(ing.quantity.toFixed(1));
    return `${n}${ing.unit ? ` ${ing.unit}` : ""}`;
  }
  return ing.quantityText ?? "";
}

export default async function RecetaPublica({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const recipe = await getRecipe(token);

  // 404 generico: no distingue "nunca existio" de "fue revocada", para no
  // confirmar que un token fue valido alguna vez.
  if (!recipe) notFound();

  const tiempoTotal = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-center px-4">
          <span className="flex items-center gap-2 text-lg font-bold">
            <span className="text-xl">🍳</span> Fulse
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6">
        <h1 className="text-xl font-bold leading-tight">{recipe.title}</h1>
        {recipe.description && (
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">{recipe.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {recipe.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-orange-50 px-2 py-0.5 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
              {tag}
            </span>
          ))}
          {tiempoTotal > 0 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{tiempoTotal} min</span>
          )}
          {recipe.servings && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
              {recipe.servings} {recipe.servings === 1 ? "porción" : "porciones"}
            </span>
          )}
        </div>

        {recipe.nutriBadges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {recipe.nutriBadges.map((b) => (
              <span key={b} className="rounded-full border border-zinc-200 px-2 py-0.5 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {b}
              </span>
            ))}
          </div>
        )}

        <section className="mt-6">
          <h2 className="mb-3 text-base font-semibold">Ingredientes</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => {
              const q = cantidad(ing);
              return (
                <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
                  {q && <span className="font-medium">{q} </span>}
                  {q ? "de " : ""}{ing.name}
                  {ing.note && <span className="text-zinc-400 dark:text-zinc-500"> ({ing.note})</span>}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-base font-semibold">Preparación</h2>
          <ol className="space-y-4">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600 dark:bg-orange-900 dark:text-orange-400">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {recipe.caloriesPerServing != null && (
          <section className="mt-6 rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <h2 className="mb-2 text-base font-semibold">Por porción (estimado)</h2>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-zinc-600 dark:text-zinc-400">
              <span>{recipe.caloriesPerServing} kcal</span>
              {recipe.proteinG != null && <span>Proteína {recipe.proteinG} g</span>}
              {recipe.carbsG != null && <span>Carbos {recipe.carbsG} g</span>}
              {recipe.fatG != null && <span>Grasa {recipe.fatG} g</span>}
            </div>
          </section>
        )}

        <footer className="mt-10 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          Compartido desde Fulse
        </footer>
      </main>
    </div>
  );
}
