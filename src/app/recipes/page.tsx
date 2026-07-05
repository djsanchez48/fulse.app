import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecipesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Recipe Collection</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Browse, save, and organize your favorite recipes
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="group cursor-pointer transition-colors hover:border-orange-200 dark:hover:border-orange-800">
            <CardHeader>
              <BookOpen className="h-8 w-8 text-orange-500" />
              <CardTitle className="mt-2">Recipe {i}</CardTitle>
              <CardDescription>
                This is a placeholder recipe card. Connect to your database to display real recipes.
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
