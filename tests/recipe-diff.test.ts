import { describe, it, expect } from "vitest";
import { diffRecipes, type RecipeComparable, type DiffIngrediente } from "@/lib/recipes/diff";

const ing = (nombre: string, over: Partial<DiffIngrediente> = {}): DiffIngrediente => ({
  nombre, quantity: null, unit: null, quantityText: null, note: null, ...over,
});

const base = (over: Partial<RecipeComparable> = {}): RecipeComparable => ({
  title: "Pasta al pesto",
  description: "Rica y rápida",
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  servings: 2,
  tags: ["italiana"],
  steps: ["Hervir el agua", "Cocinar la pasta", "Mezclar con pesto"],
  ingredients: [ing("pasta", { quantity: 200, unit: "g" }), ing("sal", { quantityText: "al gusto" })],
  ...over,
});

describe("diffRecipes — sin cambios", () => {
  it("detecta que no cambió nada", () => {
    const d = diffRecipes(base(), base());
    expect(d.sinCambios).toBe(true);
    expect(d.campos).toHaveLength(0);
    expect(d.pasos).toHaveLength(0);
    expect(d.ingredientes).toHaveLength(0);
  });
});

describe("diffRecipes — campos simples", () => {
  it("detecta cambio de título", () => {
    const d = diffRecipes(base(), base({ title: "Pasta al pesto sin gluten" }));
    expect(d.campos).toEqual([
      { campo: "Título", antes: "Pasta al pesto", despues: "Pasta al pesto sin gluten" },
    ]);
    expect(d.sinCambios).toBe(false);
  });

  it("detecta cambio de porciones y tiempos", () => {
    const d = diffRecipes(base(), base({ servings: 4, cookTimeMinutes: 25 }));
    const campos = d.campos.map((c) => c.campo);
    expect(campos).toContain("Porciones");
    expect(campos).toContain("Cocción (min)");
  });

  it("muestra un guion cuando un campo pasa a vacío", () => {
    const d = diffRecipes(base(), base({ description: null }));
    expect(d.campos[0]).toEqual({ campo: "Descripción", antes: "Rica y rápida", despues: "—" });
  });
});

describe("diffRecipes — pasos", () => {
  it("detecta un paso modificado", () => {
    const d = diffRecipes(base(), base({
      steps: ["Hervir el agua", "Cocinar la pasta 8 minutos", "Mezclar con pesto"],
    }));
    expect(d.pasos).toEqual([
      { tipo: "modificado", numero: 2, antes: "Cocinar la pasta", despues: "Cocinar la pasta 8 minutos" },
    ]);
  });

  it("detecta un paso agregado al final", () => {
    const d = diffRecipes(base(), base({
      steps: [...base().steps, "Servir caliente"],
    }));
    expect(d.pasos).toEqual([{ tipo: "agregado", numero: 4, despues: "Servir caliente" }]);
  });

  it("detecta un paso eliminado", () => {
    const d = diffRecipes(base(), base({ steps: ["Hervir el agua", "Cocinar la pasta"] }));
    expect(d.pasos).toEqual([{ tipo: "eliminado", numero: 3, antes: "Mezclar con pesto" }]);
  });
});

describe("diffRecipes — ingredientes", () => {
  it("detecta uno agregado", () => {
    const d = diffRecipes(base(), base({
      ingredients: [...base().ingredients, ing("albahaca", { quantity: 20, unit: "g" })],
    }));
    expect(d.ingredientes).toEqual([
      { tipo: "agregado", nombre: "albahaca", despues: "20 g" },
    ]);
  });

  it("detecta uno eliminado", () => {
    const d = diffRecipes(base(), base({
      ingredients: [ing("pasta", { quantity: 200, unit: "g" })],
    }));
    expect(d.ingredientes).toEqual([
      { tipo: "eliminado", nombre: "sal", antes: "al gusto" },
    ]);
  });

  it("detecta un cambio de cantidad", () => {
    const d = diffRecipes(base(), base({
      ingredients: [ing("pasta", { quantity: 400, unit: "g" }), ing("sal", { quantityText: "al gusto" })],
    }));
    expect(d.ingredientes).toEqual([
      { tipo: "modificado", nombre: "pasta", antes: "200 g", despues: "400 g" },
    ]);
  });

  it("empareja por nombre aunque cambie mayúsculas o puntuación", () => {
    const d = diffRecipes(base(), base({
      ingredients: [ing("PASTA", { quantity: 200, unit: "g" }), ing("sal", { quantityText: "al gusto" })],
    }));
    expect(d.ingredientes).toHaveLength(0);
  });

  it("detecta una nota añadida al ingrediente", () => {
    const d = diffRecipes(base(), base({
      ingredients: [ing("pasta", { quantity: 200, unit: "g", note: "sin gluten" }), ing("sal", { quantityText: "al gusto" })],
    }));
    expect(d.ingredientes[0]).toEqual({
      tipo: "modificado", nombre: "pasta", antes: "200 g", despues: "200 g (sin gluten)",
    });
  });
});

describe("diffRecipes — caso real: doblar porciones", () => {
  it("reporta porciones y cantidades, no los pasos", () => {
    const d = diffRecipes(base(), base({
      servings: 4,
      ingredients: [ing("pasta", { quantity: 400, unit: "g" }), ing("sal", { quantityText: "al gusto" })],
    }));
    expect(d.campos.map((c) => c.campo)).toEqual(["Porciones"]);
    expect(d.pasos).toHaveLength(0);
    expect(d.ingredientes).toHaveLength(1);
  });
});
