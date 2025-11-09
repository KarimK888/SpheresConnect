"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { getBackend } from "@/lib/backend";
import type { User } from "@/lib/types";
import { ProfilesClient } from "./ProfilesClient";

export const ProfilesGate = () => {
  const router = useRouter();
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const sessionLoading = useSessionState((state) => state.loading);

  const [directory, setDirectory] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (sessionLoading || !sessionUser) {
      setDirectory(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const backend = getBackend();

    const load = async () => {
      setLoading(true);
      try {
        const users = await backend.users.list({});
        if (!cancelled) {
          setDirectory(users);
          setError(null);
        }
      } catch (err) {
        console.error("[profiles] unable to load directory", err);
        if (!cancelled) {
          setError(t("profiles_error"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionLoading, sessionUser, reloadToken, t]);

  if (sessionLoading) {
    return <ProfilesSkeleton />;
  }

  if (!sessionUser) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-16 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">{t("profiles_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("profile_login_required")}</p>
        </div>
        <Button size="lg" onClick={() => router.push("/login")}>
          {t("profile_go_to_login")}
        </Button>
      </div>
    );
  }

  if (loading || !directory) {
    return <ProfilesSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-6 py-12 text-center">
        <Card className="border-destructive/60 bg-destructive/10 p-6 text-sm text-destructive">{error}</Card>
        <Button variant="outline" onClick={() => setReloadToken((token) => token + 1)}>
          {t("generic_retry")}
        </Button>
      </div>
    );
  }

  return <ProfilesClient initialUsers={directory} />;
};

const ProfilesSkeleton = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-12">
    <div className="h-4 w-40 animate-pulse rounded-full bg-border/30" />
    <div className="h-10 w-80 animate-pulse rounded-full bg-border/30" />
    <div className="h-64 animate-pulse rounded-3xl bg-border/20" />
  </div>
);
