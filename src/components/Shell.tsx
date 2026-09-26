"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MessageSquare, ListChecks, ShieldCheck, Library, Info, Leaf, Moon, Sun, Menu, X, Languages } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "./ThemeProvider";
import { useLanguage } from "./LanguageProvider";
import { LANGUAGES } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { dark, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const NAV = [
    { href: "/chat", label: t.nav.ask, icon: MessageSquare },
    { href: "/classify", label: t.nav.classify, icon: ListChecks },
    { href: "/abs", label: t.nav.abs, icon: ShieldCheck },
    { href: "/sources", label: t.nav.sources, icon: Library },
    { href: "/about", label: t.nav.about, icon: Info },
  ];

  function LangSelect({ compact }: { compact?: boolean }) {
    return (
      <div className="relative">
        <Languages className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as Lang)}
          className={clsx(
            "appearance-none pl-8 pr-3 py-2 rounded-xl border border-line bg-surface text-sm font-medium",
            compact ? "w-full" : ""
          )}
          aria-label="Language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-turmeric text-white px-3 py-1.5 rounded-lg">
        {t.nav.skip}
      </a>

      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-paper/90 backdrop-blur border-b border-line">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <Leaf className="w-5 h-5 text-neem" /> IP-SAKTI
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={toggleTheme} aria-label="Toggle theme" className="p-2 rounded-lg hover:bg-sunk">
            {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setOpen((o) => !o)} aria-label="Menu" className="p-2 rounded-lg hover:bg-sunk">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <nav
        className={clsx(
          "md:w-64 md:shrink-0 md:sticky md:top-0 md:h-screen border-r border-line bg-surface/90 backdrop-blur paper-texture flex-col px-4 py-6 gap-1",
          open ? "flex" : "hidden md:flex"
        )}
      >
        <Link href="/" className="hidden md:flex items-center gap-2 px-2 mb-6 font-display font-bold text-xl">
          <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl bg-neem-soft text-neem">
            <Leaf className="w-5 h-5" />
          </span>
          <span>
            IP-SAKTI <span className="block text-xs font-sans font-normal text-muted -mt-0.5">Sahayak · SIH26045</span>
          </span>
        </Link>

        <div className="md:hidden mb-3">
          <LangSelect compact />
        </div>

        <div className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname?.startsWith(n.href + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active ? "bg-neem text-white shadow-lift" : "text-ink hover:bg-sunk"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {n.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto hidden md:flex flex-col gap-3 pt-6">
          <LangSelect />
          <button onClick={toggleTheme} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted hover:bg-sunk hover:text-ink transition-colors">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {dark ? t.nav.light : t.nav.dark}
          </button>
          <p className="text-[11px] leading-relaxed text-muted px-3">{t.nav.footer}</p>
        </div>
      </nav>

      <main id="main" className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
