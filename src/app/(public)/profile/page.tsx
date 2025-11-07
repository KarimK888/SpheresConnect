"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getBackend } from "@/lib/backend";
import type { Artwork, User } from "@/lib/types";
import { ProfileClient } from "./[id]/ProfileClient";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { useAuth } from "@/hooks/useAuth";

interface ProfileState {
  loading: boolean;
  user: User | null;
  listings: Artwork[];
  error: string | null;
}

const initialState: ProfileState = {
  loading: true,
  user: null,
  listings: [],
  error: null
};

export default function CurrentProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { logout } = useAuth();
  const sessionUser = useSessionState((state) => state.user);
  const setSessionUser = useSessionState((state) => state.setUser);
  const [state, setState] = useState<ProfileState>({ ...initialState });

  const userId = useMemo(() => sessionUser?.userId ?? null, [sessionUser]);

  useEffect(() => {
    if (!userId) {
      setState((prev) => ({ ...prev, loading: false, error: "unauthenticated" }));
      return;
    }

    let cancelled = false;
    const backend = getBackend();

    const load = async () => {
      setState({ ...initialState });
      try {
        const fetchedUser = await backend.users.get(userId);
        const user = fetchedUser ?? sessionUser;

        if (!user) {
          if (!cancelled) {
            setState({ ...initialState, loading: false, error: "not_found" });
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
        console.error("Failed to load current profile", error);
        if (!cancelled) {
          setState({ ...initialState, loading: false, error: "unexpected" });
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionUser, userId]);

  const handleUserUpdated = useCallback(
    (next: User) => {
      setState((prev) => ({ ...prev, user: next }));
      setSessionUser(next);
    },
    [setSessionUser]
  );

  if (state.loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
        <div className="h-10 w-48 animate-pulse rounded-full bg-border/40" />
        <div className="h-96 animate-pulse rounded-3xl bg-border/20" />
      </div>
    );
  }

  if (state.error === "unauthenticated") {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-6 py-12 text-sm text-muted-foreground">
        <p>{t("profile_login_required")}</p>
        <Button variant="outline" onClick={() => router.push("/login")}>
          {t("profile_go_to_login")}
        </Button>
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t("profile_welcome", { name: state.user.displayName ?? t("nav_profile_fallback") })}
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await logout();
            router.push("/");
          }}
        >
          {t("profile_sign_out")}
        </Button>
      </div>
      <ProfileClient user={state.user} listings={state.listings} viewerId={userId} onUserUpdated={handleUserUpdated} />
    </div>
  );
}
