"use client";

import { I18nProvider } from "@/lib/i18n-context";
import { Navbar } from "@/components/layout/navbar";
import { AuthGuard } from "@/components/layout/AuthGuard";
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
      <AuthGuard>
        <Navbar />
        <main className="flex-1">{children}</main>
      </AuthGuard>
    </I18nProvider>
  );
}
