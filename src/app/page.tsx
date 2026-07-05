"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, Loader2, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { CollectionSheet } from "@/components/recipes/CollectionSheet";
import { DraftCard } from "@/components/recipes/DraftCard";
import type { GeneratedRecipe } from "@/types/schemas";

interface DraftItem {
  id: string;
  prompt: string;
  recipeJson: GeneratedRecipe;
  createdAt: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState("");
  const [error, setError] = useState("");

  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const quickPrompts = [
    "Algo rápido con pollo",
    "Pasta cremosa",
    "Ensalada fresca",
    "Desayuno saludable",
    "Sopa reconfortante",
    "Postre sin horno",
  ];

  const loadDrafts = useCallback(async () => {
    const res = await fetch("/api/drafts");
    if (res.ok) {
      const data = await res.json();
      setDrafts(data);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  async function handleGenerate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const content = prompt.trim();
    if (!content && !adjustment.trim()) return;

    setError("");
    setLoading(true);

    const newMessages: Message[] = adjustment.trim()
      ? [...messages, { role: "user", content: adjustment.trim() }]
      : [...messages, { role: "user", content }];

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Error al generar");

      setRecipe(data);
      setDraftId(data.draftId);
      setMessages(newMessages);
      setAdjustment("");
      setPrompt("");
      setSaved(false);
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar la receta");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustment.trim()) return;
    await handleGenerate();
  }

  async function handleSave(collectionIds: string[]) {
    if (!recipe) return;
    setSaving(true);

    const ingredients = recipe.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? null,
      quantityText: ing.quantityText ?? null,
      note: ing.note ?? null,
    }));

    const body: Record<string, unknown> = {
      title: recipe.title,
      description: recipe.description,
      steps: recipe.steps,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      servings: recipe.servings,
      tags: recipe.tags,
      ingredients,
      collectionIds,
    };

    if (draftId) {
      body.draftId = draftId;
    }

    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSaved(true);
      setDraftId(null);
      loadDrafts();
    }

    setSaving(false);
  }

  function viewDraft(draftRecipe: GeneratedRecipe) {
    setRecipe(draftRecipe);
    setDraftId(null);
    setMessages([]);
    setSaved(true);
    setError("");
  }

  function saveDraft(draftRecipe: GeneratedRecipe) {
    setRecipe(draftRecipe);
    setSheetOpen(true);
  }

  function handleDraftDelete(deletedId: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== deletedId));
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 pb-24">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">
        ¿Qué quieres cocinar hoy?
      </h1>
      <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">
        Describí lo que se te antoje y la IA te dará una receta completa.
      </p>

      <form onSubmit={handleGenerate} className="space-y-3 mb-6">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='"Una pasta cremosa con champiñones", "Algo con lo que tenga en la nevera"...'
          className="w-full min-h-24 rounded-xl border border-zinc-200 bg-white p-4 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-600"
        />

        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setPrompt(q)}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:border-orange-300 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-400"
            >
              {q}
            </button>
          ))}
        </div>

        <Button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="w-full h-11"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando receta...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generar receta
            </>
          )}
        </Button>
      </form>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {recipe && (
        <div className="mb-6 space-y-4">
          <RecipeCard
            recipe={recipe}
            onSave={() => setSheetOpen(true)}
            saving={saving}
          />

          {saved && (
            <p className="text-center text-sm text-green-600 dark:text-green-400">
              ¡Receta guardada!
            </p>
          )}

          {!saved && (
            <form onSubmit={handleAdjust} className="flex gap-2">
              <input
                type="text"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                placeholder="Ajústala: ej. sin horno, más picante..."
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:border-zinc-800 dark:bg-zinc-900 dark:placeholder:text-zinc-600"
              />
              <Button
                type="submit"
                size="sm"
                disabled={loading || !adjustment.trim()}
                className="shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="h-4 w-4" />
                )}
              </Button>
            </form>
          )}
        </div>
      )}

      {drafts.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Recientes</h2>
          <div className="space-y-2">
            {drafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onView={viewDraft}
                onSave={saveDraft}
                onDelete={handleDraftDelete}
              />
            ))}
          </div>
        </section>
      )}

      <CollectionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        selected={[]}
        onSave={handleSave}
      />
    </div>
  );
}
