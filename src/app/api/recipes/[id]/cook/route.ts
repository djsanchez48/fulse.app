import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractEventPayloads, trackEvents } from "@/lib/insights/track";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: { include: { ingredient: true } },
        collections: { include: { collection: true } },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 });
    }

    const updated = await prisma.recipe.update({
      where: { id },
      data: {
        cookedCount: { increment: 1 },
        lastCookedAt: new Date(),
      },
      include: {
        ingredients: { include: { ingredient: true } },
        collections: { include: { collection: true } },
      },
    });

    const cookEvents = extractEventPayloads(
      "recipe_cooked",
      {
        ingredients: recipe.ingredients.map((ri) => ({ name: ri.ingredient.name })),
        tags: recipe.tags,
        badges: recipe.nutriBadges,
      },
      3,
      id,
    );
    trackEvents(cookEvents).catch((err) => console.error("trackEvents error:", err));

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Cook recipe error:", error);
    return NextResponse.json({ error: "Error al marcar como cocinada" }, { status: 500 });
  }
}
