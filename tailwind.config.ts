import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: v("paper"),
        surface: v("surface"),
        sunk: v("sunk"),
        ink: v("ink"),
        muted: v("muted"),
        line: v("line"),
        neem: { DEFAULT: v("neem"), soft: v("neem-soft"), ink: v("neem-ink") },
        moss: { DEFAULT: v("moss"), soft: v("moss-soft"), ink: v("moss-ink") },
        turmeric: { DEFAULT: v("turmeric"), soft: v("turmeric-soft"), ink: v("turmeric-ink") },
        indigo: { DEFAULT: v("indigo"), soft: v("indigo-soft"), ink: v("indigo-ink") },
        sindoor: { DEFAULT: v("sindoor"), soft: v("sindoor-soft") },
      },
      fontFamily: {
        display: ["'Noto Serif'", "Georgia", "serif"],
        sans: ["Inter", "-apple-system", "Segoe UI", "sans-serif"],
        legal: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        lift: "0 1px 0 rgb(var(--line) / 1), 0 12px 30px -18px rgb(var(--shadow) / 0.35)",
        pop: "0 20px 50px -20px rgb(var(--shadow) / 0.45)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
      },
      animation: { rise: "rise .35s ease-out both", shimmer: "shimmer 2.4s linear infinite" },
    },
  },
  plugins: [],
};
export default config;
