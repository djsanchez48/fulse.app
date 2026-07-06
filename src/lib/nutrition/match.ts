import type { Goal } from "@/lib/nutrition/targets";

export type MatchResult = "ideal" | "neutral" | "antojo";

interface RecipeNutrition {
  caloriesPerServing?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  nutriBadges?: string[];
}

const PREMIUM_INGREDIENTS = [
  "langosta", "caviar", "trufa", "azafrán", "foie gras",
  "solomillo", "vieira", "centollo", "angulas",
];

function hasBadge(badges: string[] | undefined, badge: string): boolean {
  return (badges ?? []).some((b) => b.toLowerCase().includes(badge.toLowerCase()));
}

function countVegetalIngredients(ingredients: { name: string }[]): number {
  const vegetales = [
    "tomate", "cebolla", "papa", "zanahoria", "lechuga", "espinaca",
    "brócoli", "coliflor", "pimentón", "ajo", "pepino", "remolacha",
    "calabacín", "berenjena", "champiñón", "apio", "rucula", "perejil",
    "cilantro", "albahaca", "acelga", "kale", "batata", "maíz",
    "arveja", "repollo", "col", "nabo", "rábano", "chile",
    "aguacate", "palta", "pimiento", "espárrago", "alcachofa",
  ];
  return ingredients.filter((i) =>
    vegetales.some((v) => i.name.toLowerCase().includes(v)),
  ).length;
}

function hasPremiumIngredients(ingredients: { name: string }[]): number {
  return ingredients.filter((i) =>
    PREMIUM_INGREDIENTS.some((p) => i.name.toLowerCase().includes(p)),
  ).length;
}

export function computeMatch(
  nutrition: RecipeNutrition | null,
  goals: Goal[],
  ingredients?: { name: string }[],
): MatchResult | null {
  if (!nutrition || goals.length === 0) return null;

  const matches: MatchResult[] = goals.map((goal) => {
    switch (goal) {
      case "bajar_peso": {
        const kcal = nutrition.caloriesPerServing ?? 0;
        if (hasBadge(nutrition.nutriBadges, "dulce") || kcal >= 800) return "antojo";
        if (kcal <= 550) return "ideal";
        return "neutral";
      }
      case "ganar_musculo":
      case "mas_proteina": {
        const p = nutrition.proteinG ?? 0;
        if (p >= 25) return "ideal";
        if (p < 10) return "antojo";
        return "neutral";
      }
      case "menos_azucar": {
        if (hasBadge(nutrition.nutriBadges, "dulce")) return "antojo";
        if (hasBadge(nutrition.nutriBadges, "baja_azucar")) return "ideal";
        return "neutral";
      }
      case "mas_saludable": {
        if (hasBadge(nutrition.nutriBadges, "dulce") || hasBadge(nutrition.nutriBadges, "contundente"))
          return "antojo";
        if (hasBadge(nutrition.nutriBadges, "ligera") || hasBadge(nutrition.nutriBadges, "buena_fibra"))
          return "ideal";
        return "neutral";
      }
      case "menos_sal": {
        if (hasBadge(nutrition.nutriBadges, "alto_sodio")) return "antojo";
        return "neutral";
      }
      case "mas_vegetales": {
        const count = countVegetalIngredients(ingredients ?? []);
        if (count >= 3) return "ideal";
        if (count === 0) return "antojo";
        return "neutral";
      }
      case "economico": {
        const premium = hasPremiumIngredients(ingredients ?? []);
        if (premium >= 2) return "antojo";
        if (premium === 0) return "ideal";
        return "neutral";
      }
      default:
        return "neutral";
    }
  });

  if (matches.includes("antojo")) return "antojo";
  if (matches.includes("neutral")) return "neutral";
  return "ideal";
}

export function matchLabel(match: MatchResult): { emoji: string; label: string; className: string } {
  switch (match) {
    case "ideal":
      return { emoji: "✅", label: "Ideal para tu objetivo", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
    case "neutral":
      return { emoji: "👌", label: "Neutra", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" };
    case "antojo":
      return { emoji: "🍰", label: "Antojo", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  }
}
