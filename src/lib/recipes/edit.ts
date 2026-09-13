export interface EditableIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  quantityText: string | null;
  note: string | null;
}

export function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Serializa un ingrediente a una linea editable a mano.
 *   200 g de pasta            -> cantidad escalable
 *   sal — al gusto            -> cantidad no escalable
 *   tomate (picado fino)      -> sin cantidad, con nota
 */
export function formatIngredientLine(ing: EditableIngredient): string {
  let line: string;

  if (ing.quantity != null) {
    line = `${ing.quantity}${ing.unit ? ` ${ing.unit}` : ""} de ${ing.name}`;
  } else if (ing.quantityText) {
    line = `${ing.name} — ${ing.quantityText}`;
  } else {
    line = ing.name;
  }

  return ing.note ? `${line} (${ing.note})` : line;
}

// "de" nunca es una unidad: sin el lookahead, "2 de tomate" la tomaria como tal.
const QUANTITY_LINE = /^([\d.,/]+)\s*(?:(?!de\s)([^\s(]+)\s+)?(?:de\s+)?(.+)$/;

export function parseIngredientLine(line: string): EditableIngredient | null {
  const cleaned = line.trim();
  if (!cleaned) return null;

  let rest = cleaned;
  let note: string | null = null;

  const noteMatch = rest.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (noteMatch) {
    rest = noteMatch[1].trim();
    note = noteMatch[2].trim() || null;
  }

  const dashIndex = rest.indexOf("—");
  if (dashIndex !== -1) {
    const name = rest.slice(0, dashIndex).trim();
    const quantityText = rest.slice(dashIndex + 1).trim();
    if (name) return { name, quantity: null, unit: null, quantityText: quantityText || null, note };
  }

  const match = rest.match(QUANTITY_LINE);
  if (match) {
    const quantity = Number(match[1].replace(",", "."));
    if (Number.isFinite(quantity)) {
      return { name: match[3].trim(), quantity, unit: match[2] ?? null, quantityText: null, note };
    }
  }

  return { name: rest, quantity: null, unit: null, quantityText: null, note };
}

export function parseIngredientLines(text: string): EditableIngredient[] {
  return text
    .split("\n")
    .map(parseIngredientLine)
    .filter((ing): ing is EditableIngredient => ing !== null);
}

export function formatIngredientLines(ingredients: EditableIngredient[]): string {
  return ingredients.map(formatIngredientLine).join("\n");
}

/**
 * El analisis nutricional se guarda por receta, asi que cambiar de que esta hecha
 * (ingredientes) o entre cuantos se reparte (porciones) lo deja mintiendo: se invalida
 * para que se recalcule perezosamente. Editar titulo o el texto de un paso no lo afecta.
 */
export function invalidatesNutrition(
  patch: { ingredients?: unknown; servings?: number | null },
  current: { servings: number | null },
): boolean {
  if (patch.ingredients !== undefined) return true;
  if (patch.servings !== undefined && patch.servings !== current.servings) return true;
  return false;
}

/** RecipeIngredient tiene PK compuesta [recipeId, ingredientId]: un nombre repetido la violaria. */
export function dedupeIngredients(ingredients: EditableIngredient[]): EditableIngredient[] {
  const byName = new Map<string, EditableIngredient>();
  for (const ing of ingredients) byName.set(normalizeIngredientName(ing.name), ing);
  return [...byName.values()];
}

export type ValidationResult =
  | { ok: true; value: EditableIngredient[] }
  | { ok: false; error: string };

export function validateIngredients(input: unknown): ValidationResult {
  if (!Array.isArray(input)) return { ok: false, error: "ingredients debe ser un arreglo" };

  const value: EditableIngredient[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, error: "Cada ingrediente debe ser un objeto" };
    }
    const ing = raw as Record<string, unknown>;
    if (typeof ing.name !== "string" || !ing.name.trim()) {
      return { ok: false, error: "Cada ingrediente necesita un nombre" };
    }
    if (ing.quantity != null && (typeof ing.quantity !== "number" || !Number.isFinite(ing.quantity))) {
      return { ok: false, error: `Cantidad invalida en "${ing.name}"` };
    }
    value.push({
      name: ing.name.trim(),
      quantity: (ing.quantity as number | null) ?? null,
      unit: (ing.unit as string | null) ?? null,
      quantityText: (ing.quantityText as string | null) ?? null,
      note: (ing.note as string | null) ?? null,
    });
  }

  return { ok: true, value: dedupeIngredients(value) };
}
