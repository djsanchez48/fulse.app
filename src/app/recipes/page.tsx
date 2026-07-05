"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RecipeListItem } from "@/components/recipes/RecipeListItem";
import { CollectionSheet } from "@/components/recipes/CollectionSheet";
import Link from "next/link";

interface Collection {
  id: string;
  name: string;
  emoji: string | null;
  _count: { recipes: number };
}

interface RecipeItem {
  id: string;
  title: string;
  description: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  tags: string[];
  collections: { collection: { id: string; name: string; emoji: string | null } }[];
}

const TIME_FILTERS = [
  { label: "≤ 15 min", value: "15" },
  { label: "≤ 30 min", value: "30" },
  { label: "≤ 60 min", value: "60" },
];

export default function RecipesPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [bookmarkRecipe, setBookmarkRecipe] = useState<{ id: string; collectionIds: string[] } | null>(null);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (timeFilter) params.set("maxTime", timeFilter);
    if (activeCollection) params.set("collection", activeCollection);

    const res = await fetch(`/api/recipes?${params.toString()}`);
    if (res.ok) setRecipes(await res.json());
    setLoading(false);
  }, [search, timeFilter, activeCollection]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  useEffect(() => {
    fetch("/api/collections")
      .then((r) => r.json())
      .then(setCollections);
  }, []);

  const activeCol = collections.find((c) => c.id === activeCollection);

  async function handleBookmarkSave(collectionIds: string[]) {
    if (!bookmarkRecipe) return;
    await fetch(`/api/recipes/${bookmarkRecipe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionIds }),
    });
    setBookmarkOpen(false);
    loadRecipes();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 pb-24">
      <h1 className="mb-4 text-2xl font-bold">Mis recetas</h1>

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveCollection(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              !activeCollection
                ? "bg-orange-500 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            Todas
          </button>
          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => setActiveCollection(col.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCollection === col.id
                  ? "bg-orange-500 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {col.emoji} {col.name}
              <span className="ml-1 opacity-60">{col._count.recipes}</span>
            </button>
          ))}
          <button
            onClick={async () => {
              const name = prompt("Nombre de la nueva lista:");
              if (name) {
                const res = await fetch("/api/collections", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name }),
                });
                if (res.ok) {
                  const created = await res.json();
                  setCollections((prev) => [...prev, created]);
                  setActiveCollection(created.id);
                }
              }
            }}
            className="shrink-0 rounded-full border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:border-orange-300 hover:text-orange-500 dark:border-zinc-600 dark:text-zinc-400"
          >
            <Plus className="inline h-3 w-3 mr-0.5" />
            Nueva
          </button>
        </div>

        <div className="flex gap-2">
          {TIME_FILTERS.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeFilter(timeFilter === tf.value ? null : tf.value)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                timeFilter === tf.value
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="py-12 text-center">
          <p className="mb-2 text-zinc-500 dark:text-zinc-400">
            {search || activeCollection || timeFilter
              ? "No se encontraron recetas con esos filtros."
              : "Aún no tienes recetas guardadas."}
          </p>
          {!search && !activeCollection && !timeFilter && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <Sparkles className="h-4 w-4" />
                Crear mi primera receta
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {activeCol && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {activeCol.emoji} {activeCol.name} · {recipes.length} recetas
            </p>
          )}
          {recipes.map((recipe) => (
            <div key={recipe.id} className="relative group">
              <RecipeListItem recipe={recipe} />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setBookmarkRecipe({
                    id: recipe.id,
                    collectionIds: recipe.collections.map((rc) => rc.collection.id),
                  });
                  setBookmarkOpen(true);
                }}
                className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-orange-100 hover:text-orange-500 transition-all dark:hover:bg-orange-900/30"
              >
                <BookmarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {bookmarkRecipe && (
        <CollectionSheet
          open={bookmarkOpen}
          onClose={() => setBookmarkOpen(false)}
          selected={bookmarkRecipe.collectionIds}
          onSave={handleBookmarkSave}
        />
      )}
    </div>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}
