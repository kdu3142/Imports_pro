import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost" | "soft";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background hover:opacity-90 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
  outline:
    "border border-border bg-background text-foreground hover:border-foreground/70 hover:bg-foreground/5 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
  ghost:
    "text-foreground hover:bg-foreground/5 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
  soft:
    "bg-muted text-foreground hover:bg-muted/80 focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
  icon: "h-10 w-10",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-60",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

