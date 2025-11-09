"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { create } from "zustand";
import { useSessionState } from "./session";
import { getBackend } from "@/lib/backend";
import type { MessageEvent } from "@/lib/types";
import { useI18n } from "./i18n";

const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `notif_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
};

export type NotificationKind = "message" | "system" | "marketplace";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  chatId?: string;
  link?: string;
  createdAt: number;
  read: boolean;
}

interface NotificationState {
  items: NotificationItem[];
  muted: boolean;
  mutedChats: string[];
  activeThreadId: string | null;
  add: (item: Omit<NotificationItem, "id" | "createdAt" | "read"> & Partial<Pick<NotificationItem, "id" | "createdAt" | "read">>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  markChatRead: (chatId: string) => void;
  remove: (id: string) => void;
  toggleMute: () => void;
  toggleChatMute: (chatId: string) => void;
  clear: () => void;
  setActiveThread: (chatId: string | null) => void;
  reset: () => void;
}

const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  muted: false,
  mutedChats: [],
  activeThreadId: null,
  add: (input) => {
    const id = input.id ?? makeId();
    const createdAt = input.createdAt ?? Date.now();
    set((state) => {
      if (state.items.some((item) => item.id === id)) {
        return state;
      }
      if (state.muted) {
        return state;
      }
      if (input.chatId && state.mutedChats.includes(input.chatId)) {
        return state;
      }
      const next: NotificationItem = {
        id,
        kind: input.kind,
        title: input.title,
        body: input.body,
        chatId: input.chatId,
        link: input.link,
        createdAt,
        read: input.read ?? false
      };
      return {
        ...state,
        items: [next, ...state.items].slice(0, 50)
      };
    });
  },
  markRead: (id) =>
    set((state) => ({
      ...state,
      items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item))
    })),
  markAllRead: () =>
    set((state) => ({
      ...state,
      items: state.items.map((item) => ({ ...item, read: true }))
    })),
  markChatRead: (chatId) =>
    set((state) => ({
      ...state,
      items: state.items.map((item) => (item.chatId === chatId ? { ...item, read: true } : item))
    })),
  remove: (id) =>
    set((state) => ({
      ...state,
      items: state.items.filter((item) => item.id !== id)
    })),
  toggleMute: () =>
    set((state) => ({
      ...state,
      muted: !state.muted
    })),
  toggleChatMute: (chatId) =>
    set((state) => {
      const muted = state.mutedChats.includes(chatId);
      const mutedChats = muted ? state.mutedChats.filter((id) => id !== chatId) : [...state.mutedChats, chatId];
      return { ...state, mutedChats };
    }),
  clear: () =>
    set((state) => ({
      ...state,
      items: []
    })),
  setActiveThread: (chatId) =>
    set((state) => ({
      ...state,
      activeThreadId: chatId
    })),
  reset: () =>
    set({
      items: [],
      muted: false,
      mutedChats: [],
      activeThreadId: null
    })
}));

const NotificationsContext = createContext(false);

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const user = useSessionState((state) => state.user);
  const { t } = useI18n();

  useEffect(() => {
    useNotificationStore.getState().reset();
    if (!user) {
      return;
    }
    let cancelled = false;
    const backend = getBackend();
    const preloadUnreads = async () => {
      try {
        const chats = await backend.messages.listChats({ userId: user.userId });
        for (const chat of chats) {
          if (cancelled) break;
          const thread = await backend.messages.list({ chatId: chat.chatId });
          const unread = [...thread]
            .reverse()
            .find(
              (message) =>
                message.senderId !== user.userId &&
                !message.readBy.includes(user.userId) &&
                !message.deletedAt
            );
          if (unread) {
            useNotificationStore.getState().add({
              id: unread.messageId,
              kind: "message",
              title:
                chat.title ??
                t("notifications_new_message_title"),
              body: unread.content ?? t("notifications_new_message_fallback"),
              chatId: chat.chatId,
              createdAt: unread.createdAt,
              read: false
            });
          }
        }
      } catch (error) {
        console.warn("[notifications] preload failed", error);
      }
    };
    void preloadUnreads();
    const unsubscribe = backend.messages.subscribe((event: MessageEvent) => {
      if (event.type !== "message:created") return;
      if (event.message.senderId === user.userId) return;
      const state = useNotificationStore.getState();
      if (state.muted) return;
      if (event.chatId && state.mutedChats.includes(event.chatId)) return;
      if (typeof document !== "undefined" && document.visibilityState === "visible" && state.activeThreadId === event.chatId) {
        return;
      }
      state.add({
        id: event.message.messageId,
        kind: "message",
        title: t("notifications_new_message_title"),
        body: event.message.content ?? t("notifications_new_message_fallback"),
        chatId: event.chatId
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [t, user]);

  return <NotificationsContext.Provider value={true}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = <T,>(selector: (state: NotificationState) => T): T => {
  const available = useContext(NotificationsContext);
  if (!available) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return useNotificationStore(selector);
};

export const enqueueNotification = (
  payload: Omit<NotificationItem, "id" | "createdAt" | "read"> & Partial<Pick<NotificationItem, "id" | "createdAt" | "read">>
) => {
  useNotificationStore.getState().add(payload);
};
