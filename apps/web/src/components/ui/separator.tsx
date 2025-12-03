"use client";

import { cn } from "@/lib/utils";

export const Separator = ({ className }: { className?: string }) => (
  <div className={cn("h-px w-full bg-border/60", className)} />
);
