import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const force = body?.force === true;

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: { include: { ingredient: true } } },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 });
    }

    if (recipe.nutriAnalyzedAt && !force) {
      return NextResponse.json({
        caloriesPerServing: recipe.caloriesPerServing,
        proteinG: recipe.proteinG,
        carbsG: recipe.carbsG,
        fatG: recipe.fatG,
        nutriBadges: recipe.nutriBadges,
        cached: true,
      });
    }

    const ingText = recipe.ingredients
      .map((ri) => `${ri.quantity ?? ""} ${ri.unit ?? ""} ${ri.ingredient.name}`.trim())
      .join(", ");

    const response = await deepseek.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "Eres un analista nutricional. Estima calorías y macros por porción y asigna badges cualitativos.",
        },
        {
          role: "user",
          content: `Receta: ${recipe.title}\nPorciones: ${recipe.servings ?? 2}\nIngredientes: ${ingText}\n\nResponde JSON: { "caloriesPerServing": number, "proteinG": number, "carbsG": number, "fatG": number, "nutriBadges": ["alta_proteina"|"ligera"|"buena_fibra"|"dulce"|"contundente"|"alta_fibra"|"baja_azucar"|"alto_sodio"] }`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const analysis = JSON.parse(content);

    const updated = await prisma.recipe.update({
      where: { id },
      data: {
        caloriesPerServing: analysis.caloriesPerServing ?? null,
        proteinG: analysis.proteinG ?? null,
        carbsG: analysis.carbsG ?? null,
        fatG: analysis.fatG ?? null,
        nutriBadges: analysis.nutriBadges ?? [],
        nutriAnalyzedAt: new Date(),
      },
    });

    return NextResponse.json({
      caloriesPerServing: updated.caloriesPerServing,
      proteinG: updated.proteinG,
      carbsG: updated.carbsG,
      fatG: updated.fatG,
      nutriBadges: updated.nutriBadges,
      cached: false,
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "Error al analizar" }, { status: 500 });
  }
}
