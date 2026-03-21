"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useWaveCycle } from "@/hooks/useWaveCycle";
import { toast } from "@/components/ui/use-toast";

// ── Theme context ──────────────────────────────────────────────────────────────
type Theme = "dark" | "light";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("ts-theme") as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("ts-theme", theme);
  }, [theme]);

  const toggle = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
    toast({
      title: theme === "dark" ? "Stability flip → light mode" : "Stability flip → dark mode",
      description: "Graph theme updated. Purple accents remain.",
      variant: "wave",
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Wave cycle bootstrapper ────────────────────────────────────────────────────
const WAVE_TOASTS: Record<number, { title: string; desc: string }> = {
  1: { title: "↯ Wave cycle started", desc: "Graph initializing — 10 nodes active, propagation running." },
  5: { title: "↯ 5 cycles complete", desc: "Activation stabilizing. Tension nominal." },
};

function WaveCycleBootstrap({ children }: { children: React.ReactNode }) {
  const { cycle } = useWaveCycle();

  useEffect(() => {
    const msg = WAVE_TOASTS[cycle];
    if (msg) {
      toast({ title: msg.title, description: msg.desc, variant: "wave" });
    }
  }, [cycle]);

  return <>{children}</>;
}

// ── Root provider ─────────────────────────────────────────────────────────────
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <WaveCycleBootstrap>{children}</WaveCycleBootstrap>
    </ThemeProvider>
  );
}
