import { describe, it, expect } from "vitest";
import {
  formatIngredientLine,
  parseIngredientLine,
  parseIngredientLines,
  formatIngredientLines,
  invalidatesNutrition,
  dedupeIngredients,
  validateIngredients,
  normalizeIngredientName,
  type EditableIngredient,
} from "@/lib/recipes/edit";

const ing = (over: Partial<EditableIngredient>): EditableIngredient => ({
  name: "pasta", quantity: null, unit: null, quantityText: null, note: null, ...over,
});

describe("formatIngredientLine", () => {
  it("formats a scalable quantity with unit", () => {
    expect(formatIngredientLine(ing({ name: "pasta", quantity: 200, unit: "g" }))).toBe("200 g de pasta");
  });

  it("formats a scalable quantity without unit", () => {
    expect(formatIngredientLine(ing({ name: "tomate", quantity: 2 }))).toBe("2 de tomate");
  });

  it("formats a non-scalable quantity after a dash", () => {
    expect(formatIngredientLine(ing({ name: "sal", quantityText: "al gusto" }))).toBe("sal — al gusto");
  });

  it("formats a bare ingredient", () => {
    expect(formatIngredientLine(ing({ name: "perejil" }))).toBe("perejil");
  });

  it("appends the note in parentheses", () => {
    expect(formatIngredientLine(ing({ name: "ajo", quantity: 2, note: "picado fino" })))
      .toBe("2 de ajo (picado fino)");
  });
});

describe("parseIngredientLine", () => {
  it("parses quantity, unit and name", () => {
    expect(parseIngredientLine("200 g de pasta")).toEqual(ing({ name: "pasta", quantity: 200, unit: "g" }));
  });

  it("never mistakes 'de' for a unit", () => {
    expect(parseIngredientLine("2 de tomate")).toEqual(ing({ name: "tomate", quantity: 2 }));
  });

  it("parses decimals with comma", () => {
    expect(parseIngredientLine("1,5 tazas de harina")).toEqual(
      ing({ name: "harina", quantity: 1.5, unit: "tazas" }),
    );
  });

  it("parses a non-scalable quantity", () => {
    expect(parseIngredientLine("sal — al gusto")).toEqual(ing({ name: "sal", quantityText: "al gusto" }));
  });

  it("parses a note", () => {
    expect(parseIngredientLine("2 de ajo (picado fino)")).toEqual(
      ing({ name: "ajo", quantity: 2, note: "picado fino" }),
    );
  });

  it("parses a bare ingredient", () => {
    expect(parseIngredientLine("perejil")).toEqual(ing({ name: "perejil" }));
  });

  it("ignores blank lines", () => {
    expect(parseIngredientLine("   ")).toBeNull();
  });
});

describe("ingredient line round-trip", () => {
  const cases: EditableIngredient[] = [
    ing({ name: "pasta", quantity: 200, unit: "g" }),
    ing({ name: "tomate", quantity: 2 }),
    ing({ name: "sal", quantityText: "al gusto" }),
    ing({ name: "perejil" }),
    ing({ name: "ajo", quantity: 2, note: "picado fino" }),
    ing({ name: "aceite de oliva", quantity: 3, unit: "cucharadas" }),
    ing({ name: "pimienta", quantityText: "una pizca", note: "recién molida" }),
    ing({ name: "harina", quantity: 1.5, unit: "tazas" }),
  ];

  for (const original of cases) {
    it(`survives format -> parse: ${formatIngredientLine(original)}`, () => {
      expect(parseIngredientLine(formatIngredientLine(original))).toEqual(original);
    });
  }

  it("survives a whole multi-line block", () => {
    expect(parseIngredientLines(formatIngredientLines(cases))).toEqual(cases);
  });
});

describe("invalidatesNutrition", () => {
  it("invalidates when ingredients change", () => {
    expect(invalidatesNutrition({ ingredients: [] }, { servings: 2 })).toBe(true);
  });

  it("invalidates when servings change", () => {
    expect(invalidatesNutrition({ servings: 4 }, { servings: 2 })).toBe(true);
  });

  it("does not invalidate when servings are sent unchanged", () => {
    expect(invalidatesNutrition({ servings: 2 }, { servings: 2 })).toBe(false);
  });

  it("does not invalidate on title or steps only edits", () => {
    expect(invalidatesNutrition({}, { servings: 2 })).toBe(false);
  });
});

describe("dedupeIngredients", () => {
  it("collapses repeated names keeping the last one", () => {
    const result = dedupeIngredients([
      ing({ name: "Sal", quantity: 1, unit: "g" }),
      ing({ name: "sal", quantity: 2, unit: "g" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(2);
  });
});

describe("normalizeIngredientName", () => {
  it("trims and lowercases", () => {
    expect(normalizeIngredientName("  Tomate  ")).toBe("tomate");
  });
});

describe("validateIngredients", () => {
  it("accepts a well formed list", () => {
    const result = validateIngredients([{ name: "tomate", quantity: 2, unit: "unidades" }]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]).toEqual(ing({ name: "tomate", quantity: 2, unit: "unidades" }));
    }
  });

  it("rejects a non-array", () => {
    expect(validateIngredients("tomate").ok).toBe(false);
  });

  it("rejects an ingredient without name", () => {
    expect(validateIngredients([{ quantity: 1 }]).ok).toBe(false);
    expect(validateIngredients([{ name: "   " }]).ok).toBe(false);
  });

  it("rejects a non-numeric quantity", () => {
    expect(validateIngredients([{ name: "sal", quantity: "mucha" }]).ok).toBe(false);
  });

  it("dedupes as part of validation", () => {
    const result = validateIngredients([{ name: "sal" }, { name: "SAL" }]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(1);
  });
});
