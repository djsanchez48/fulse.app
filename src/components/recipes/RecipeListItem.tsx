"use client";

import { Clock, Bookmark } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface RecipeListItemProps {
  recipe: {
    id: string;
    title: string;
    description: string | null;
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    tags: string[];
    collections: { collection: { id: string; name: string; emoji: string | null } }[];
  };
}

export function RecipeListItem({ recipe }: RecipeListItemProps) {
  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="group transition-colors hover:border-orange-200 dark:hover:border-orange-800">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate">{recipe.title}</h3>
              {recipe.description && (
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {recipe.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {totalTime > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                    <Clock className="h-3 w-3" /> {totalTime} min
                  </span>
                )}
                {recipe.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {recipe.collections.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {recipe.collections.map((rc) => (
                    <span
                      key={rc.collection.id}
                      className="text-xs text-zinc-400 dark:text-zinc-500"
                    >
                      {rc.collection.emoji} {rc.collection.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity dark:text-zinc-600" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
