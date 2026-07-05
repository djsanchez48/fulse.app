export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface RecipeData {
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  cuisine: string;
  tips?: string[];
}

export interface MealPlanData {
  weekStart: string;
  meals: {
    dayOfWeek: number;
    mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "DESSERT";
    recipe: RecipeData;
  }[];
}

export interface IngredientSuggestion {
  title: string;
  description: string;
  missingIngredients: string[];
  difficulty: string;
  estimatedTime: number;
}
