import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border bg-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          checked && "border-transparent bg-accent/90",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-1",
          )}
        />
      </button>
    );
  },
);

Switch.displayName = "Switch";

