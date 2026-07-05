"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, BookOpen, ChefHat, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Crear", icon: Sparkles },
  { href: "/recipes", label: "Mis recetas", icon: BookOpen },
  { href: "/pantry", label: "Mi nevera", icon: ChefHat, disabled: true, badge: "Próximamente" },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-14 max-w-md items-center justify-center px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-orange-500 text-xl">🍳</span>
            <span>RecepIA</span>
          </Link>
        </div>
      </header>

      <nav className="fixed bottom-0 z-50 w-full border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-md items-center justify-around h-16">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.disabled ? "#" : tab.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors relative",
                  tab.disabled
                    ? "opacity-40 cursor-not-allowed"
                    : isActive
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                )}
                onClick={(e) => tab.disabled && e.preventDefault()}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="absolute -top-0.5 right-1 rounded-full bg-orange-100 px-1 py-0 text-[9px] font-medium text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
