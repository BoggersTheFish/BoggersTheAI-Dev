import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ts-purple focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-ts-purple/40 bg-ts-purple/10 text-ts-purple-light",
        outline:
          "border-ts-purple/30 text-ts-purple-light bg-transparent",
        secondary:
          "border-white/10 bg-muted text-muted-foreground",
        active:
          "border-ts-purple bg-ts-purple/20 text-ts-purple-light shadow-ts",
        "low-stability":
          "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
        complete:
          "border-green-500/40 bg-green-500/10 text-green-400",
        current:
          "border-ts-purple bg-ts-purple/30 text-white shadow-ts animate-pulse-glow",
        roadmap:
          "border-white/10 bg-white/5 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
