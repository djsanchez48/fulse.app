"use client";

import { useState } from "react";
import { Trash2, Bookmark, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-context";
import type { GeneratedRecipe } from "@/types/schemas";

interface DraftCardProps {
  draft: { id: string; prompt: string; recipeJson: GeneratedRecipe; createdAt: string };
  onDelete: (id: string) => void;
  onView: (recipe: GeneratedRecipe) => void;
  onSave: (recipe: GeneratedRecipe) => void;
}

export function DraftCard({ draft, onDelete, onView, onSave }: DraftCardProps) {
  const { t } = useI18n();
  const [deleting, setDeleting] = useState(false);

  return (
    <Card className="group transition-colors hover:border-orange-200 dark:hover:border-orange-800">
      <CardContent className="flex items-center justify-between p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{draft.recipeJson.title || t("draft.untitled")}</p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            &quot;{draft.prompt}&quot; · {new Date(draft.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
          </p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onView(draft.recipeJson)} className="rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800" title={t("draft.view")}><Eye className="h-4 w-4" /></button>
          <button onClick={() => onSave(draft.recipeJson)} className="rounded p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30" title={t("draft.save")}><Bookmark className="h-4 w-4 text-orange-500" /></button>
          <button onClick={async () => { setDeleting(true); await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" }); onDelete(draft.id); setDeleting(false); }}
            disabled={deleting} className="rounded p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30" title={t("draft.discard")}><Trash2 className="h-4 w-4 text-red-500" /></button>
        </div>
      </CardContent>
    </Card>
  );
}
