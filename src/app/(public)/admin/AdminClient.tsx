"use client";

import { Card } from "@/components/ui/card";
import { useI18n } from "@/context/i18n";
import type { User } from "@/lib/types";

interface AdminClientProps {
  unverified: User[];
}

export const AdminClient = ({ unverified }: AdminClientProps) => {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-semibold text-white">{t("admin_title")}</h1>
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white">{t("admin_pending_title")}</h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          {unverified.map((user) => (
            <li key={user.userId} className="flex items-center justify-between">
              <span>{user.displayName}</span>
              <span>{user.email}</span>
            </li>
          ))}
        </ul>
        {unverified.length === 0 && <p className="text-sm text-muted-foreground">{t("admin_all_verified")}</p>}
      </Card>
    </div>
  );
};
