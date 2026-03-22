"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Github, Zap, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/tsData";
import { Button } from "@/components/ui/button";
import { useWaveStore } from "@/store/waveStore";
import { useTheme } from "@/components/providers/Providers";

const NAV_GROUPS = [
  {
    label: "Surface",
    links: NAV_LINKS.filter((l) =>
      ["/", "/chat", "/about"].includes(l.href)
    ),
  },
  {
    label: "System",
    links: NAV_LINKS.filter((l) =>
      ["/ts-os", "/projects", "/lab", "/wasm"].includes(l.href)
    ),
  },
  {
    label: "Network",
    links: NAV_LINKS.filter((l) => ["/waves", "/network"].includes(l.href)),
  },
];

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const tension = useWaveStore((s) => s.tension);
  const cycle = useWaveStore((s) => s.cycle);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const { theme, toggle: toggleTheme } = useTheme();

  const tensionColor =
    tension > 0.7
      ? "text-red-400"
      : tension > 0.4
        ? "text-yellow-400"
        : "text-green-400";

  const linkActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 pt-3 sm:pt-4 px-3 sm:px-5 lg:px-8 pointer-events-none"
        role="banner"
      >
        <nav
          className={cn(
            "pointer-events-auto max-w-7xl mx-auto rounded-2xl border transition-all duration-300",
            "flex items-center gap-2 px-3 sm:px-4 h-14 sm:h-[3.75rem]",
            scrolled
              ? "bg-black/92 backdrop-blur-xl border-ts-purple/30 shadow-ts-card"
              : "bg-black/55 backdrop-blur-md border-ts-purple/15"
          )}
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="group flex items-center gap-2.5 sm:gap-3 shrink-0 mr-1"
            aria-label="BoggersTheFish — Home"
          >
            <div
              className={cn(
                "relative w-9 h-9 rounded-xl border border-ts-purple/60",
                "flex items-center justify-center",
                "transition-all duration-300 group-hover:shadow-ts-lg group-hover:border-ts-purple"
              )}
            >
              <span className="text-ts-purple font-mono font-bold text-sm ts-text-glow">TS</span>
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-white font-semibold text-sm tracking-tight">
                BoggersTheFish
              </span>
              <span className="text-ts-purple-light/80 text-[10px] font-mono tracking-[0.18em] uppercase">
                substrate · surface
              </span>
            </div>
          </Link>

          {/* Desktop — grouped */}
          <div className="hidden xl:flex flex-1 items-center justify-center gap-6 min-w-0">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="flex items-center gap-1">
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-ts-purple/45 pr-1 hidden 2xl:inline">
                  {group.label}
                </span>
                <div className="flex items-center gap-0.5">
                  {group.links.map((link) => {
                    const active = linkActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
                          "hover:text-ts-purple-light hover:bg-ts-purple/10",
                          active
                            ? "text-ts-purple-light bg-ts-purple/12"
                            : "text-muted-foreground"
                        )}
                      >
                        {link.label}
                        {active && (
                          <motion.span
                            layoutId="nav-dot"
                            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ts-purple shadow-ts"
                            transition={{ type: "spring", duration: 0.35 }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Tablet / small desktop — flat list scroll */}
          <div className="hidden md:flex xl:hidden flex-1 items-center justify-end gap-0.5 min-w-0 overflow-x-auto py-1">
            {NAV_LINKS.map((link) => {
              const active = linkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "shrink-0 px-2 py-1.5 text-[11px] font-medium rounded-md transition-colors",
                    active ? "text-ts-purple-light bg-ts-purple/10" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-muted-foreground border border-ts-purple/20 rounded-lg px-2 py-1">
              <span className={cn("w-1.5 h-1.5 rounded-full", tensionColor)} />
              <span className="text-ts-purple-light/90">#{cycle}</span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-ts-purple-light transition-colors p-2 rounded-lg hover:bg-ts-purple/10"
              aria-label="Toggle theme"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="https://github.com/BoggersTheFish"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex text-muted-foreground hover:text-ts-purple-light transition-colors p-2 rounded-lg hover:bg-ts-purple/10"
              aria-label="GitHub"
            >
              <Github className="w-4 h-4" />
            </Link>
            <Button size="sm" className="hidden sm:inline-flex text-xs h-8" asChild>
              <Link href="mailto:boggersthefish@boggersthefish.com">
                <Zap className="w-3.5 h-3.5" />
                Connect
              </Link>
            </Button>
            <button
              type="button"
              className="md:hidden text-muted-foreground hover:text-ts-purple-light p-2 rounded-lg transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[4.25rem] left-3 right-3 z-40 md:hidden pointer-events-auto rounded-2xl border border-ts-purple/25 bg-black/96 backdrop-blur-xl shadow-ts-card max-h-[min(70vh,calc(100dvh-6rem))] overflow-y-auto"
          >
            <div className="p-4 space-y-5">
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-ts-purple/50 mb-2">
                    {group.label}
                  </div>
                  <div className="flex flex-col gap-1">
                    {group.links.map((link) => {
                      const active = linkActive(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            "px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                            active
                              ? "bg-ts-purple/15 text-ts-purple-light border border-ts-purple/35"
                              : "text-muted-foreground hover:bg-ts-purple/10"
                          )}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="ts-divider" />
              <div className="flex items-center justify-between">
                <Link
                  href="https://github.com/BoggersTheFish"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-ts-purple-light"
                >
                  GitHub
                </Link>
                <Button size="sm" asChild>
                  <Link href="mailto:boggersthefish@boggersthefish.com">
                    <Zap className="w-3.5 h-3.5" />
                    Connect
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
