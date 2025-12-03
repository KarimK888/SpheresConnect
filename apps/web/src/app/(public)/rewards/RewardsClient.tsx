"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/context/i18n";
import type { RewardLog, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { enqueueMutation } from "@spheresconnect/offline";
import { adjustCachedRewardTotal } from "@/lib/offline/rewards";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { DEFAULT_REWARDS_PRESETS, type QuickRewardAction } from "@/lib/rewards-config";

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

type QuickActionId = QuickRewardAction;

type ActionBusy = RewardLog["action"] | null;

const ACTIONS: RewardLog["action"][] = ["onboarding", "checkin", "match", "sale", "rsvp", "bonus", "redeem", "transfer"];
const QUICK_ACTION_KEYS: QuickActionId[] = ["onboarding", "checkin", "match", "sale", "rsvp"];

const buildQuickActionState = (defaults: Record<QuickActionId, number>) =>
  QUICK_ACTION_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: { points: String(defaults[key]), note: "" } }),
    {} as Record<QuickActionId, { points: string; note: string }>
  );

export const RewardsClient = ({ summary, userId, onRefresh }: RewardsClientProps) => {
  const { t } = useI18n();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemReason, setRedeemReason] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferRecipientId, setTransferRecipientId] = useState<string | null>(null);
  const [recipientOptions, setRecipientOptions] = useState<User[]>([]);
  const [transferNote, setTransferNote] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusNote, setBonusNote] = useState("");
  const [actionBusy, setActionBusy] = useState<ActionBusy>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [presetsBusy, setPresetsBusy] = useState(false);
  const [presetsError, setPresetsError] = useState<string | null>(null);
  const [presetsNotice, setPresetsNotice] = useState<string | null>(null);
  const [editingPresets, setEditingPresets] = useState(false);
  const [quickActionDefaults, setQuickActionDefaults] = useState<Record<QuickActionId, number>>(
    DEFAULT_REWARDS_PRESETS.quickActions
  );
  const [quickActions, setQuickActions] = useState<Record<QuickActionId, { points: string; note: string }>>(() =>
    buildQuickActionState(DEFAULT_REWARDS_PRESETS.quickActions)
  );
  const [presetDraft, setPresetDraft] = useState<Record<QuickActionId, string>>(() =>
    QUICK_ACTION_KEYS.reduce(
      (acc, key) => ({ ...acc, [key]: String(DEFAULT_REWARDS_PRESETS.quickActions[key]) }),
      {} as Record<QuickActionId, string>
    )
  );
  const quickActionStorageKey = useMemo(() => `spheraconnect-rewards-quick-actions-${userId}`, [userId]);

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
  const [hasLocalPresets, setHasLocalPresets] = useState(false);
  const [localPresetsLoaded, setLocalPresetsLoaded] = useState(false);

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

  const submitAction = async (
    payload: { action: RewardLog["action"]; points: number; note?: string; recipientId?: string },
    busyKey: ActionBusy
  ) => {
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
          note: payload.note,
          recipientId: payload.recipientId
        })
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error?.message ?? response.statusText ?? "Failed to log reward");
      }
      await adjustCachedRewardTotal(userId, payload.points);
      setActionNotice(t("rewards_action_success"));
      onRefresh();
    } catch (error) {
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      if (offline) {
        await enqueueMutation({
          endpoint: "/api/rewards",
          method: "POST",
          body: {
            userId,
            action: payload.action,
            points: payload.points,
            note: payload.note,
            recipientId: payload.recipientId
          }
        });
        await adjustCachedRewardTotal(userId, payload.points);
        setActionNotice(t("rewards_action_sync_pending"));
      } else {
        console.error("[rewards-client] unable to submit action", error);
        const message = error instanceof Error && error.message ? error.message : t("rewards_form_error");
        setActionError(message);
      }
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
    setActionError(null);
    const amount = Number(transferAmount);
    const recipientInput = transferRecipient.trim();
    if (!Number.isFinite(amount) || amount <= 0 || amount > summary.total || !recipientInput) {
      setActionError(t("rewards_form_error"));
      return;
    }
    const resolveRecipient = async (): Promise<string | null> => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recipientInput);
      if (isUuid) return recipientInput;
      if (transferRecipientId) return transferRecipientId;
      try {
        const response = await fetch(`/api/users?query=${encodeURIComponent(recipientInput)}`, { method: "GET" });
        if (!response.ok) return null;
        const payload = (await response.json()) as { items?: User[] };
        const items = payload.items ?? [];
        if (!items.length) return null;
        const normalized = recipientInput.toLowerCase();
        const match =
          items.find((user) => user.userId === recipientInput) ??
          items.find((user) => user.email?.toLowerCase() === normalized) ??
          items.find((user) => user.displayName?.toLowerCase() === normalized);
        return match?.userId ?? items[0]?.userId ?? null;
      } catch {
        return null;
      }
    };
    const recipientId = await resolveRecipient();
    if (!recipientId) {
      setActionError(t("rewards_form_error"));
      return;
    }
    await submitAction(
      {
        action: "transfer",
        points: -Math.abs(amount),
        note: transferNote.trim() || undefined,
        recipientId
      },
      "transfer"
    );
    setTransferAmount("");
    setTransferRecipient("");
    setTransferRecipientId(null);
    setTransferNote("");
  };

  const handleBonus = async () => {
    setActionError(null);
    const amount = Number(bonusAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError(t("rewards_form_error"));
      return;
    }
    await submitAction({ action: "bonus", points: Math.abs(amount), note: bonusNote.trim() || undefined }, "bonus");
    setBonusAmount("");
    setBonusNote("");
  };

  const handleQuickAction = async (actionId: QuickActionId) => {
    setActionError(null);
    const amount = Number(quickActions[actionId].points);
    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError(t("rewards_form_error"));
      return;
    }
    await submitAction(
      { action: actionId, points: Math.abs(amount), note: quickActions[actionId].note.trim() || undefined },
      actionId
    );
    setQuickActions((prev) => ({
      ...prev,
      [actionId]: { points: prev[actionId].points, note: "" }
    }));
  };

  useEffect(() => {
    const controller = new AbortController();
    const query = transferRecipient.trim();
    if (!query || query.length < 2) {
      setRecipientOptions([]);
      return () => controller.abort();
    }
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/users?query=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          setRecipientOptions([]);
          return;
        }
        const payload = (await response.json()) as { items?: User[] };
        setRecipientOptions((payload.items ?? []).slice(0, 5));
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.warn("[rewards-client] recipient lookup failed", error);
        }
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [transferRecipient]);

  const canRedeem = Number(redeemAmount) > 0 && Number(redeemAmount) <= summary.total;
  const canTransfer =
    Number(transferAmount) > 0 && Number(transferAmount) <= summary.total && transferRecipient.trim().length > 0;
  const canBonus = Number(bonusAmount) > 0;
  const presetDraftInvalid = useMemo(
    () =>
      QUICK_ACTION_KEYS.some((key) => {
        const value = Number(presetDraft[key]);
        return !Number.isFinite(value) || value < 0;
      }),
    [presetDraft]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(quickActionStorageKey);
      let foundLocal = false;
      if (stored) {
        foundLocal = true;
        const parsed = JSON.parse(stored) as Record<string, { points?: string; note?: string }>;
        setQuickActions((prev) => {
          const updated: typeof prev = { ...prev };
          QUICK_ACTION_KEYS.forEach((key) => {
            const entry = parsed?.[key];
            if (!entry) return;
            updated[key] = {
              points: entry.points ?? String(quickActionDefaults[key]),
              note: entry.note ?? ""
            };
          });
          return updated;
        });
      }
      setHasLocalPresets(foundLocal);
      if (!editingPresets) {
        setPresetDraft((prev) => {
          const nextDraft: typeof prev = { ...prev };
          QUICK_ACTION_KEYS.forEach((key) => {
            nextDraft[key] = String(quickActionDefaults[key]);
          });
          return nextDraft;
        });
      }
    } catch (error) {
      console.warn("[rewards-client] unable to load quick actions", error);
    } finally {
      setLocalPresetsLoaded(true);
    }
  }, [editingPresets, quickActionDefaults, quickActionStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(quickActionStorageKey, JSON.stringify(quickActions));
    } catch (error) {
      console.warn("[rewards-client] unable to persist quick actions", error);
    }
  }, [quickActionStorageKey, quickActions]);

  useEffect(() => {
    if (!localPresetsLoaded) return;
    const controller = new AbortController();
    const loadPresets = async () => {
      try {
        const response = await fetch("/api/rewards/presets", { signal: controller.signal });
        if (!response.ok) return;
        const payload = (await response.json()) as { quickActions?: Partial<Record<QuickActionId, number>> };
        if (!payload?.quickActions) return;
        setQuickActionDefaults((prev) => ({ ...prev, ...payload.quickActions }));
        setPresetDraft((prev) => {
          const nextDraft: typeof prev = { ...prev };
          QUICK_ACTION_KEYS.forEach((key) => {
            const incoming = payload.quickActions?.[key];
            if (typeof incoming === "number") {
              nextDraft[key] = String(incoming);
            }
          });
          return nextDraft;
        });
        if (!hasLocalPresets) {
          setQuickActions((prev) => {
            const updated: typeof prev = { ...prev };
            QUICK_ACTION_KEYS.forEach((key) => {
              const incoming = payload.quickActions?.[key];
              if (typeof incoming === "number") {
                updated[key] = { points: String(incoming), note: "" };
              }
            });
            return updated;
          });
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.warn("[rewards-client] unable to load server presets", error);
        }
      }
    };
    void loadPresets();
    return () => controller.abort();
  }, [hasLocalPresets, localPresetsLoaded]);

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

  const handleSavePresets = async () => {
    setPresetsError(null);
    setPresetsNotice(null);
    const payload: Record<QuickActionId, number> = { ...quickActionDefaults };
    for (const key of QUICK_ACTION_KEYS) {
      const value = Number(presetDraft[key]);
      if (!Number.isFinite(value) || value < 0) {
        setPresetsError(t("rewards_presets_error"));
        return;
      }
      payload[key] = value;
    }
    setPresetsBusy(true);
    try {
      const response = await fetch("/api/rewards/presets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quickActions: payload })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const result = (await response.json()) as { quickActions?: Record<QuickActionId, number> };
      const merged = result.quickActions ?? payload;
      setQuickActionDefaults((prev) => ({ ...prev, ...merged }));
      if (!hasLocalPresets) {
        setQuickActions(buildQuickActionState({ ...quickActionDefaults, ...merged }));
      }
      setPresetDraft((prev) => {
        const nextDraft: typeof prev = { ...prev };
        QUICK_ACTION_KEYS.forEach((key) => {
          nextDraft[key] = String(merged[key] ?? payload[key]);
        });
        return nextDraft;
      });
      setEditingPresets(false);
      setPresetsNotice(t("rewards_presets_saved"));
      setTimeout(() => setPresetsNotice(null), 3000);
    } catch (error) {
      console.warn("[rewards-client] unable to save presets", error);
      setPresetsError(t("rewards_presets_error"));
    } finally {
      setPresetsBusy(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", isMobile && "gap-5")}>
      <section className={cn("rounded-3xl border border-border/70 bg-card/70 p-6", isMobile && "p-5")}>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("rewards_total")}</p>
        <div className={cn("mt-4 flex flex-wrap items-end justify-between gap-4", isMobile && "flex-col items-start gap-3")}>
          <div>
            <p className={cn("font-[family-name:var(--font-display)] text-white", isMobile ? "text-4xl" : "text-5xl")}>
              {summary.total}
            </p>
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
        <div className={cn("grid gap-4 md:grid-cols-3", isMobile && "grid-cols-1")}>
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
              {actionBusy === "redeem" ? "..." : t("rewards_submit_action")}
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
              value={transferRecipient}
              onChange={(event) => setTransferRecipient(event.target.value)}
              placeholder={t("rewards_transfer_target_placeholder")}
            />
            {!!recipientOptions.length && transferRecipient.trim().length >= 2 && (
              <div className="max-h-32 overflow-y-auto rounded-xl border border-border/60 bg-background/80 text-sm">
                {recipientOptions.map((option) => (
                  <button
                    key={option.userId}
                    type="button"
                    onClick={() => {
                      setTransferRecipient(option.displayName || option.email || option.userId);
                      setTransferRecipientId(option.userId);
                      setRecipientOptions([]);
                    }}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-border/20"
                  >
                    <span className="font-medium text-white">{option.displayName || option.email}</span>
                    <span className="text-xs text-muted-foreground">{option.email}</span>
                  </button>
                ))}
              </div>
            )}
            <Textarea
              value={transferNote}
              onChange={(event) => setTransferNote(event.target.value)}
              placeholder={t("rewards_reason_placeholder")}
              rows={2}
            />
            <Button onClick={handleTransfer} disabled={actionBusy === "transfer" || !canTransfer}>
              {actionBusy === "transfer" ? "..." : t("rewards_submit_action")}
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
              {actionBusy === "bonus" ? "..." : t("rewards_submit_action")}
            </Button>
          </Card>
        </div>
      </section>

      <section className={cn("rounded-3xl border border-border/70 bg-card/60 p-6", isMobile && "p-5")}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">{t("rewards_automation_title")}</h2>
            <p className="text-sm text-muted-foreground">{t("rewards_automation_subtitle")}</p>
          </div>
          <div className={cn("flex flex-wrap gap-2", isMobile && "w-full")}>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setQuickActions(() => {
                  const reset = buildQuickActionState(quickActionDefaults);
                  return reset;
                })
              }
            >
              {t("rewards_automation_reset")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingPresets((prev) => !prev)}
              className={cn(isMobile && "w-full justify-center")}
            >
              {editingPresets ? t("rewards_presets_cancel") : t("rewards_presets_edit")}
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSavePresets()}
              disabled={presetDraftInvalid || presetsBusy}
              className={cn(isMobile && "w-full justify-center")}
            >
              {presetsBusy ? "..." : t("rewards_presets_save")}
            </Button>
          </div>
        </div>
        {(presetsError || presetsNotice) && (
          <div className="mb-3 space-y-1 text-sm">
            {presetsError && <p className="text-destructive">{presetsError}</p>}
            {presetsNotice && <p className="text-emerald-300">{presetsNotice}</p>}
          </div>
        )}
        {editingPresets && (
          <Card className="mb-4 p-4">
            <p className="mb-3 text-sm text-muted-foreground">{t("rewards_presets_helper")}</p>
            <div className={cn("grid gap-3 sm:grid-cols-2 md:grid-cols-3", isMobile && "grid-cols-1")}>
              {QUICK_ACTION_KEYS.map((key) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium text-white" htmlFor={`preset-${key}`}>
                    {actionLabels[key]}
                  </label>
                  <Input
                    id={`preset-${key}`}
                    type="number"
                    min={0}
                    value={presetDraft[key]}
                    onChange={(event) =>
                      setPresetDraft((prev) => ({
                        ...prev,
                        [key]: event.target.value
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </Card>
        )}
        <div className={cn("grid gap-3 md:grid-cols-2", isMobile && "grid-cols-1")}>
          {(
            [
              { id: "onboarding", hint: t("rewards_automation_onboarding") },
              { id: "checkin", hint: t("rewards_automation_checkin") },
              { id: "match", hint: t("rewards_automation_match") },
              { id: "sale", hint: t("rewards_automation_sale") },
              { id: "rsvp", hint: t("rewards_automation_rsvp") }
            ] as { id: QuickActionId; hint: string }[]
          ).map((preset) => (
            <Card key={preset.id} className="space-y-3 p-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-white">{actionLabels[preset.id]}</h3>
                  <span className="text-sm text-muted-foreground">
                    {quickActions[preset.id].points || quickActionDefaults[preset.id]} {t("rewards_logs_points")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{preset.hint}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="number"
                  min={0}
                  value={quickActions[preset.id].points}
                  onChange={(event) =>
                    setQuickActions((prev) => ({
                      ...prev,
                      [preset.id]: { ...prev[preset.id], points: event.target.value }
                    }))
                  }
                  placeholder={t("rewards_amount_placeholder")}
                />
                <Button
                  onClick={() => void handleQuickAction(preset.id)}
                  disabled={actionBusy === preset.id}
                  className={cn(isMobile && "w-full justify-center")}
                >
                  {actionBusy === preset.id ? "..." : t("rewards_submit_action")}
                </Button>
              </div>
              <Textarea
                value={quickActions[preset.id].note}
                onChange={(event) =>
                  setQuickActions((prev) => ({
                    ...prev,
                    [preset.id]: { ...prev[preset.id], note: event.target.value }
                  }))
                }
                placeholder={t("rewards_reason_placeholder")}
                rows={2}
              />
            </Card>
          ))}
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
        <div className={cn("flex flex-wrap items-center justify-between gap-3", isMobile && "flex-col items-start")}>
          <div>
            <h2 className="text-xl font-semibold text-white">{t("rewards_tiers_title")}</h2>
            <p className="text-sm text-muted-foreground">{t("rewards_tiers_description")}</p>
          </div>
          <div className={cn("flex gap-2", isMobile && "flex-col w-full")}>
            <Button
              variant="outline"
              onClick={() => setTiersEditable((prev) => !prev)}
              className={cn(isMobile && "w-full justify-center")}
            >
              {t(tiersEditable ? "rewards_admin_tools_disable" : "rewards_admin_tools_enable")}
            </Button>
            <Button
              variant="outline"
              onClick={handleAddTier}
              className={cn(isMobile && "w-full justify-center")}
            >
              {t("rewards_tiers_add")}
            </Button>
            <Button onClick={handleTierSave} className={cn(isMobile && "w-full justify-center")}>
              {t("rewards_tiers_save")}
            </Button>
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
        <div className={cn("flex flex-wrap items-center justify-between gap-3", isMobile && "flex-col items-start")}>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-white">{t("rewards_logs_title")}</h2>
            <p className="text-sm text-muted-foreground">{`${filteredLogs.length} / ${sortedLogs.length}`}</p>
          </div>
          <div className={cn("flex flex-wrap gap-3", isMobile && "w-full flex-col")}>
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("rewards_filters_search")}
              className={cn("w-48", isMobile && "w-full")}
            />
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className={cn(
                "rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm text-white",
                isMobile && "w-full"
              )}
            >
              <option value="all">{t("rewards_filters_all")}</option>
              {ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {actionLabels[action]}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!filteredLogs.length}
              className={cn(isMobile && "w-full justify-center")}
            >
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
