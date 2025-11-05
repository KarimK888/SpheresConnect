"use client";

import { useI18n } from "@/context/i18n";

export default function CareersPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-semibold text-white">{t("careers_title")}</h1>
      <p className="text-sm text-muted-foreground">{t("careers_subtitle")}</p>
      <div className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
        {t("careers_coming_soon")}
      </div>
    </div>
  );
}
