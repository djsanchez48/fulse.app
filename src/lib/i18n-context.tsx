"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { type Lang, t as translate } from "@/lib/i18n";

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Parameters<typeof translate>[1]) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "es",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
    const stored = localStorage.getItem("recepia-lang") as Lang | null;
    if (stored === "es" || stored === "en") setLang(stored);
    else {
      const browserLang = navigator.language?.slice(0, 2);
      if (browserLang === "es") setLang("es");
      else setLang("en");
    }
  }, []);

  const handleSetLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("recepia-lang", l);
  };

  return (
    <I18nContext.Provider
      value={{ lang, setLang: handleSetLang, t: (key) => translate(lang, key) }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
