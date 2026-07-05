import { NextRequest, NextResponse } from "next/server";
import { generateRecipe, suggestFromIngredients } from "@/lib/deepseek";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, prompt, ingredients } = body;

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "DeepSeek API key not configured" },
        { status: 500 }
      );
    }

    let recipe;
    if (mode === "ingredients") {
      if (!ingredients) {
        return NextResponse.json(
          { error: "Ingredients are required" },
          { status: 400 }
        );
      }
      const suggestions = await suggestFromIngredients(ingredients);
      recipe = suggestions.suggestions?.[0] ?? null;
    } else {
      if (!prompt) {
        return NextResponse.json(
          { error: "Prompt is required" },
          { status: 400 }
        );
      }
      recipe = await generateRecipe(prompt);
    }

    if (!recipe) {
      return NextResponse.json(
        { error: "No recipe could be generated. Try a different prompt." },
        { status: 404 }
      );
    }

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate recipe" },
      { status: 500 }
    );
  }
}
