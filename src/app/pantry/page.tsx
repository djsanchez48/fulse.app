"use client";

import { useState } from "react";
import { Camera, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { CollectionSheet } from "@/components/recipes/CollectionSheet";
import { useI18n } from "@/lib/i18n-context";
import type { GeneratedRecipe } from "@/types/schemas";

export default function PantryPage() {
  const { t } = useI18n();
  const [image, setImage] = useState<string | null>(null);
  const [detected, setDetected] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImage(reader.result as string); setDetected([]); setRecipe(null); setSaved(false); };
    reader.readAsDataURL(file);
  }

  function removeImage() { setImage(null); setDetected([]); setRecipe(null); }

  async function detectIngredients() {
    if (!image) return;
    setDetecting(true); setError("");
    try {
      const base64 = image.split(",")[1];
      const res = await fetch("/api/ai/vision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: base64 }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDetected(data.ingredients);
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setDetecting(false); }
  }

  async function generateFromIngredients() {
    if (detected.length === 0) return;
    setGenerating(true); setError("");
    try {
      const prompt = `${t("card.ingredients")}: ${detected.join(", ")}.`;
      const res = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: `Puedo hacer una receta con: ${detected.join(", ")}. Dame una receta completa.` }] }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecipe(data); setSaved(false);
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setGenerating(false); }
  }

  async function handleSave(collectionIds: string[]) {
    if (!recipe) return; setSaving(true);
    const ingredients = recipe.ingredients.map((ing) => ({ name: ing.name, quantity: ing.quantity ?? null, unit: ing.unit ?? null, quantityText: ing.quantityText ?? null, note: ing.note ?? null }));
    const body: Record<string, unknown> = { title: recipe.title, description: recipe.description, steps: recipe.steps, prepTimeMinutes: recipe.prepTimeMinutes, cookTimeMinutes: recipe.cookTimeMinutes, servings: recipe.servings, tags: recipe.tags, ingredients, collectionIds };
    const res = await fetch("/api/recipes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) setSaved(true);
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 pb-24">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">{t("pantry.title")}</h1>
      <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">{t("pantry.subtitle")}</p>
      <div className="mb-6">
        {!image ? (
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 p-10 hover:border-orange-300 dark:border-zinc-700 dark:hover:border-orange-600">
            <Camera className="h-10 w-10 text-zinc-400" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{t("pantry.upload_hint")}</span>
            <input type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          </label>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden">
              <img src={image} alt="Ingredients" className="w-full h-56 object-cover" />
              <button onClick={removeImage} className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"><X className="h-4 w-4" /></button>
            </div>
            {!detected.length && (
              <Button onClick={detectIngredients} disabled={detecting} className="w-full">
                {detecting ? <><Loader2 className="h-4 w-4 animate-spin" />{t("pantry.detecting")}</> : <><Camera className="h-4 w-4" />{t("pantry.detect")}</>}
              </Button>
            )}
            {detected.length > 0 && (
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">{t("pantry.detected")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detected.map((ing) => <span key={ing} className="rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">{ing}</span>)}
                  </div>
                </div>
                {!recipe && (
                  <Button onClick={generateFromIngredients} disabled={generating} className="w-full">
                    {generating ? <><Loader2 className="h-4 w-4 animate-spin" />{t("create.generating")}</> : <><Sparkles className="h-4 w-4" />{t("create.generate")}</>}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">{error}</div>}
      {recipe && (
        <div className="space-y-4">
          <RecipeCard recipe={recipe} onSave={() => setSheetOpen(true)} saving={saving} />
          {saved && <p className="text-center text-sm text-green-600 dark:text-green-400">{t("create.saved")}</p>}
        </div>
      )}
      <CollectionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} selected={[]} onSave={handleSave} />
    </div>
  );
}
