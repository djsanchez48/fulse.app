"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatIngredientLines, parseIngredientLines } from "@/lib/recipes/edit";
import type { GeneratedRecipe } from "@/types/schemas";

interface InlineRecipeEditorProps {
  recipe: GeneratedRecipe;
  onSave: (edited: GeneratedRecipe) => void;
  onCancel: () => void;
  t: (key: string) => string;
}

export function InlineRecipeEditor({ recipe, onSave, onCancel, t }: InlineRecipeEditorProps) {
  const [title, setTitle] = useState(recipe.title);
  const [description, setDescription] = useState(recipe.description ?? "");
  const [ingredientsText, setIngredientsText] = useState(formatIngredientLines(recipe.ingredients));
  const [stepsText, setStepsText] = useState(recipe.steps.join("\n"));
  const [tags, setTags] = useState((recipe.tags ?? []).join(", "));
  const [servings, setServings] = useState(recipe.servings?.toString() ?? "2");
  const [prepTime, setPrepTime] = useState(recipe.prepTimeMinutes?.toString() ?? "");
  const [cookTime, setCookTime] = useState(recipe.cookTimeMinutes?.toString() ?? "");

  function handleSave() {
    onSave({
      ...recipe,
      title,
      description: description || "",
      ingredients: parseIngredientLines(ingredientsText),
      steps: stepsText.split("\n").map((s) => s.trim()).filter(Boolean),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      servings: parseInt(servings, 10) || 2,
      prepTimeMinutes: prepTime ? parseInt(prepTime, 10) : 0,
      cookTimeMinutes: cookTime ? parseInt(cookTime, 10) : 0,
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-orange-200 bg-white p-4 dark:border-orange-800 dark:bg-zinc-900">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("edit.title_label")}</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("edit.description_label")}</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("edit.prep_time_label")}</label>
          <Input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("edit.cook_time_label")}</label>
          <Input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("edit.servings_label")}</label>
          <Input type="number" value={servings} onChange={(e) => setServings(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("edit.tags_label")}</label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("edit.ingredients_label")}</label>
        <textarea value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)}
          className="w-full min-h-24 rounded-lg border border-zinc-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 dark:border-zinc-700 dark:bg-zinc-800"
          placeholder="200 g de pasta&#10;3 cucharadas de pesto&#10;sal — al gusto" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("edit.steps_label")}</label>
        <textarea value={stepsText} onChange={(e) => setStepsText(e.target.value)}
          className="w-full min-h-24 rounded-lg border border-zinc-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 dark:border-zinc-700 dark:bg-zinc-800"
          placeholder={t("edit.step_placeholder")} />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1">
          <Check className="h-4 w-4" /> {t("create.edit_save")}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
