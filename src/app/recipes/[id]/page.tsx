"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Clock, Minus, Plus, Trash2, ChefHat, Pencil, Share, Bookmark, Link as LinkIcon, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollectionSheet } from "@/components/recipes/CollectionSheet";
import { InlineRecipeEditor } from "@/components/recipes/InlineRecipeEditor";
import { useI18n } from "@/lib/i18n-context";
import { formatScaledQuantity } from "@/lib/recipes/share";
import type { RecipeDiff, RecipeComparable } from "@/lib/recipes/diff";
import type { GeneratedRecipe } from "@/types/schemas";

interface IngredientDetail {
  ingredientId: string; quantity: number | null; unit: string | null;
  quantityText: string | null; note: string | null;
  ingredient: { id: string; name: string };
}

interface RecipeDetail {
  id: string; title: string; description: string | null; steps: string[];
  prepTimeMinutes: number | null; cookTimeMinutes: number | null;
  servings: number | null; tags: string[]; ingredients: IngredientDetail[];
  collections: { collection: { id: string; name: string; emoji: string | null } }[];
  cookedCount: number; lastCookedAt: string | null;
  shareToken: string | null;
}

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useI18n();

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(2);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [cookCount, setCookCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [shareMsg, setShareMsg] = useState("");
  const [shareUrlState, setShareUrlState] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [confirmShare, setConfirmShare] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiDiff, setAiDiff] = useState<RecipeDiff | null>(null);
  const [aiPropuesta, setAiPropuesta] = useState<RecipeComparable | null>(null);
  const [aiCompartida, setAiCompartida] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${id}`).then((r) => r.json()).then((data) => {
      setRecipe(data); setServings(data.servings ?? 2); setCookCount(data.cookedCount ?? 0);
      setShareUrlState(data.shareToken ? `${window.location.origin}/r/${data.shareToken}` : null);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    async function requestWakeLock() {
      try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch {}
    }
    requestWakeLock();
    return () => { if (wakeLock) wakeLock.release().catch(() => {}); };
  }, []);

  const factor = recipe?.servings ? servings / recipe.servings : 1;

  // Misma funcion que arma el texto a compartir: si divergen, lo compartido deja
  // de coincidir con lo que el usuario ve en pantalla.
  function formatQuantity(ing: IngredientDetail): string {
    return formatScaledQuantity(ing, factor);
  }

  function toggleCheck(ingredientId: string) {
    setChecked((prev) => { const next = new Set(prev); if (next.has(ingredientId)) next.delete(ingredientId); else next.add(ingredientId); return next; });
  }

  const handleSaveCollections = useCallback(async (collectionIds: string[]) => {
    if (!recipe) return;
    await fetch(`/api/recipes/${recipe.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collectionIds }) });
    const res = await fetch(`/api/recipes/${recipe.id}`);
    if (res.ok) setRecipe(await res.json());
  }, [recipe]);

  async function handleDelete() {
    if (!recipe) return;
    setDeleting(true);
    await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    router.push("/recipes");
  }

  function toEditable(r: RecipeDetail): GeneratedRecipe {
    return {
      title: r.title,
      description: r.description ?? "",
      prepTimeMinutes: r.prepTimeMinutes ?? 0,
      cookTimeMinutes: r.cookTimeMinutes ?? 0,
      servings: r.servings ?? 2,
      tags: r.tags ?? [],
      steps: r.steps,
      ingredients: r.ingredients.map((ri) => ({
        name: ri.ingredient.name,
        quantity: ri.quantity,
        unit: ri.unit,
        quantityText: ri.quantityText,
        note: ri.note,
      })),
    };
  }

  async function handleEditSave(edited: GeneratedRecipe) {
    setSaveState("saving");
    const res = await fetch(`/api/recipes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: edited.title,
        description: edited.description || null,
        steps: edited.steps,
        prepTimeMinutes: edited.prepTimeMinutes,
        cookTimeMinutes: edited.cookTimeMinutes,
        servings: edited.servings,
        tags: edited.tags,
        ingredients: edited.ingredients,
      }),
    });

    if (!res.ok) {
      setSaveState("error");
      return;
    }

    const updated: RecipeDetail = await res.json();
    setRecipe(updated);
    setServings(updated.servings ?? 2);
    setChecked(new Set());
    setEditing(false);
    setSaveState("idle");
  }

  async function pedirAjusteIA() {
    if (!recipe || !aiPrompt.trim()) return;
    setAiLoading(true); setAiError(""); setAiDiff(null); setAiPropuesta(null);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error ?? t("ai_edit.error")); return; }
      setAiDiff(data.diff);
      setAiPropuesta(data.propuesta);
      setAiCompartida(!!data.compartida);
    } catch {
      setAiError(t("ai_edit.error"));
    } finally {
      setAiLoading(false);
    }
  }

  // Aplicar reutiliza el PATCH que ya existe: el endpoint de IA solo propone.
  async function aplicarAjusteIA() {
    if (!aiPropuesta) return;
    await handleEditSave({
      title: aiPropuesta.title,
      description: aiPropuesta.description ?? "",
      prepTimeMinutes: aiPropuesta.prepTimeMinutes ?? 0,
      cookTimeMinutes: aiPropuesta.cookTimeMinutes ?? 0,
      servings: aiPropuesta.servings ?? 2,
      tags: aiPropuesta.tags,
      steps: aiPropuesta.steps,
      ingredients: aiPropuesta.ingredients.map((i) => ({
        name: i.nombre, quantity: i.quantity, unit: i.unit,
        quantityText: i.quantityText, note: i.note,
      })),
    } as GeneratedRecipe);
    descartarAjusteIA();
  }

  function descartarAjusteIA() {
    setAiDiff(null); setAiPropuesta(null); setAiPrompt(""); setAiError("");
  }

  /** Comparte el link. Asume que ya existe o acaba de crearse. */
  async function compartirUrl(url: string) {
    setShareMsg("");
    if (!recipe) return;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: recipe.title, url });
        return;
      } catch (e) {
        // Cancelar la hoja nativa no es un error.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareMsg(t("share.copied"));
    } catch {
      setShareMsg(t("share.failed"));
    }
  }

  async function crearLink(): Promise<string | null> {
    if (!recipe) return null;
    setSharing(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/share`, { method: "POST" });
      if (!res.ok) { setShareMsg(t("share.failed")); return null; }
      const data = await res.json();
      setShareUrlState(data.url);
      return data.url as string;
    } finally {
      setSharing(false);
    }
  }

  // Compartir ES publicar: si aun no hay link, se pide confirmacion explicita
  // una sola vez por receta. Repetirla en cada compartida la volveria ruido.
  async function handleShare() {
    if (shareUrlState) { await compartirUrl(shareUrlState); return; }
    setConfirmShare(true);
  }

  async function confirmarYCompartir() {
    setConfirmShare(false);
    const url = await crearLink();
    if (url) await compartirUrl(url);
  }

  async function revocarLink() {
    if (!recipe) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/share`, { method: "DELETE" });
      if (res.ok) { setShareUrlState(null); setShareMsg(t("share.revoked")); }
      else setShareMsg(t("share.failed"));
    } finally {
      setSharing(false);
    }
  }

  async function handleCook() {
    if (!recipe) return;
    setCooking(true);
    const res = await fetch(`/api/recipes/${recipe.id}/cook`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setCookCount(data.cookedCount);
    }
    setCooking(false);
  }

  if (loading) return <div className="mx-auto max-w-xl px-4 py-6 pb-24"><div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}</div></div>;
  if (!recipe) return <div className="mx-auto max-w-xl px-4 py-6 pb-24 text-center"><p className="text-zinc-500">{t("detail.not_found")}</p></div>;

  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  if (editing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6 pb-24">
        <InlineRecipeEditor
          recipe={toEditable(recipe)}
          onSave={handleEditSave}
          onCancel={() => { setEditing(false); setSaveState("idle"); }}
          t={t}
        />
        {/* Ajuste con IA: segunda forma de editar, misma puerta de entrada. */}
        <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-sm font-medium">{t("ai_edit.title")}</span>
          </div>

          {!aiDiff && (
            <>
              <div className="flex gap-2">
                <Input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={t("ai_edit.placeholder")} disabled={aiLoading}
                  onKeyDown={(e) => { if (e.key === "Enter") pedirAjusteIA(); }} />
                <Button size="sm" onClick={pedirAjusteIA} disabled={aiLoading || !aiPrompt.trim()}>
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("ai_edit.cta")}
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">{t("ai_edit.hint")}</p>
            </>
          )}

          {aiError && <p className="mt-2 text-xs text-red-500">{aiError}</p>}

          {/* El diff: nunca se guarda sin que lo veas. */}
          {aiDiff && (
            <div className="space-y-3 text-xs">
              {aiCompartida && (
                <p className="rounded-lg bg-orange-50 p-2 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                  {t("ai_edit.shared_warning")}
                </p>
              )}

              {aiDiff.sinCambios && <p className="text-zinc-500">{t("ai_edit.no_changes")}</p>}

              {aiDiff.campos.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">{t("ai_edit.fields")}</p>
                  {aiDiff.campos.map((c) => (
                    <p key={c.campo} className="text-zinc-600 dark:text-zinc-400">
                      {c.campo}: <span className="line-through opacity-60">{c.antes}</span> → <span className="text-zinc-900 dark:text-zinc-100">{c.despues}</span>
                    </p>
                  ))}
                </div>
              )}

              {aiDiff.ingredientes.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">{t("ai_edit.ingredients")}</p>
                  {aiDiff.ingredientes.map((i, k) => (
                    <p key={k} className="text-zinc-600 dark:text-zinc-400">
                      {i.tipo === "agregado" && <span className="text-green-600 dark:text-green-400">+ {i.nombre} ({i.despues})</span>}
                      {i.tipo === "eliminado" && <span className="text-red-600 dark:text-red-400">− {i.nombre}</span>}
                      {i.tipo === "modificado" && <>{i.nombre}: <span className="line-through opacity-60">{i.antes}</span> → <span className="text-zinc-900 dark:text-zinc-100">{i.despues}</span></>}
                    </p>
                  ))}
                </div>
              )}

              {aiDiff.pasos.length > 0 && (
                <div>
                  <p className="mb-1 font-medium">{t("ai_edit.steps")}</p>
                  {aiDiff.pasos.map((p, k) => (
                    <div key={k} className="mb-1.5 text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium">#{p.numero} </span>
                      {p.tipo === "agregado" && <span className="text-green-600 dark:text-green-400">+ {p.despues}</span>}
                      {p.tipo === "eliminado" && <span className="text-red-600 dark:text-red-400 line-through">{p.antes}</span>}
                      {p.tipo === "modificado" && (
                        <><span className="block line-through opacity-60">{p.antes}</span><span className="block text-zinc-900 dark:text-zinc-100">{p.despues}</span></>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1" onClick={aplicarAjusteIA} disabled={aiDiff.sinCambios || saveState === "saving"}>
                  {t("ai_edit.apply")}
                </Button>
                <Button size="sm" variant="outline" onClick={descartarAjusteIA}>{t("ai_edit.discard")}</Button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{t("edit.nutrition_reset")}</p>
        {saveState === "saving" && <p className="mt-2 text-xs text-zinc-400">{t("edit.saving")}</p>}
        {saveState === "error" && <p className="mt-2 text-xs text-red-500">{t("edit.error")}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6 pb-24">
      <h1 className="text-xl font-bold leading-tight">{recipe.title}</h1>
      {recipe.description && <p className="mt-1 text-zinc-500 dark:text-zinc-400">{recipe.description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {recipe.tags?.map((tag) => <span key={tag} className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">{tag}</span>)}
        {totalTime > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"><Clock className="h-3 w-3" /> {totalTime} {t("card.minutes")}</span>}
        {recipe.collections.map((rc) => <span key={rc.collection.id} className="text-xs text-zinc-400 dark:text-zinc-500">{rc.collection.emoji} {rc.collection.name}</span>)}
      </div>

      {recipe.servings && (
        <>
          <div className="mt-6 flex items-center justify-center gap-4">
            <button onClick={() => setServings((s) => Math.max(1, s - 1))} disabled={servings <= 1} className="rounded-full border border-zinc-300 p-2 disabled:opacity-30 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"><Minus className="h-4 w-4" /></button>
            <span className="text-lg font-semibold tabular-nums">{servings} {servings === 1 ? t("detail.portion") : t("detail.portions")}</span>
            <button onClick={() => setServings((s) => s + 1)} className="rounded-full border border-zinc-300 p-2 hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={handleCook} disabled={cooking} className="gap-1.5">
              <ChefHat className="h-4 w-4" />
              {t("recipe.cooked_this")}{cookCount > 0 ? ` (${cookCount})` : ""}
            </Button>
          </div>
        </>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold">{t("detail.ingredients")}</h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((ing) => {
            const quantity = formatQuantity(ing);
            const isChecked = checked.has(ing.ingredientId);
            return (
              <li key={ing.ingredientId} className="flex items-start gap-3">
                <button onClick={() => toggleCheck(ing.ingredientId)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isChecked ? "border-orange-500 bg-orange-500 text-white" : "border-zinc-300 dark:border-zinc-600"}`}>
                  {isChecked && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3"><path d="M20 6 9 17l-5-5" /></svg>}
                </button>
                <span className={`text-sm ${isChecked ? "line-through text-zinc-300 dark:text-zinc-600" : "text-zinc-700 dark:text-zinc-300"}`}>
                  {quantity && <span className="font-medium">{quantity} </span>}{quantity ? `de ` : ""}{ing.ingredient.name}{ing.note && <span className="text-zinc-400 dark:text-zinc-500"> ({ing.note})</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold">{t("detail.preparation")}</h2>
        <ol className="space-y-4">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600 dark:bg-orange-900 dark:text-orange-400">{i + 1}</span>
              <span className="pt-0.5 text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" onClick={() => setSheetOpen(true)} aria-label={t("detail.save")} title={t("detail.save")} className="flex-1">
          <Bookmark className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => setEditing(true)} aria-label={t("detail.edit")} title={t("detail.edit")} className="flex-1">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={handleShare} disabled={sharing} aria-label={t("detail.share")} title={t("detail.share")} className="flex-1">
          <Share className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => { if (confirm(t("detail.delete_confirm"))) handleDelete(); }} disabled={deleting} aria-label={t("detail.delete")} title={t("detail.delete")} className="flex-1">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {shareMsg && <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">{shareMsg}</p>}

      {/* Confirmacion la primera vez: compartir esta receta la hace publica. */}
      {confirmShare && (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/60 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
          <p className="text-sm font-medium">{t("share.confirm_title")}</p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{t("share.confirm_body")}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={confirmarYCompartir} disabled={sharing} className="flex-1">
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : t("share.confirm_cta")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmShare(false)}>
              {t("share.cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* Link activo: verlo, copiarlo y poder revocarlo. Sin esto, revocar seria
          una funcion que existe pero no se puede usar. */}
      {shareUrlState && !confirmShare && (
        <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{shareUrlState}</span>
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">{t("share.public_notice")}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs"
              onClick={async () => { await navigator.clipboard.writeText(shareUrlState); setShareMsg(t("share.copied")); }}>
              {t("share.copy")}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={crearLink} disabled={sharing}>
              {t("share.regenerate")}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs text-red-600 dark:text-red-400"
              onClick={revocarLink} disabled={sharing}>
              {t("share.revoke")}
            </Button>
          </div>
        </div>
      )}

      {recipe && <CollectionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} selected={recipe.collections.map((rc) => rc.collection.id)} onSave={handleSaveCollections} />}
    </div>
  );
}
