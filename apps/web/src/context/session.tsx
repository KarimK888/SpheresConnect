"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo
} from "react";
import { create } from "zustand";
import type { User } from "../lib/types";
import { getBackend } from "../lib/backend";

interface SessionStoreState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

const useSessionStore = create<SessionStoreState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading })
}));

interface SessionContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithOAuth: (provider: "google" | "apple" | "github", token: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const user = useSessionStore((state) => state.user);
  const loading = useSessionStore((state) => state.loading);
  const setUser = useSessionStore((state) => state.setUser);
  const setLoading = useSessionStore((state) => state.setLoading);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        const backend = getBackend();
        const session = await backend.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Failed to bootstrap session", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [setLoading, setUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const backend = getBackend();
      const session = await backend.auth.login({ email, password });
      setUser(session.user);
      return session.user;
    },
    [setUser]
  );

  const loginWithOAuth = useCallback(
    async (provider: "google" | "apple" | "github", token: string) => {
      const backend = getBackend();
      const session = await backend.auth.oauth({ provider, token });
      setUser(session.user);
      return session.user;
    },
    [setUser]
  );

  const logout = useCallback(async () => {
    const backend = getBackend();
    await backend.auth.logout();
    setUser(null);
  }, [setUser]);

  const refresh = useCallback(async () => {
    const backend = getBackend();
    const session = await backend.auth.getSession();
    setUser(session?.user ?? null);
  }, [setUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithOAuth,
      logout,
      refresh
    }),
    [user, loading, login, loginWithOAuth, logout, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export const useSessionState = useSessionStore;
