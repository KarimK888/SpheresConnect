"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getBackend } from "@/lib/backend";
import type { Artwork, User } from "@/lib/types";
import { ProfileClient } from "./ProfileClient";
import { useI18n } from "@/context/i18n";
import { useSessionState } from "@/context/session";

interface ProfileState {
  loading: boolean;
  user: User | null;
  listings: Artwork[];
  error: string | null;
}

const defaultState: ProfileState = {
  loading: true,
  user: null,
  listings: [],
  error: null
};

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const paramId = useMemo(() => {
    if (!params) return "";
    const value = params.id;
    return Array.isArray(value) ? value[0] : value ?? "";
  }, [params]);

  const sessionUser = useSessionState((state) => state.user);
  const { t } = useI18n();
  const [state, setState] = useState<ProfileState>({ ...defaultState });

  useEffect(() => {
    if (!paramId) {
      setState({ ...defaultState, loading: false, error: "missing_id" });
      return;
    }

    let cancelled = false;
    const backend = getBackend();

    const load = async () => {
      setState({ ...defaultState });
      try {
        const fetchedUser = await backend.users.get(paramId);
        const user = fetchedUser ?? (sessionUser?.userId === paramId ? sessionUser : null);

        if (!user) {
          if (!cancelled) {
            setState({ ...defaultState, loading: false, error: "not_found" });
          }
          return;
        }

        const dashboard = await backend.marketplace.getDashboard(user.userId);
        if (!cancelled) {
          setState({
            loading: false,
            user,
            listings: dashboard.listings,
            error: null
          });
        }
      } catch (error) {
        console.error("Failed to load profile", error);
        if (!cancelled) {
          setState({ ...defaultState, loading: false, error: "unexpected" });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [paramId, sessionUser]);

  if (state.loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
        <div className="h-10 w-48 animate-pulse rounded-full bg-border/40" />
        <div className="h-96 animate-pulse rounded-3xl bg-border/20" />
      </div>
    );
  }

  if (state.error === "missing_id") {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-12 text-sm text-muted-foreground">
        {t("profile_invalid_id")}
      </div>
    );
  }

  if (state.error === "not_found") {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-12 text-sm text-muted-foreground">
        {t("profile_not_found")}
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-12 text-sm text-muted-foreground">
        {t("profile_error_message")}
      </div>
    );
  }

  if (!state.user) {
    return null;
  }

  return <ProfileClient user={state.user} listings={state.listings} viewerId={sessionUser?.userId} />;
}
