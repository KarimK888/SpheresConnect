"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/theme";
import { useI18n } from "@/context/i18n";

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={t("theme_toggle_label")}>
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
};
