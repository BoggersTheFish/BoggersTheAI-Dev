"use client";

import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { X, Zap, CheckCircle, AlertTriangle } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts
        .filter((t) => t.open)
        .map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto w-80 rounded-lg border p-4 shadow-ts-card",
              "animate-slide-in-right",
              "backdrop-blur-md",
              t.variant === "wave"
                ? "bg-black/90 border-ts-purple/50 shadow-ts"
                : t.variant === "success"
                ? "bg-black/90 border-green-500/40"
                : t.variant === "warning"
                ? "bg-black/90 border-yellow-500/40"
                : "bg-black/90 border-ts-purple/30"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                {t.variant === "wave" && (
                  <Zap className="w-4 h-4 text-ts-purple" />
                )}
                {t.variant === "success" && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                {t.variant === "warning" && (
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                )}
                {(!t.variant || t.variant === "default") && (
                  <Zap className="w-4 h-4 text-ts-purple" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {t.title && (
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      t.variant === "wave" ? "text-ts-purple-light" : "text-foreground"
                    )}
                  >
                    {t.title}
                  </p>
                )}
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
