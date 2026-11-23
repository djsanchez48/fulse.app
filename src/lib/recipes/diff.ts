import { normalizeIngredientName } from "./edit";

export interface DiffIngrediente {
  nombre: string;
  quantity: number | null;
  unit: string | null;
  quantityText: string | null;
  note: string | null;
}

export interface RecipeComparable {
  title: string;
  description: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  tags: string[];
  steps: string[];
  ingredients: DiffIngrediente[];
}

export type TipoCambio = "agregado" | "eliminado" | "modificado";

export interface CambioCampo { campo: string; antes: string; despues: string }
export interface CambioPaso { tipo: TipoCambio; numero: number; antes?: string; despues?: string }
export interface CambioIngrediente { tipo: TipoCambio; nombre: string; antes?: string; despues?: string }

export interface RecipeDiff {
  campos: CambioCampo[];
  pasos: CambioPaso[];
  ingredientes: CambioIngrediente[];
  sinCambios: boolean;
}

function texto(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function describirIngrediente(i: DiffIngrediente): string {
  if (i.quantity != null) return `${i.quantity}${i.unit ? ` ${i.unit}` : ""}${i.note ? ` (${i.note})` : ""}`;
  if (i.quantityText) return `${i.quantityText}${i.note ? ` (${i.note})` : ""}`;
  return i.note ? `(${i.note})` : "—";
}

/**
 * Compara la receta actual contra la propuesta por la IA, para mostrarla antes
 * de guardar. Sin esto se pisaria a ciegas una receta ya afinada a mano —y que
 * ademas puede estar publicada por link—.
 *
 * Los pasos se emparejan por posicion: cubre bien el caso dominante (la IA
 * reescribe pasos manteniendo el orden). Si inserta uno en el medio, los
 * siguientes se veran como "modificado"; el texto final que se muestra sigue
 * siendo correcto, solo es mas ruidoso.
 */
export function diffRecipes(actual: RecipeComparable, propuesta: RecipeComparable): RecipeDiff {
  const campos: CambioCampo[] = [];

  const escalares: [string, unknown, unknown][] = [
    ["Título", actual.title, propuesta.title],
    ["Descripción", actual.description, propuesta.description],
    ["Preparación (min)", actual.prepTimeMinutes, propuesta.prepTimeMinutes],
    ["Cocción (min)", actual.cookTimeMinutes, propuesta.cookTimeMinutes],
    ["Porciones", actual.servings, propuesta.servings],
    ["Tags", actual.tags.join(", "), propuesta.tags.join(", ")],
  ];

  for (const [campo, antes, despues] of escalares) {
    const a = texto(antes as string | number | null);
    const d = texto(despues as string | number | null);
    if (a !== d) campos.push({ campo, antes: a, despues: d });
  }

  const pasos: CambioPaso[] = [];
  const maxPasos = Math.max(actual.steps.length, propuesta.steps.length);
  for (let i = 0; i < maxPasos; i++) {
    const antes = actual.steps[i];
    const despues = propuesta.steps[i];
    if (antes === despues) continue;
    if (antes === undefined) pasos.push({ tipo: "agregado", numero: i + 1, despues });
    else if (despues === undefined) pasos.push({ tipo: "eliminado", numero: i + 1, antes });
    else pasos.push({ tipo: "modificado", numero: i + 1, antes, despues });
  }

  // Los ingredientes se emparejan por nombre normalizado: el nombre es su identidad.
  const ingredientes: CambioIngrediente[] = [];
  const porNombreActual = new Map(actual.ingredients.map((i) => [normalizeIngredientName(i.nombre), i]));
  const porNombrePropuesta = new Map(propuesta.ingredients.map((i) => [normalizeIngredientName(i.nombre), i]));

  for (const [clave, prop] of porNombrePropuesta) {
    const act = porNombreActual.get(clave);
    if (!act) {
      ingredientes.push({ tipo: "agregado", nombre: prop.nombre, despues: describirIngrediente(prop) });
    } else {
      const a = describirIngrediente(act);
      const d = describirIngrediente(prop);
      if (a !== d) ingredientes.push({ tipo: "modificado", nombre: prop.nombre, antes: a, despues: d });
    }
  }

  for (const [clave, act] of porNombreActual) {
    if (!porNombrePropuesta.has(clave)) {
      ingredientes.push({ tipo: "eliminado", nombre: act.nombre, antes: describirIngrediente(act) });
    }
  }

  return {
    campos,
    pasos,
    ingredientes,
    sinCambios: campos.length === 0 && pasos.length === 0 && ingredientes.length === 0,
  };
}
