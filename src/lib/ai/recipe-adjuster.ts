import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { generatedRecipeSchema, type GeneratedRecipe } from "@/types/schemas";
import { buildSystemPrompt, type MemoryProfileData } from "./recipe-generator";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
});

export interface RecipeParaAjustar {
  title: string;
  description: string | null;
  steps: string[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  tags: string[];
  ingredients: {
    name: string;
    quantity: number | null;
    unit: string | null;
    quantityText: string | null;
    note: string | null;
  }[];
}

/**
 * Pide la receta COMPLETA ya modificada, no un patch parcial: un patch es
 * ambiguo en los arreglos (¿tres pasos son los unicos o los que cambiaron?) y
 * obligaria a un esquema nuevo. Reutilizar generatedRecipeSchema, que ya esta
 * probado, y dejar que la seguridad venga del diff que confirma el usuario.
 */
export function buildAdjustPrompt(recipe: RecipeParaAjustar, instruction: string): string {
  return [
    "Esta es una receta que el usuario ya tiene guardada:",
    "",
    JSON.stringify(recipe, null, 2),
    "",
    `El usuario pide este ajuste: "${instruction.trim()}"`,
    "",
    "Devuelve la receta COMPLETA ya ajustada, con el mismo formato JSON de siempre.",
    "Reglas:",
    "- Cambia únicamente lo que el ajuste pedido requiera; conserva el resto tal cual, incluido el texto exacto de los pasos que no se ven afectados.",
    "- Si el ajuste cambia las cantidades, ajusta también las porciones y viceversa, para que sean coherentes.",
    "- Mantén el idioma original de la receta.",
    "- No inventes ingredientes que el ajuste no pida ni elimines los que siguen siendo necesarios.",
  ].join("\n");
}

export interface ResultadoAjuste {
  recipe: GeneratedRecipe;
}

export async function adjustRecipe(
  recipe: RecipeParaAjustar,
  instruction: string,
): Promise<ResultadoAjuste> {
  const profile = await prisma.userProfile.findUnique({ where: { id: "main" } });

  const rawProfile = profile ?? {
    allergies: [], restrictions: [], dislikedIngredients: [],
    lovedIngredients: [], equipment: [], defaultServings: 2,
  };

  // El perfil importa aqui tanto como al generar: "ajustala a mi airfryer"
  // funciona porque el prompt ya inyecta el equipamiento del usuario.
  const memoryProfile = profile?.memoryEnabled
    ? (profile.memoryProfile as MemoryProfileData | undefined)
    : undefined;

  const response = await deepseek.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    messages: [
      {
        role: "system",
        content: buildSystemPrompt({
          ...rawProfile,
          memoryProfile,
          knowledgeProfile: profile?.knowledgeProfile,
        }),
      },
      { role: "user", content: buildAdjustPrompt(recipe, instruction) },
    ],
    response_format: { type: "json_object" },
  });

  await prisma.aiGeneration.create({
    data: {
      provider: "deepseek",
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
    },
  });

  const content = response.choices[0]?.message?.content ?? "{}";

  // Si no valida se descarta con un error claro, en vez de intentar arreglar
  // una respuesta rota y terminar guardando algo a medias.
  const parsed = generatedRecipeSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error("La IA devolvió una receta con formato inválido");
  }

  return { recipe: parsed.data };
}
