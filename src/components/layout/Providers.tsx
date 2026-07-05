"use client";

import { I18nProvider } from "@/lib/i18n-context";
import { Navbar } from "@/components/layout/navbar";
import { useEffect } from "react";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <I18nProvider>
      <Navbar />
      <main className="flex-1">{children}</main>
    </I18nProvider>
  );
}
