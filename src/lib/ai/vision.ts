import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function detectIngredientsFromImage(
  imageBase64: string,
): Promise<string[]> {
  const model = process.env.ANTHROPIC_VISION_MODEL ?? "claude-3-haiku-20240307";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "List ONLY the food ingredients visible in this image. Return a JSON array of strings, nothing else. Use singular, lowercase names. Example: [\"tomate\", \"cebolla\", \"pollo\"]. If no food is visible, return an empty array [].",
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { text: string }).text)
    .join("");

  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const ingredients = JSON.parse(match[0]);
      if (Array.isArray(ingredients)) {
        return ingredients
          .filter((i): i is string => typeof i === "string")
          .map((i) => i.trim().toLowerCase())
          .filter((i) => i.length > 0);
      }
    }
  } catch {}

  return [];
}
