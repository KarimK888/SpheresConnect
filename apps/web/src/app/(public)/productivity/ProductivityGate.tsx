"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GateMessage } from "@/components/gates/GateMessage";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import type {
  ProductivityBoard,
  ProductivityCard,
  ProductivityColumn,
  ProductivityTodo,
  ProductivityCalendarEvent,
  ProductivityComment
} from "@/lib/types";
import { ProductivityClient } from "@/components/productivity/ProductivityClient";

interface Snapshot {
  boards: ProductivityBoard[];
  columns: ProductivityColumn[];
  cards: ProductivityCard[];
  todos: ProductivityTodo[];
  events: ProductivityCalendarEvent[];
  comments: ProductivityComment[];
}

export const ProductivityGate = () => {
  const router = useRouter();
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const sessionLoading = useSessionState((state) => state.loading);
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = useCallback(async () => {
    if (!sessionUser) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/productivity?userId=${encodeURIComponent(sessionUser?.userId ?? "")}`, {
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      const payload = (await response.json()) as Snapshot;
      setData(payload);
      setError(null);
    } catch {
      setError("Unable to load workspace. Please retry shortly.");
    } finally {
      setLoading(false);
    }
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionLoading && sessionUser) {
      void loadSnapshot();
    }
  }, [sessionLoading, sessionUser, loadSnapshot]);

  if (sessionLoading) {
    return <ProductivitySkeleton />;
  }

  if (!sessionUser) {
    return (
      <GateMessage
        title="Productivity"
        body={t("profile_login_required")}
        actionLabel={t("profile_go_to_login")}
        onAction={() => router.push("/login")}
      />
    );
  }

  if (error) {
    return (
      <GateMessage title="Workspace" body={error} actionLabel={t("generic_retry")} onAction={() => void loadSnapshot()} />
    );
  }

  if (!data || loading) {
    return <ProductivitySkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <ProductivityClient snapshot={data} userId={sessionUser.userId} onSnapshot={() => void loadSnapshot()} />
    </div>
  );
};

const ProductivitySkeleton = () => (
  <div className="mx-auto w-full max-w-6xl animate-pulse space-y-4 px-4 py-10">
    <div className="h-8 w-52 rounded-full bg-border/20" />
    <div className="h-4 w-80 rounded-full bg-border/20" />
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-40 rounded-3xl border border-border/30 bg-border/10" />
      ))}
    </div>
  </div>
);
