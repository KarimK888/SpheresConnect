"use client";

import { Globe } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/i18n";
import type { Locale } from "@/lib/types";

const locales: Locale[] = ["en", "fr", "es"];

export const LanguageSwitcher = () => {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);

  const labels = useMemo(
    () => ({
      en: t("language_english"),
      fr: t("language_french"),
      es: t("language_spanish")
    }) as Record<Locale, string>,
    [t]
  );

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("language_switcher_label")}
        onClick={() => setOpen((state) => !state)}
      >
        <Globe className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-36 overflow-hidden rounded-xl border border-border/60 bg-background/90 p-1 text-sm shadow-2xl">
          {locales.map((item) => (
            <button
              key={item}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 capitalize hover:bg-border/40 ${
                locale === item ? "bg-border/60 text-white" : ""
              }`}
              onClick={() => {
                setLocale(item);
                setOpen(false);
              }}
            >
              {labels[item]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
