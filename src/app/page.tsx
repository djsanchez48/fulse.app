import Link from "next/link";
import { ArrowRight, Sparkles, Search, Calendar, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "AI Recipe Generator",
    description: "Describe what you're craving, and let AI create the perfect recipe for you.",
    icon: Sparkles,
    href: "/ai-generate",
  },
  {
    title: "What's in Your Fridge?",
    description: "List your ingredients and discover recipes you can make right now.",
    icon: Search,
    href: "/ai-generate",
  },
  {
    title: "Meal Planner",
    description: "Plan your week with AI-powered meal suggestions and auto-generated shopping lists.",
    icon: Calendar,
    href: "/meal-planner",
  },
  {
    title: "Recipe Collection",
    description: "Browse, save, and organize your favorite recipes in one place.",
    icon: BookOpen,
    href: "/recipes",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50 to-white px-4 py-24 dark:from-zinc-900 dark:to-zinc-950 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Your AI-Powered
            <span className="text-orange-500"> Kitchen Companion</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Generate recipes from your cravings, discover meals from ingredients you have,
            and plan your weekly menu — all powered by AI.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/ai-generate">
                Try AI Generator <Sparkles className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/recipes">
                Browse Recipes <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href}>
              <Card className="group h-full transition-colors hover:border-orange-200 dark:hover:border-orange-800">
                <CardHeader>
                  <feature.icon className="h-8 w-8 text-orange-500" />
                  <CardTitle className="mt-2">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center text-sm font-medium text-orange-500 group-hover:underline">
                    Get started <ArrowRight className="ml-1 h-3 w-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
