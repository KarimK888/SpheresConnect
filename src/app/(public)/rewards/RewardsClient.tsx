"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/context/i18n";
import type { RewardLog } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RewardsClientProps {
  summary: {
    total: number;
    logs: RewardLog[];
  };
  userId: string;
  onRefresh: () => void;
}

type Tier = {
  id: string;
  name: string;
  min: number;
  benefits: string;
};

type ActionBusy = "redeem" | "transfer" | "bonus" | null;

const ACTIONS: RewardLog["action"][] = ["onboarding", "checkin", "match", "sale", "rsvp", "bonus", "redeem", "transfer"];

export const RewardsClient = ({ summary, userId, onRefresh }: RewardsClientProps) => {
  const { t } = useI18n();
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemReason, setRedeemReason] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusNote, setBonusNote] = useState("");
  const [actionBusy, setActionBusy] = useState<ActionBusy>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const defaultTiers = useMemo<Tier[]>(
    () => [
      { id: "starter", name: t("rewards_tier_starter_name"), min: 0, benefits: t("rewards_tier_starter_copy") },
      { id: "partner", name: t("rewards_tier_partner_name"), min: 500, benefits: t("rewards_tier_partner_copy") },
      { id: "flagship", name: t("rewards_tier_flagship_name"), min: 1500, benefits: t("rewards_tier_flagship_copy") }
    ],
    [t]
  );

  const tierStorageKey = "spheraconnect-rewards-tiers";
  const [tiers, setTiers] = useState<Tier[]>(defaultTiers);
  const [tiersEditable, setTiersEditable] = useState(false);
  const [tierNotice, setTierNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(tierStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTiers(
            parsed.map((tier: Tier, index: number) => ({
              id: tier.id ?? `tier_${index + 1}`,
              name: tier.name ?? "",
              min: typeof tier.min === "number" ? tier.min : 0,
              benefits: tier.benefits ?? ""
            }))
          );
        }
      }
    } catch (error) {
      console.warn("[rewards-client] unable to load stored tiers", error);
    }
  }, [tierStorageKey]);

  const sortedLogs = useMemo(
    () => [...summary.logs].sort((a, b) => b.createdAt - a.createdAt),
    [summary.logs]
  );

  const actionLabels = useMemo<Record<RewardLog["action"], string>>(
    () => ({
      onboarding: t("rewards_action_onboarding"),
      checkin: t("rewards_action_checkin"),
      match: t("rewards_action_match"),
      sale: t("rewards_action_sale"),
      rsvp: t("rewards_action_rsvp"),
      bonus: t("rewards_action_bonus"),
      redeem: t("rewards_action_redeem"),
      transfer: t("rewards_action_transfer")
    }),
    [t]
  );

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortedLogs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (!query) return true;
      const label = actionLabels[log.action].toLowerCase();
      return label.includes(query) || (log.note?.toLowerCase().includes(query) ?? false);
    });
  }, [sortedLogs, actionFilter, searchTerm, actionLabels]);

  const weeklyBuckets = useMemo(() => {
    const buckets: { label: string; total: number }[] = [];
    const now = new Date();
    const formatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      const total = summary.logs
        .filter((log) => log.createdAt >= date.getTime() && log.createdAt < nextDate.getTime())
        .reduce((sum, log) => sum + log.points, 0);
      buckets.push({
        label: formatter.format(date),
        total
      });
    }
    return buckets;
  }, [summary.logs]);

  const maxBucket = Math.max(1, ...weeklyBuckets.map((bucket) => Math.max(bucket.total, 0)));

  const tierProgress = useMemo(() => {
    const ordered = [...tiers].sort((a, b) => a.min - b.min);
    const current = ordered.filter((tier) => summary.total >= tier.min).pop() ?? ordered[0];
    const next = ordered.find((tier) => tier.min > summary.total) ?? null;
    const progress = next
      ? Math.min(100, Math.max(0, ((summary.total - current.min) / (next.min - current.min)) * 100))
      : 100;
    return { current, next, progress };
  }, [tiers, summary.total]);

  const submitAction = async (payload: { action: RewardLog["action"]; points: number; note?: string }, busyKey: ActionBusy) => {
    setActionBusy(busyKey);
    setActionError(null);
    setActionNotice(null);
    try {
      const response = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: payload.action,
          points: payload.points,
          note: payload.note
        })
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error?.message ?? "Failed to log reward");
      }
      setActionNotice(t("rewards_action_success"));
      onRefresh();
    } catch (error) {
      console.error("[rewards-client] unable to submit action", error);
      setActionError(t("rewards_form_error"));
    } finally {
      setActionBusy(null);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleRedeem = async () => {
    const amount = Number(redeemAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > summary.total) {
      setActionError(t("rewards_form_error"));
      return;
    }
    await submitAction({ action: "redeem", points: -Math.abs(amount), note: redeemReason.trim() || undefined }, "redeem");
    setRedeemAmount("");
    setRedeemReason("");
  };

  const handleTransfer = async () => {
    const amount = Number(transferAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > summary.total) {
      setActionError(t("rewards_form_error"));
      return;
    }
    await submitAction(
      { action: "transfer", points: -Math.abs(amount), note: transferNote.trim() || undefined },
      "transfer"
    );
    setTransferAmount("");
    setTransferNote("");
  };

  const handleBonus = async () => {
    const amount = Number(bonusAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError(t("rewards_form_error"));
      return;
    }
    await submitAction({ action: "bonus", points: Math.abs(amount), note: bonusNote.trim() || undefined }, "bonus");
    setBonusAmount("");
    setBonusNote("");
  };

  const canRedeem = Number(redeemAmount) > 0 && Number(redeemAmount) <= summary.total;
  const canTransfer = Number(transferAmount) > 0 && Number(transferAmount) <= summary.total;
  const canBonus = Number(bonusAmount) > 0;

  const handleAddTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        id: `tier_${prev.length + 1}`,
        name: `${t("rewards_tiers_name")} ${prev.length + 1}`,
        min: prev[prev.length - 1]?.min + 500 || 0,
        benefits: ""
      }
    ]);
    setTiersEditable(true);
  };

  const handleTierChange = (index: number, field: keyof Tier, value: string) => {
    setTiers((prev) =>
      prev.map((tier, i) => {
        if (i !== index) return tier;
        if (field === "min") {
          const minValue = Number(value) || 0;
          return { ...tier, min: minValue };
        }
        return { ...tier, [field]: value };
      })
    );
  };

  const handleTierSave = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(tierStorageKey, JSON.stringify(tiers));
    }
    setTierNotice(t("rewards_tiers_saved"));
    setTiersEditable(false);
    setTimeout(() => setTierNotice(null), 4000);
  };

  const handleExport = () => {
    if (!filteredLogs.length) return;
    const rows = [["date", "action", "points", "note"]];
    filteredLogs.forEach((log) => {
      rows.push([
        new Date(log.createdAt).toISOString(),
        actionLabels[log.action],
        String(log.points),
        log.note ?? ""
      ]);
    });
    const csv = rows.map((cols) => cols.map((col) => `"${col.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rewards-logs.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("rewards_total")}</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-5xl font-semibold text-white">{summary.total}</p>
            <p className="text-sm text-muted-foreground">
              {tierProgress.next
                ? `${summary.total}/${tierProgress.next.min}`
                : `${summary.total} ${t("rewards_logs_points")}`}
            </p>
          </div>
          <div className="min-w-[220px] space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>{tierProgress.current.name}</span>
              <span>{tierProgress.next ? tierProgress.next.name : "∞"}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-border/60">
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${tierProgress.progress}%` }}
              />
            </div>
            {tierProgress.next ? (
              <p className="text-xs">
                {tierProgress.next.min - summary.total} {t("rewards_logs_points")} → {tierProgress.next.name}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("rewards_no_next_tier")}</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-white">{t("rewards_actions_title")}</h2>
          <p className="text-sm text-muted-foreground">{t("rewards_actions_help")}</p>
        </div>
        {actionError && <p className="text-sm text-destructive">{actionError}</p>}
        {actionNotice && <p className="text-sm text-emerald-300">{actionNotice}</p>}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="space-y-3 p-4">
            <h3 className="text-lg font-semibold text-white">{t("rewards_redeem_title")}</h3>
            <p className="text-sm text-muted-foreground">{t("rewards_redeem_description")}</p>
            <Input
              type="number"
              min={0}
              value={redeemAmount}
              onChange={(event) => setRedeemAmount(event.target.value)}
              placeholder={t("rewards_amount_placeholder")}
            />
            <Textarea
              value={redeemReason}
              onChange={(event) => setRedeemReason(event.target.value)}
              placeholder={t("rewards_reason_placeholder")}
              rows={2}
            />
            <Button onClick={handleRedeem} disabled={actionBusy === "redeem" || !canRedeem}>
              {actionBusy === "redeem" ? "…" : t("rewards_submit_action")}
            </Button>
          </Card>

          <Card className="space-y-3 p-4">
            <h3 className="text-lg font-semibold text-white">{t("rewards_transfer_title")}</h3>
            <p className="text-sm text-muted-foreground">{t("rewards_transfer_description")}</p>
            <Input
              type="number"
              min={0}
              value={transferAmount}
              onChange={(event) => setTransferAmount(event.target.value)}
              placeholder={t("rewards_amount_placeholder")}
            />
            <Input
              value={transferNote}
              onChange={(event) => setTransferNote(event.target.value)}
              placeholder={t("rewards_transfer_target_placeholder")}
            />
            <Button onClick={handleTransfer} disabled={actionBusy === "transfer" || !canTransfer}>
              {actionBusy === "transfer" ? "…" : t("rewards_submit_action")}
            </Button>
          </Card>

          <Card className="space-y-3 p-4">
            <h3 className="text-lg font-semibold text-white">{t("rewards_bonus_title")}</h3>
            <p className="text-sm text-muted-foreground">{t("rewards_bonus_description")}</p>
            <Input
              type="number"
              min={0}
              value={bonusAmount}
              onChange={(event) => setBonusAmount(event.target.value)}
              placeholder={t("rewards_amount_placeholder")}
            />
            <Textarea
              value={bonusNote}
              onChange={(event) => setBonusNote(event.target.value)}
              placeholder={t("rewards_reason_placeholder")}
              rows={2}
            />
            <Button onClick={handleBonus} disabled={actionBusy === "bonus" || !canBonus}>
              {actionBusy === "bonus" ? "…" : t("rewards_submit_action")}
            </Button>
          </Card>
        </div>
      </section>

      <section className="rounded-3xl border border-border/70 bg-card/60 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">{t("rewards_chart_title")}</h2>
            <p className="text-sm text-muted-foreground">{t("rewards_chart_subtitle")}</p>
          </div>
        </div>
        <div className="flex items-end gap-3 overflow-x-auto pb-2">
          {weeklyBuckets.map((bucket) => (
            <div key={bucket.label} className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
              <div className="relative h-32 w-8 rounded-full bg-border/40">
                <div
                  className="absolute bottom-0 w-full rounded-full bg-accent transition-[height]"
                  style={{ height: `${(Math.max(bucket.total, 0) / maxBucket) * 100}%` }}
                />
              </div>
              <span className="text-[11px]">{bucket.label}</span>
              <span className="text-[11px] text-white">{bucket.total}</span>
            </div>
          ))}
          {!summary.logs.length && <p className="text-sm text-muted-foreground">{t("rewards_chart_no_data")}</p>}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-border/70 bg-card/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">{t("rewards_tiers_title")}</h2>
            <p className="text-sm text-muted-foreground">{t("rewards_tiers_description")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTiersEditable((prev) => !prev)}>
              {t("rewards_admin_tools_label")}
            </Button>
            <Button variant="outline" onClick={handleAddTier}>
              {t("rewards_tiers_add")}
            </Button>
            <Button onClick={handleTierSave}>{t("rewards_tiers_save")}</Button>
          </div>
        </div>
        {tierNotice && <p className="text-sm text-accent">{tierNotice}</p>}
        <div className="grid gap-4">
          {tiers.map((tier, index) => (
            <Card key={tier.id} className="grid gap-3 p-4 md:grid-cols-[180px_140px_1fr]">
              <Input
                value={tier.name}
                disabled={!tiersEditable}
                onChange={(event) => handleTierChange(index, "name", event.target.value)}
                placeholder={t("rewards_tiers_name")}
              />
              <Input
                type="number"
                min={0}
                value={tier.min}
                disabled={!tiersEditable}
                onChange={(event) => handleTierChange(index, "min", event.target.value)}
                placeholder={t("rewards_tiers_min")}
              />
              <Textarea
                value={tier.benefits}
                disabled={!tiersEditable}
                onChange={(event) => handleTierChange(index, "benefits", event.target.value)}
                placeholder={t("rewards_tiers_benefits")}
                rows={2}
              />
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-white">{t("rewards_logs_title")}</h2>
            <p className="text-sm text-muted-foreground">{`${filteredLogs.length} / ${sortedLogs.length}`}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("rewards_filters_search")}
              className="w-48"
            />
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-white"
            >
              <option value="all">{t("rewards_filters_all")}</option>
              {ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {actionLabels[action]}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={handleExport} disabled={!filteredLogs.length}>
              {t("rewards_logs_export")}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{actionLabels[log.action]}</p>
                {log.note && <p className="text-xs text-muted-foreground">{log.note}</p>}
              </div>
              <div className="text-sm text-muted-foreground">
                <p className="text-[11px]">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
              <p
                className={cn(
                  "text-lg font-semibold",
                  log.points >= 0 ? "text-emerald-300" : "text-rose-300"
                )}
              >
                {log.points >= 0 ? "+" : ""}
                {log.points}
                <span className="ml-1 text-xs text-muted-foreground">{t("rewards_logs_points")}</span>
              </p>
            </Card>
          ))}
          {!filteredLogs.length && (
            <Card className="p-4 text-sm text-muted-foreground">{t("rewards_filters_empty")}</Card>
          )}
        </div>
      </section>
    </div>
  );
};
