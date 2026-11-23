import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adjustRecipe } from "@/lib/ai/recipe-adjuster";
import { diffRecipes, type RecipeComparable } from "@/lib/recipes/diff";

/**
 * Propone un ajuste; NO escribe nada. Aplicar es responsabilidad del
 * PATCH /api/recipes/[id] que ya existe y ya esta probado, despues de que el
 * usuario confirme el diff.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { instruction } = await req.json();

    if (typeof instruction !== "string" || !instruction.trim()) {
      return NextResponse.json({ error: "Falta la instrucción del ajuste" }, { status: 400 });
    }
    if (instruction.length > 500) {
      return NextResponse.json({ error: "La instrucción es demasiado larga" }, { status: 400 });
    }

    const actual = await prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: { include: { ingredient: true } } },
    });
    if (!actual) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 });
    }

    const paraAjustar = {
      title: actual.title,
      description: actual.description,
      steps: actual.steps,
      prepTimeMinutes: actual.prepTimeMinutes,
      cookTimeMinutes: actual.cookTimeMinutes,
      servings: actual.servings,
      tags: actual.tags,
      ingredients: actual.ingredients.map((ri) => ({
        name: ri.ingredient.name,
        quantity: ri.quantity,
        unit: ri.unit,
        quantityText: ri.quantityText,
        note: ri.note,
      })),
    };

    const { recipe: propuesta } = await adjustRecipe(paraAjustar, instruction);

    const comparableActual: RecipeComparable = {
      ...paraAjustar,
      ingredients: paraAjustar.ingredients.map((i) => ({ ...i, nombre: i.name })),
    };
    const comparablePropuesta: RecipeComparable = {
      title: propuesta.title,
      description: propuesta.description || null,
      prepTimeMinutes: propuesta.prepTimeMinutes ?? null,
      cookTimeMinutes: propuesta.cookTimeMinutes ?? null,
      servings: propuesta.servings ?? null,
      tags: propuesta.tags ?? [],
      steps: propuesta.steps,
      ingredients: propuesta.ingredients.map((i) => ({ ...i, nombre: i.name })),
    };

    return NextResponse.json({
      propuesta: comparablePropuesta,
      diff: diffRecipes(comparableActual, comparablePropuesta),
      // Avisa en el diff si la receta esta publicada: aplicar cambia lo que
      // esta viendo quien tenga el link.
      compartida: actual.shareToken !== null,
    });
  } catch (error) {
    console.error("Adjust recipe error:", error);
    const msg = error instanceof Error && error.message.includes("formato inválido")
      ? error.message
      : "No se pudo ajustar la receta";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
