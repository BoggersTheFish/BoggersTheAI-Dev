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

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const tension = useWaveStore((s) => s.tension);
  const cycle = useWaveStore((s) => s.cycle);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
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

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-black/95 backdrop-blur-md border-b border-ts-purple/20 shadow-ts-card"
            : "bg-transparent"
        )}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-3">
              <div
                className={cn(
                  "relative w-9 h-9 rounded-full border-2 border-ts-purple",
                  "flex items-center justify-center",
                  "transition-all duration-300 group-hover:shadow-ts-lg",
                  "animate-pulse-glow"
                )}
              >
                <span className="text-ts-purple font-mono font-bold text-sm ts-text-glow">
                  TS
                </span>
                {/* Propagation ring on hover */}
                <span className="absolute inset-0 rounded-full border border-ts-purple/40 scale-100 group-hover:scale-150 group-hover:opacity-0 transition-all duration-500" />
              </div>
              <div className="hidden sm:flex flex-col leading-none">
                <span className="text-white font-semibold text-sm tracking-wide">
                  BoggersTheFish
                </span>
                <span className="text-ts-purple-light text-[10px] font-mono tracking-widest uppercase opacity-70">
                  Thinking System
                </span>
              </div>
            </Link>

            {/* Desktop Links */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                      "hover:text-ts-purple-light hover:bg-ts-purple/10",
                      active
                        ? "text-ts-purple-light bg-ts-purple/10"
                        : "text-muted-foreground"
                    )}
                  >
                    {link.label}
                    {active && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ts-purple shadow-ts"
                        transition={{ type: "spring", duration: 0.4 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right actions */}
            <div className="hidden md:flex items-center gap-3">
              {/* Wave cycle indicator */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                <span className={cn("w-1.5 h-1.5 rounded-full", tensionColor, tension > 0.5 ? "animate-ping-slow" : "animate-pulse")} />
                <span>#{cycle}</span>
              </div>

              <button
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-ts-purple-light transition-colors p-2 rounded-md hover:bg-ts-purple/10"
                aria-label="Toggle theme"
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link
                href="https://github.com/BoggersTheFish"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-ts-purple-light transition-colors p-2 rounded-md hover:bg-ts-purple/10"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </Link>

              <Button size="sm" asChild>
                <Link href="mailto:boggersthefish@boggersthefish.com">
                  <Zap className="w-3.5 h-3.5" />
                  Vibe-Code Me
                </Link>
              </Button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden text-muted-foreground hover:text-ts-purple-light p-2 rounded-md transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 bg-black/97 backdrop-blur-lg border-b border-ts-purple/20 shadow-ts-card"
          >
            <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                      active
                        ? "text-ts-purple-light bg-ts-purple/15 border border-ts-purple/30"
                        : "text-muted-foreground hover:text-ts-purple-light hover:bg-ts-purple/10"
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        active ? "bg-ts-purple shadow-ts" : "bg-muted-foreground/40"
                      )}
                    />
                    {link.label}
                  </Link>
                );
              })}
              <div className="ts-divider my-2" />
              <div className="flex items-center gap-3 px-4 py-2">
                <Link
                  href="https://github.com/BoggersTheFish"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-ts-purple-light transition-colors"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </Link>
                <Link
                  href="mailto:boggersthefish@boggersthefish.com"
                  className="flex items-center gap-2 text-sm text-ts-purple hover:text-ts-purple-light transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Vibe-Code Me
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
