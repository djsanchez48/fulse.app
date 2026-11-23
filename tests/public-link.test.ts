import { describe, it, expect } from "vitest";
import { generateShareToken, shareUrl, toPublicRecipe } from "@/lib/recipes/public-link";

describe("generateShareToken", () => {
  it("tiene la longitud de 128 bits en base64url", () => {
    expect(generateShareToken()).toHaveLength(22);
  });

  it("solo usa caracteres seguros para una URL", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateShareToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("no se repite", () => {
    const vistos = new Set(Array.from({ length: 1000 }, generateShareToken));
    expect(vistos.size).toBe(1000);
  });
});

describe("shareUrl", () => {
  it("arma la URL pública", () => {
    expect(shareUrl("abc123", "https://www.fulse.app")).toBe("https://www.fulse.app/r/abc123");
  });

  it("no duplica la barra final del origen", () => {
    expect(shareUrl("abc123", "https://www.fulse.app/")).toBe("https://www.fulse.app/r/abc123");
  });
});

const fila = (over: Record<string, unknown> = {}) => ({
  title: "Pasta al pesto",
  description: "Rica",
  steps: ["Cocinar", "Servir"],
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  servings: 2,
  tags: ["italiana"],
  caloriesPerServing: 500,
  proteinG: 20,
  carbsG: 60,
  fatG: 18,
  nutriBadges: ["alto en proteína"],
  nutriAnalyzedAt: new Date(),
  ingredients: [
    { quantity: 200, unit: "g", quantityText: null, note: "seca", ingredient: { name: "pasta" } },
  ],
  ...over,
});

describe("toPublicRecipe — lo que sí publica", () => {
  it("incluye el contenido de la receta", () => {
    const pub = toPublicRecipe(fila() as never);
    expect(pub.title).toBe("Pasta al pesto");
    expect(pub.steps).toEqual(["Cocinar", "Servir"]);
    expect(pub.ingredients[0]).toEqual({
      name: "pasta", quantity: 200, unit: "g", quantityText: null, note: "seca",
    });
  });

  it("incluye nutrición cuando ya fue analizada", () => {
    expect(toPublicRecipe(fila() as never).caloriesPerServing).toBe(500);
  });

  it("omite la nutrición si no se ha analizado, en vez de publicar ceros engañosos", () => {
    const pub = toPublicRecipe(fila({ nutriAnalyzedAt: null }) as never);
    expect(pub.caloriesPerServing).toBeNull();
    expect(pub.proteinG).toBeNull();
    expect(pub.nutriBadges).toEqual([]);
  });
});

describe("toPublicRecipe — lo que NUNCA debe filtrar", () => {
  // Esta es la prueba que importa: si alguien agrega una columna a Recipe y
  // devuelve el objeto completo por descuido, esto lo atrapa.
  const PROHIBIDOS = [
    "id", "cookedCount", "lastCookedAt", "collections", "source",
    "createdAt", "updatedAt", "shareToken", "sharedAt", "nutriAnalyzedAt",
  ];

  it("no expone datos personales ni internos", () => {
    const conTodo = fila({
      id: "cmr123",
      cookedCount: 12,
      lastCookedAt: new Date(),
      collections: [{ collection: { id: "c1", name: "Dieta" } }],
      source: "ai",
      createdAt: new Date(),
      updatedAt: new Date(),
      shareToken: "secreto",
      sharedAt: new Date(),
    });

    const pub = toPublicRecipe(conTodo as never);
    const claves = Object.keys(pub);

    for (const prohibido of PROHIBIDOS) {
      expect(claves, `no debe exponer ${prohibido}`).not.toContain(prohibido);
    }
  });

  it("el JSON serializado no contiene el token ni el conteo de veces cocinada", () => {
    const json = JSON.stringify(toPublicRecipe(fila({
      shareToken: "token-secreto-123", cookedCount: 12,
    }) as never));
    expect(json).not.toContain("token-secreto-123");
    expect(json).not.toContain("cookedCount");
  });

  it("no filtra el nombre de las colecciones", () => {
    const json = JSON.stringify(toPublicRecipe(fila({
      collections: [{ collection: { id: "c1", name: "Para la dieta" } }],
    }) as never));
    expect(json).not.toContain("Para la dieta");
  });
});
