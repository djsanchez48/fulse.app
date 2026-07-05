"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useInsertionEffect,
  type ReactNode,
} from "react";
import { type Lang } from "@/lib/i18n";
import { translations } from "@/lib/i18n";

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "es",
  setLang: () => {},
  t: (key) => key,
});

function translate(lang: Lang, key: string): string {
  const dict = translations[lang] as Record<string, string>;
  const esDict = translations["es"] as Record<string, string>;
  return dict[key] ?? esDict[key] ?? key;
}

function detectLang(): Lang {
  if (typeof window === "undefined") return "es";
  const stored = localStorage.getItem("recepia-lang") as Lang | null;
  if (stored === "es" || stored === "en") return stored;
  return navigator.language?.slice(0, 2) === "es" ? "es" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useInsertionEffect(() => {
    const detected = detectLang();
    if (detected !== "es") setLangState(detected);
  }, []);

  const handleSetLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("recepia-lang", l);
  };

  const t = (key: string): string => translate(lang, key);

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
