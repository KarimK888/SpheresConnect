import type { ComponentPropsWithoutRef, MouseEventHandler, ReactNode } from "react";
import { clsx } from "clsx";

export interface UiButtonProps extends ComponentPropsWithoutRef<"button"> {
  children?: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "ghost";
}

export const UiButton = ({ variant = "primary", className, ...props }: UiButtonProps) => {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition",
        variant === "primary"
          ? "bg-white text-black hover:bg-white/80"
          : "bg-transparent text-white border border-white/30 hover:border-white",
        className
      )}
      {...props}
    />
  );
};
