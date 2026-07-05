"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, BookOpen, ChefHat, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

export function Navbar() {
  const { t } = useI18n();
  const pathname = usePathname();

  const navTabs = [
    { href: "/", label: t("nav.create"), icon: Sparkles },
    { href: "/recipes", label: t("nav.recipes"), icon: BookOpen },
    { href: "/pantry", label: t("nav.pantry"), icon: ChefHat },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 content-container items-center justify-center px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-orange-500 text-xl">🍳</span>
            <span>{t("app.title")}</span>
          </Link>
        </div>
      </header>

      <nav className="fixed bottom-0 z-50 w-full border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex content-container items-center justify-around h-16">
          {navTabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
