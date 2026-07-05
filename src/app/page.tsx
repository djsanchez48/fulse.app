"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    "Algo rápido con pollo",
    "Pasta cremosa",
    "Ensalada fresca",
    "Desayuno saludable",
  ];

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    // TODO: Step 2 — call /api/ai/generate
    setTimeout(() => setLoading(false), 1000);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8 pb-24">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">
        ¿Qué quieres cocinar hoy?
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Describe lo que se te antoje y la IA te dará una receta completa.
      </p>

      <form onSubmit={handleGenerate} className="space-y-3">
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

        <Button type="submit" disabled={loading || !prompt.trim()} className="w-full h-12">
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

      {/* Result will appear here in Step 4 */}
    </div>
  );
}
