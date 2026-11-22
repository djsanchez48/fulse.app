export interface ShareableIngredient {
  quantity: number | null;
  unit: string | null;
  quantityText: string | null;
  note: string | null;
  ingredient: { name: string };
}

export interface ShareableRecipe {
  title: string;
  description: string | null;
  steps: string[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  ingredients: ShareableIngredient[];
}

/**
 * Cantidad ya escalada a las porciones que se estan mostrando. Vive aca —y no en la
 * pantalla— para que el texto compartido y lo que el usuario ve no se desincronicen.
 */
export function formatScaledQuantity(ing: ShareableIngredient, factor: number): string {
  // `quantity` manda sobre `quantityText`. El generador llena las dos columnas
  // (quantity: 400 + quantityText: "400 g"), y mirar el texto primero hacia que
  // el escalado no corriera nunca: el selector de porciones no hacia nada.
  // El contrato del PRD es que quantityText es solo para lo no escalable.
  if (ing.quantity != null) {
    const scaled = ing.quantity * factor;
    const formatted = Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
    return `${formatted}${ing.unit ? ` ${ing.unit}` : ""}`;
  }
  return ing.quantityText ?? "";
}

function ingredientLine(ing: ShareableIngredient, factor: number): string {
  const name = ing.ingredient.name;
  let base: string;

  if (ing.quantity != null) {
    // "200 g de pollo"
    base = `${formatScaledQuantity(ing, factor)} de ${name}`;
  } else if (ing.quantityText) {
    // "sal — al gusto", no "al gusto de sal"
    base = `${name} — ${ing.quantityText}`;
  } else {
    base = name;
  }

  return ing.note ? `• ${base} (${ing.note})` : `• ${base}`;
}

/**
 * Texto plano de la receta para compartir. Los asteriscos son la negrita de WhatsApp,
 * que es el destino que motiva esta funcion; en otros destinos se ven literales.
 *
 * `servings` son las porciones que el usuario tiene en pantalla, no las de la receta:
 * se comparte lo que esta viendo.
 */
export function buildShareText(recipe: ShareableRecipe, servings: number): string {
  const factor = recipe.servings ? servings / recipe.servings : 1;
  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  const parts: string[] = [`*${recipe.title}*`];

  if (recipe.description) parts.push(recipe.description);

  const meta: string[] = [];
  if (servings > 0) meta.push(`🍽 ${servings} ${servings === 1 ? "porción" : "porciones"}`);
  if (totalTime > 0) meta.push(`⏱ ${totalTime} min`);
  if (meta.length) parts.push(meta.join(" · "));

  if (recipe.ingredients.length) {
    parts.push(["*Ingredientes*", ...recipe.ingredients.map((i) => ingredientLine(i, factor))].join("\n"));
  }

  if (recipe.steps.length) {
    parts.push(["*Preparación*", ...recipe.steps.map((s, i) => `${i + 1}. ${s}`)].join("\n"));
  }

  parts.push("— Compartido desde Fulse");

  return parts.join("\n\n");
}

/**
 * Limite practico para el fallback wa.me. 2000 (la guia vieja de IE) se queda corto:
 * una receta normal genera ~2.200 caracteres ya codificados y se iria al portapapeles
 * en vez de a WhatsApp. Chrome soporta ~32k y Safari mas; 8000 deja margen de sobra
 * sin arriesgar que el SO corte la URL al pasarsela a la app de WhatsApp.
 */
export const WA_URL_SAFE_LENGTH = 8000;

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function fitsInWhatsappUrl(text: string): boolean {
  return whatsappUrl(text).length <= WA_URL_SAFE_LENGTH;
}
