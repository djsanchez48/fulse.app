"use client";

import { useState } from "react";
import { Sparkles, Loader2, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "generate" | "ingredients";

interface GeneratedRecipe {
  title: string;
  description: string;
  ingredients: { name: string; quantity: number; unit: string }[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  difficulty: string;
  cuisine: string;
  tips: string[];
}

export default function AIGeneratePage() {
  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setRecipe(null);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt: mode === "generate" ? prompt : undefined,
          ingredients: mode === "ingredients" ? ingredients : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setRecipe(data.recipe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate recipe");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          AI Recipe Generator
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Tell us what you&apos;re craving or what ingredients you have
        </p>
      </div>

      <div className="mb-8 flex justify-center gap-2">
        <Button
          variant={mode === "generate" ? "default" : "outline"}
          onClick={() => setMode("generate")}
        >
          <Sparkles className="h-4 w-4" />
          Generate Recipe
        </Button>
        <Button
          variant={mode === "ingredients" ? "default" : "outline"}
          onClick={() => setMode("ingredients")}
        >
          <ChefHat className="h-4 w-4" />
          Use My Ingredients
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "generate"
              ? "Describe your ideal dish"
              : "What ingredients do you have?"}
          </CardTitle>
          <CardDescription>
            {mode === "generate"
              ? "e.g., \"A vegan pasta with creamy mushroom sauce\""
              : "e.g., \"chicken, rice, bell peppers, onion, garlic\""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "generate" ? (
              <Input
                placeholder="Describe the recipe you want..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
              />
            ) : (
              <Input
                placeholder="List your ingredients, separated by commas..."
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                required
              />
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Recipe
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {recipe && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-2xl">{recipe.title}</CardTitle>
            <CardDescription>{recipe.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                {recipe.cuisine}
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
                Prep: {recipe.prepTime}min
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
                Cook: {recipe.cookTime}min
              </span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">
                {recipe.difficulty}
              </span>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Ingredients</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i}>
                    {ing.quantity} {ing.unit} {ing.name}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Instructions</h3>
              <ol className="list-inside list-decimal space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                {recipe.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            {recipe.tips && recipe.tips.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Tips</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {recipe.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
