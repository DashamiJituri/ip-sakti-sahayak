"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageSquare, ListChecks, ShieldCheck, Library, Info, Leaf, Moon, Sun, Menu, X } from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/chat", label: "Ask", icon: MessageSquare },
  { href: "/classify", label: "Classify my product", icon: ListChecks },
  { href: "/abs", label: "ABS helper", icon: ShieldCheck },
  { href: "/sources", label: "Corpus & sources", icon: Library },
  { href: "/about", label: "About", icon: Info },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("ipsakti-theme") : null;
    const isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    window.localStorage.setItem("ipsakti-theme", next ? "dark" : "light");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-turmeric text-white px-3 py-1.5 rounded-lg">
        Skip to content
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
          "md:w-64 md:shrink-0 md:sticky md:top-0 md:h-screen border-r border-line bg-surface paper-texture flex-col px-4 py-6 gap-1",
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
          <button onClick={toggleTheme} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted hover:bg-sunk hover:text-ink transition-colors">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {dark ? "Light mode" : "Dark mode"}
          </button>
          <p className="text-[11px] leading-relaxed text-muted px-3">
            Information, not legal advice. Ministry of Ayush · Smart India Hackathon, PS 26045.
          </p>
        </div>
      </nav>

      <main id="main" className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
