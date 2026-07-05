"use client";

import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";
import type { GeneratedRecipe } from "@/types/schemas";

interface RecipeCardProps {
  recipe: GeneratedRecipe;
  onSave: () => void;
  saving?: boolean;
}

export function RecipeCard({ recipe, onSave, saving }: RecipeCardProps) {
  const { t } = useI18n();
  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  return (
    <Card className="overflow-hidden border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-bold leading-tight">{recipe.title}</h2>
          {recipe.servings && (
            <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              {recipe.servings} {recipe.servings === 1 ? t("card.portion") : t("card.portions")}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{recipe.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {totalTime > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
              <Clock className="h-3 w-3" /> {totalTime} {t("card.minutes")}
            </span>
          )}
          {recipe.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">{tag}</span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="mb-2 text-sm font-semibold">{t("card.ingredients")}</h3>
          <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-baseline gap-1">
                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                <span>
                  {ing.quantity != null && ing.unit ? `${ing.quantity} ${ing.unit} de ` : ing.quantity != null ? `${ing.quantity} ` : ing.quantityText ? `${ing.quantityText} de ` : ""}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{ing.name}</span>
                  {ing.note && <span className="text-zinc-400 dark:text-zinc-500"> ({ing.note})</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">{t("card.preparation")}</h3>
          <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-bold text-orange-500">{i + 1}.</span><span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        {onSave && (
          <Button onClick={onSave} disabled={saving} className="w-full" variant="default">
            {saving ? t("card.saving") : t("card.save")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
