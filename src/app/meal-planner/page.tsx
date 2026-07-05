import { Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function MealPlannerPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Meal Planner</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Plan your week with AI-powered meal suggestions
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {days.map((day) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle className="text-base">{day}</CardTitle>
              <CardDescription>No meals planned yet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {["Breakfast", "Lunch", "Dinner"].map((meal) => (
                <div
                  key={meal}
                  className="rounded-md border border-dashed border-zinc-200 p-2 text-center text-xs text-zinc-400 dark:border-zinc-800"
                >
                  {meal}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
