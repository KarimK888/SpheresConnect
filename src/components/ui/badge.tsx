import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline";
}

export const Badge = ({ className, variant = "default", ...props }: BadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
      variant === "default" && "bg-primary text-black",
      variant === "outline" && "border border-border text-muted-foreground",
      className
    )}
    {...props}
  />
);
