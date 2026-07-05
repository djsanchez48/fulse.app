import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <UtensilsCrossed className="h-6 w-6 text-orange-500" />
          <span>RecepIA</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/recipes" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
            Recipes
          </Link>
          <Link href="/meal-planner" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
            Meal Planner
          </Link>
          <Button variant="default" size="sm" asChild>
            <Link href="/ai-generate">AI Generate</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
