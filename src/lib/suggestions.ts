import type { Goal } from "@/lib/nutrition/targets";

type MealTime = "breakfast" | "lunch" | "snack" | "dinner" | "late";

const MEAL_SUGGESTIONS: Record<MealTime, string[]> = {
  breakfast: [
    "Desayuno rápido y nutritivo",
    "Huevos revueltos con vegetales",
    "Smoothie bowl de frutas",
    "Tostadas con aguacate",
    "Pancakes saludables",
    "Granola con yogur",
  ],
  lunch: [
    "Almuerzo ligero en 15 minutos",
    "Ensalada fresca con proteína",
    "Wrap de pollo y vegetales",
    "Bowl de quinoa y vegetales",
    "Pasta integral con verduras",
    "Sopa casera reconfortante",
  ],
  snack: [
    "Snack saludable y rápido",
    "Galletas de avena caseras",
    "Hummus con vegetales",
    "Batido de frutas natural",
    "Mix de frutos secos",
  ],
  dinner: [
    "Cena ligera y reconfortante",
    "Pescado al horno con vegetales",
    "Tortilla de vegetales",
    "Sopa cremosa de verduras",
    "Salteado de pollo y vegetales",
    "Bowls de vegetales asados",
  ],
  late: [
    "Antojo de medianoche",
    "Algo rápido y sabroso",
    "Snack sin encender el horno",
    "Postre casero fácil",
  ],
};

const GOAL_SUGGESTIONS: Partial<Record<Goal, string[]>> = {
  bajar_peso: [
    "Ensalada ligera con proteína",
    "Wrap saludable bajo en calorías",
    "Bowl de vegetales y quinoa",
    "Pescado blanco al vapor",
  ],
  ganar_musculo: [
    "Bowl de proteína y arroz",
    "Pollo con batata y vegetales",
    "Batido proteico casero",
    "Huevos con aguacate y pan integral",
  ],
  mas_saludable: [
    "Tazón verde con granos",
    "Pescado al horno con hierbas",
    "Smoothie bowl de frutas",
    "Ensalada tibia de vegetales",
  ],
  mas_proteina: [
    "Huevos revueltos con queso",
    "Pollo a la plancha con vegetales",
    "Tazón de lentejas y quinoa",
    "Tofu salteado con verduras",
  ],
  mas_vegetales: [
    "Buddha bowl de vegetales",
    "Curry de garbanzos y espinaca",
    "Salteado de verduras variadas",
    "Ensalada arcoíris con granos",
  ],
};

export function getMealTime(): MealTime {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 18) return "snack";
  if (hour >= 18 && hour < 22) return "dinner";
  return "late";
}

export function getSmartSuggestions(goals: Goal[], lang?: string): string[] {
  const mealTime = getMealTime();
  const suggestions = [...MEAL_SUGGESTIONS[mealTime]];

  for (const goal of goals) {
    const goalSugs = GOAL_SUGGESTIONS[goal];
    if (goalSugs) {
      for (const s of goalSugs) {
        if (!suggestions.includes(s)) suggestions.push(s);
      }
    }
  }

  return suggestions.slice(0, 6);
}
