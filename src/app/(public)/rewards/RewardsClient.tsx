"use client";

import { Card } from "@/components/ui/card";
import { useI18n } from "@/context/i18n";
import type { RewardLog } from "@/lib/types";

interface RewardsClientProps {
  summary: {
    total: number;
    logs: RewardLog[];
  };
}

export const RewardsClient = ({ summary }: RewardsClientProps) => {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-semibold text-white">{t("rewards_title")}</h1>
      <p className="text-sm text-muted-foreground">{t("rewards_subtitle")}</p>
      <Card className="p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("rewards_total")}</p>
        <p className="mt-2 text-4xl font-semibold text-white">{summary.total}</p>
      </Card>
      <div className="space-y-3">
        {summary.logs.map((log) => (
          <Card key={log.id} className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">{log.action.toUpperCase()}</span>
            <span className="text-lg font-semibold text-white">+{log.points}</span>
          </Card>
        ))}
      </div>
    </div>
  );
};
