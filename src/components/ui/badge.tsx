import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "outline" | "success" | "warning";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-muted text-foreground",
  outline: "border border-border text-foreground",
  success: "bg-success/15 text-success border border-success/30",
  warning: "bg-warning/15 text-warning border border-warning/30",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

