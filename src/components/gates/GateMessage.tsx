"use client";

import { Button } from "@/components/ui/button";

interface GateMessageProps {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}

export const GateMessage = ({ title, body, actionLabel, onAction }: GateMessageProps) => (
  <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-16 text-center">
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold text-white">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
    <Button size="lg" onClick={onAction}>
      {actionLabel}
    </Button>
  </div>
);
