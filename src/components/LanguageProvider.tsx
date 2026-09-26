"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Lang } from "@/lib/types";
import { getDict, type Dict } from "@/lib/i18n";

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
}

const LanguageContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "ipsakti-lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Load saved language on mount, then keep <html lang> and localStorage in sync.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? (window.localStorage.getItem(STORAGE_KEY) as Lang | null) : null;
    if (saved) setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }

  return <LanguageContext.Provider value={{ lang, setLang, t: getDict(lang) }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
