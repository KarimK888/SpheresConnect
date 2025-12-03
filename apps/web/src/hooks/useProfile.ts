"use client";

import { useEffect, useState } from "react";
import type { User } from "../lib/types";
import { getBackend } from "../lib/backend";

export const useProfile = (userId: string | null | undefined) => {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const backend = getBackend();
        const result = await backend.users.get(userId);
        setProfile(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load profile");
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, [userId]);

  return { profile, loading, error };
};
