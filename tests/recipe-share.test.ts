import { describe, it, expect } from "vitest";
import {
  buildShareText,
  formatScaledQuantity,
  whatsappUrl,
  fitsInWhatsappUrl,
  type ShareableIngredient,
  type ShareableRecipe,
} from "@/lib/recipes/share";

const ing = (over: Partial<ShareableIngredient> & { name: string }): ShareableIngredient => ({
  quantity: null, unit: null, quantityText: null, note: null,
  ...over,
  ingredient: { name: over.name },
});

const receta = (over: Partial<ShareableRecipe> = {}): ShareableRecipe => ({
  title: "Bowl proteico",
  description: "Rápido y alto en proteína.",
  steps: ["Cocinar el pollo.", "Servir."],
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  servings: 2,
  ingredients: [
    ing({ name: "pollo", quantity: 200, unit: "g" }),
    ing({ name: "sal", quantityText: "al gusto" }),
  ],
  ...over,
});

describe("formatScaledQuantity", () => {
  it("escala las cantidades numéricas", () => {
    expect(formatScaledQuantity(ing({ name: "pollo", quantity: 200, unit: "g" }), 2)).toBe("400 g");
  });

  it("no escala las cantidades de texto", () => {
    expect(formatScaledQuantity(ing({ name: "sal", quantityText: "al gusto" }), 3)).toBe("al gusto");
  });

  it("redondea a un decimal cuando no da entero", () => {
    expect(formatScaledQuantity(ing({ name: "harina", quantity: 1, unit: "taza" }), 1.5)).toBe("1.5 taza");
  });

  it("devuelve vacío cuando no hay cantidad", () => {
    expect(formatScaledQuantity(ing({ name: "perejil" }), 2)).toBe("");
  });

  it("escala igual cuando el generador llenó también quantityText (caso real en BD)", () => {
    // El generador guarda quantity: 400 Y quantityText: "400 g". Si se mira el
    // texto primero, el escalado no corre nunca y el selector de porciones no hace nada.
    const real = ing({ name: "pollo", quantity: 400, unit: "g", quantityText: "400 g" });
    expect(formatScaledQuantity(real, 2)).toBe("800 g");
    expect(formatScaledQuantity(real, 0.5)).toBe("200 g");
  });
});

describe("buildShareText", () => {
  it("incluye título, ingredientes y pasos numerados", () => {
    const txt = buildShareText(receta(), 2);
    expect(txt).toContain("*Bowl proteico*");
    expect(txt).toContain("• 200 g de pollo");
    expect(txt).toContain("1. Cocinar el pollo.");
    expect(txt).toContain("2. Servir.");
  });

  it("escala los ingredientes a las porciones mostradas, no a las de la receta", () => {
    const txt = buildShareText(receta(), 4); // receta base = 2 porciones
    expect(txt).toContain("400 g de pollo");
    expect(txt).toContain("4 porciones");
  });

  it("usa singular con una porción", () => {
    expect(buildShareText(receta(), 1)).toContain("1 porción");
  });

  it("suma prep + cocción en el tiempo total", () => {
    expect(buildShareText(receta(), 2)).toContain("25 min");
  });

  it("omite la descripción si no hay", () => {
    const txt = buildShareText(receta({ description: null }), 2);
    expect(txt).not.toContain("Rápido");
    expect(txt).toContain("*Bowl proteico*");
  });

  it("omite el tiempo si no hay tiempos cargados", () => {
    const txt = buildShareText(receta({ prepTimeMinutes: null, cookTimeMinutes: null }), 2);
    expect(txt).not.toContain("min");
  });

  it("pone la cantidad de texto después del nombre, no antes", () => {
    const txt = buildShareText(receta(), 2);
    expect(txt).toContain("• sal — al gusto");
    expect(txt).not.toContain("al gusto de sal");
  });

  it("lista el ingrediente solo, sin cantidad, cuando no tiene", () => {
    const txt = buildShareText(receta({ ingredients: [ing({ name: "perejil" })] }), 2);
    expect(txt).toContain("• perejil");
  });

  it("incluye la nota del ingrediente entre paréntesis", () => {
    const txt = buildShareText(receta({ ingredients: [ing({ name: "ajo", quantity: 2, note: "picado" })] }), 2);
    expect(txt).toContain("• 2 de ajo (picado)");
  });

  it("no revienta con receta sin ingredientes ni pasos", () => {
    const txt = buildShareText(receta({ ingredients: [], steps: [] }), 2);
    expect(txt).toContain("*Bowl proteico*");
    expect(txt).not.toContain("*Ingredientes*");
    expect(txt).not.toContain("*Preparación*");
  });

  it("cierra con la firma", () => {
    expect(buildShareText(receta(), 2).trim().endsWith("— Compartido desde Fulse")).toBe(true);
  });
});

describe("whatsappUrl / fitsInWhatsappUrl", () => {
  it("codifica el texto en la URL", () => {
    expect(whatsappUrl("hola mundo")).toBe("https://wa.me/?text=hola%20mundo");
  });

  it("acepta una receta normal", () => {
    expect(fitsInWhatsappUrl(buildShareText(receta(), 2))).toBe(true);
  });

  it("acepta una receta larga con acentos (el caso que fallaba con el límite viejo de 2000)", () => {
    const larga = receta({
      steps: Array.from({ length: 12 }, (_, i) => `Paso ${i + 1}: cocción con acentuación y ñ, bastante descriptivo.`),
      ingredients: Array.from({ length: 15 }, (_, i) => ing({ name: `ingrediente número ${i}`, quantity: 100, unit: "g" })),
    });
    const texto = buildShareText(larga, 2);
    expect(texto.length).toBeGreaterThan(900);
    expect(fitsInWhatsappUrl(texto)).toBe(true);
  });

  it("rechaza un texto que no cabe en una URL", () => {
    expect(fitsInWhatsappUrl("x".repeat(9000))).toBe(false);
  });
});
