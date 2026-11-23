import { randomBytes } from "node:crypto";

/**
 * 128 bits de entropia en base64url (~22 caracteres). Nunca se usa el id de la
 * receta: los cuid son enumerables por tiempo de creacion, el token no.
 */
export function generateShareToken(): string {
  return randomBytes(16).toString("base64url");
}

export function shareUrl(token: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/r/${token}`;
}

export interface PublicIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  quantityText: string | null;
  note: string | null;
}

export interface PublicRecipe {
  title: string;
  description: string | null;
  steps: string[];
  ingredients: PublicIngredient[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  tags: string[];
  caloriesPerServing: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  nutriBadges: string[];
}

interface RecipeRow {
  title: string;
  description: string | null;
  steps: string[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  tags: string[];
  caloriesPerServing: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  nutriBadges: string[];
  nutriAnalyzedAt: Date | null;
  ingredients: {
    quantity: number | null;
    unit: string | null;
    quantityText: string | null;
    note: string | null;
    ingredient: { name: string };
  }[];
}

/**
 * Lista blanca: se arma campo por campo a proposito. Devolver el registro de
 * Prisma filtrarIa cookedCount, lastCookedAt, las colecciones y los ids —cuantas
 * veces cocinaste algo y como organizas tu cocina no le incumben a quien abre el
 * link—, y cualquier columna que agreguemos despues se publicaria sola.
 */
export function toPublicRecipe(recipe: RecipeRow): PublicRecipe {
  const analizada = recipe.nutriAnalyzedAt !== null;

  return {
    title: recipe.title,
    description: recipe.description,
    steps: recipe.steps,
    ingredients: recipe.ingredients.map((ri) => ({
      name: ri.ingredient.name,
      quantity: ri.quantity,
      unit: ri.unit,
      quantityText: ri.quantityText,
      note: ri.note,
    })),
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    servings: recipe.servings,
    tags: recipe.tags,
    // Los nutricionales solo si ya se calcularon; si no, serian ceros enganosos.
    caloriesPerServing: analizada ? recipe.caloriesPerServing : null,
    proteinG: analizada ? recipe.proteinG : null,
    carbsG: analizada ? recipe.carbsG : null,
    fatG: analizada ? recipe.fatG : null,
    nutriBadges: analizada ? recipe.nutriBadges : [],
  };
}
