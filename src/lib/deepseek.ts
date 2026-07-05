import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export async function generateRecipe(prompt: string) {
  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `You are a professional chef and recipe creator. Generate detailed, delicious recipes based on user requests. Return JSON with: title, description, ingredients (array of {name, quantity, unit}), instructions (array of strings), prepTime (minutes), cookTime (minutes), difficulty (EASY/MEDIUM/HARD), cuisine, and tips (array of strings).`,
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content ?? "{}");
}

export async function generateMealPlan(preferences: string) {
  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `You are a meal planning expert. Create a 7-day meal plan based on user preferences. Return JSON with: weekStart (ISO date), meals (array of {dayOfWeek: 0-6, mealType: "BREAKFAST"|"LUNCH"|"DINNER"|"SNACK", recipe: {title, description, ingredients, instructions, prepTime, cookTime, difficulty, cuisine}}).`,
      },
      { role: "user", content: preferences },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content ?? "{}");
}

export async function suggestFromIngredients(ingredients: string) {
  const response = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `You are a creative chef. Given a list of ingredients, suggest recipes the user can make. Return JSON with: suggestions (array of {title, description, missingIngredients: string[], difficulty, estimatedTime: minutes}).`,
      },
      { role: "user", content: `I have these ingredients: ${ingredients}. What can I make?` },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content ?? "{}");
}
