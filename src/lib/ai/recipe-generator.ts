import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { generatedRecipeSchema, type GeneratedRecipe } from "@/types/schemas";
import { translations } from "@/lib/i18n";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
});

function buildSystemPrompt(
  profile: {
    allergies: string[];
    restrictions: string[];
    dislikedIngredients: string[];
    lovedIngredients: string[];
    equipment: string[];
    defaultServings: number;
  },
  lang: "es" | "en" = "es",
) {
  const template = translations[lang]["ai.system_prompt"] as string;
  return template
    .replace("{allergies}", profile.allergies.join(", ") || "none")
    .replace("{restrictions}", profile.restrictions.join(", ") || "none")
    .replace("{dislikedIngredients}", profile.dislikedIngredients.join(", ") || "none")
    .replace("{lovedIngredients}", profile.lovedIngredients.join(", ") || "none")
    .replace("{equipment}", profile.equipment.join(", ") || "basic kitchen utensils")
    .replace("{defaultServings}", profile.defaultServings.toString());
}

async function validateAndRetry(
  content: string,
  messages: { role: "system" | "user" | "assistant"; content: string }[],
): Promise<GeneratedRecipe> {
  try {
    const parsed = JSON.parse(content);
    return generatedRecipeSchema.parse(parsed);
  } catch {
    const retry = await deepseek.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      messages: [
        ...messages,
        {
          role: "user",
          content:
            "Tu respuesta anterior no fue un JSON válido con la estructura requerida. Responde ÚNICAMENTE con el JSON, sin texto adicional.",
        },
      ],
      response_format: { type: "json_object" },
    });

    const retryContent = retry.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(retryContent);
    return generatedRecipeSchema.parse(parsed);
  }
}

async function lazyCleanupDrafts() {
  const count = await prisma.generationDraft.count();
  if (count >= 10) {
    const toDelete = await prisma.generationDraft.findMany({
      orderBy: { createdAt: "asc" },
      take: count - 9,
      select: { id: true },
    });
    await prisma.generationDraft.deleteMany({
      where: { id: { in: toDelete.map((d) => d.id) } },
    });
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  await prisma.generationDraft.deleteMany({
    where: { createdAt: { lt: ninetyDaysAgo } },
  });
}

export async function generateRecipe(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
): Promise<GeneratedRecipe & { draftId: string }> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: "main" },
  });

  const systemMessage = {
    role: "system" as const,
    content: buildSystemPrompt(
      profile ?? {
        allergies: [],
        restrictions: [],
        dislikedIngredients: [],
        lovedIngredients: [],
        equipment: [],
        defaultServings: 2,
      },
    ),
  };

  const fullMessages = [systemMessage, ...messages];

  const response = await deepseek.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
    messages: fullMessages,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const recipe = await validateAndRetry(content, fullMessages);

  await prisma.aiGeneration.create({
    data: {
      provider: "deepseek",
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
    },
  });

  await lazyCleanupDrafts();

  const lastUserMessage = messages
    .filter((m) => m.role === "user")
    .pop();

  const draft = await prisma.generationDraft.create({
    data: {
      prompt: lastUserMessage?.content ?? "",
      recipeJson: JSON.parse(JSON.stringify(recipe)),
    },
  });

  return { ...recipe, draftId: draft.id };
}
