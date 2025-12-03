"use client";

import { Apple, Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/i18n";

interface OAuthButtonProps {
  provider: "google" | "apple" | "github";
  onClick?: () => void;
}

const icons = {
  google: () => <Mail className="h-4 w-4" />,
  apple: () => <Apple className="h-4 w-4" />,
  github: () => <Github className="h-4 w-4" />
} as const;

const labelKeys = {
  google: "oauth_google",
  apple: "oauth_apple",
  github: "oauth_github"
} as const;

export const OAuthButton = ({ provider, onClick }: OAuthButtonProps) => {
  const { t } = useI18n();
  const Icon = icons[provider];

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full justify-center gap-2 border-border/60 bg-background/60 hover:bg-border/40"
      onClick={onClick}
    >
      <Icon />
      {t(labelKeys[provider])}
    </Button>
  );
};
