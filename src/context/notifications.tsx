"use client";

import { createContext, useContext, useEffect } from "react";
import { create } from "zustand";
import { useSessionState } from "./session";
import { getBackend } from "@/lib/backend";
import type { MessageEvent, NotificationEntry } from "@/lib/types";
import { useI18n } from "./i18n";

const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `notif_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
};

export type NotificationKind = "message" | "system" | "marketplace";

export const NOTIFICATION_HISTORY_WINDOW_MS = 1000 * 60 * 60 * 24 * 3;
const HISTORY_LIMIT = 100;
let notificationsUserId: string | null = null;

const persistMarkState = (ids: string[] | undefined, read: boolean) => {
  if (!notificationsUserId) {
    return;
  }
  try {
    const backend = getBackend();
    void backend.notifications
      .markRead({ userId: notificationsUserId, ids, read })
      .catch((error) => console.warn("[notifications] markRead sync failed", error));
  } catch (error) {
    console.warn("[notifications] markRead sync error", error);
  }
};

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  chatId?: string;
  link?: string;
  linkLabel?: string;
  secondaryLink?: string;
  secondaryLinkLabel?: string;
  createdAt: number;
  read: boolean;
}

const mapEntryToNotification = (entry: NotificationEntry): NotificationItem => {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const chatId = typeof metadata.chatId === "string" ? metadata.chatId : undefined;
  return {
    id: entry.notificationId,
    kind: (entry.kind as NotificationKind) ?? "system",
    title: entry.title,
    body: entry.body ?? "",
    chatId,
    link: entry.link ?? undefined,
    linkLabel: entry.linkLabel ?? undefined,
    secondaryLink: entry.secondaryLink ?? undefined,
    secondaryLinkLabel: entry.secondaryLinkLabel ?? undefined,
    createdAt: entry.createdAt,
    read: entry.readAt ? true : false
  };
};

interface NotificationState {
  items: NotificationItem[];
  muted: boolean;
  mutedChats: string[];
  activeThreadId: string | null;
  hydrate: (items: NotificationItem[]) => void;
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

const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  muted: false,
  mutedChats: [],
  activeThreadId: null,
  hydrate: (incoming) => {
    if (!incoming.length) {
      return;
    }
    const cutoff = Date.now() - NOTIFICATION_HISTORY_WINDOW_MS;
    set((state) => {
      const merged = new Map<string, NotificationItem>();
      [...incoming, ...state.items].forEach((item) => {
        if (item.createdAt < cutoff) return;
        const current = merged.get(item.id);
        if (!current || item.createdAt >= current.createdAt) {
          merged.set(item.id, item);
        }
      });
      return {
        ...state,
        items: Array.from(merged.values())
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, HISTORY_LIMIT)
      };
    });
  },
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
        linkLabel: input.linkLabel,
        secondaryLink: input.secondaryLink,
        secondaryLinkLabel: input.secondaryLinkLabel,
        createdAt,
        read: input.read ?? false
      };
      const cutoff = Date.now() - NOTIFICATION_HISTORY_WINDOW_MS;
      const updatedItems = [next, ...state.items]
        .filter((entry) => entry.createdAt >= cutoff)
        .slice(0, HISTORY_LIMIT);
      return {
        ...state,
        items: updatedItems
      };
    });
  },
  markRead: (id) =>
    set((state) => {
      const changed = state.items.some((item) => item.id === id && !item.read);
      if (changed) {
        persistMarkState([id], true);
      }
      return {
        ...state,
        items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item))
      };
    }),
  markAllRead: () =>
    set((state) => {
      const hasUnread = state.items.some((item) => !item.read);
      if (hasUnread) {
        persistMarkState(undefined, true);
      }
      return {
        ...state,
        items: state.items.map((item) => ({ ...item, read: true }))
      };
    }),
  markChatRead: (chatId) =>
    set((state) => {
      const ids = state.items.filter((item) => item.chatId === chatId && !item.read).map((item) => item.id);
      if (ids.length) {
        persistMarkState(ids, true);
      }
      return {
        ...state,
        items: state.items.map((item) => (item.chatId === chatId ? { ...item, read: true } : item))
      };
    }),
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

  useEffect(() => {
    notificationsUserId = user?.userId ?? null;
    const store = useNotificationStore.getState();
    store.reset();
    if (!user) {
      return;
    }
    let cancelled = false;
    const backend = getBackend();
    const sync = async () => {
      try {
        const since = Date.now() - NOTIFICATION_HISTORY_WINDOW_MS;
        const entries = await backend.notifications.list({ userId: user.userId, since, limit: HISTORY_LIMIT });
        if (cancelled) return;
        store.hydrate(entries.map(mapEntryToNotification));
      } catch (error) {
        if (!cancelled) {
          console.warn("[notifications] sync failed", error);
        }
      }
    };
    void sync();
    if (typeof window === "undefined") {
      return () => {
        cancelled = true;
      };
    }
    const id = window.setInterval(() => {
      void sync();
    }, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user]);

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
