"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff } from "lucide-react";
import { useNotifications } from "@/context/notifications";
import { useI18n } from "@/context/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }).format(timestamp);

export const NotificationBell = () => {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const unreadCount = useNotifications((state) => state.items.filter((item) => !item.read).length);
  const items = useNotifications((state) => state.items);
  const muted = useNotifications((state) => state.muted);
  const mutedChats = useNotifications((state) => state.mutedChats);
  const toggleMute = useNotifications((state) => state.toggleMute);
  const toggleChatMute = useNotifications((state) => state.toggleChatMute);
  const markAllRead = useNotifications((state) => state.markAllRead);
  const markRead = useNotifications((state) => state.markRead);
  const markChatRead = useNotifications((state) => state.markChatRead);
  const setActiveThread = useNotifications((state) => state.setActiveThread);

  const recentItems = useMemo(() => items.slice(0, 10), [items]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      markAllRead();
    }
  }, [open, markAllRead]);

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          "relative rounded-full border border-border px-3 py-2 text-white transition-colors hover:bg-border/40",
          muted && "text-muted-foreground"
        )}
        onClick={() => setOpen((value) => !value)}
      >
        {muted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent text-xs text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 z-50 mt-3 w-80 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-2xl"
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span>{t("notifications_title")}</span>
            <button type="button" className="text-white" onClick={toggleMute}>
              {muted ? t("notifications_unmute_all") : t("notifications_mute_all")}
            </button>
          </div>
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {recentItems.length ? (
              recentItems.map((item) => {
                const chatMuted = item.chatId ? mutedChats.includes(item.chatId) : false;
                const handleNavigate = () => {
                  markRead(item.id);
                  if (item.chatId) {
                    markChatRead(item.chatId);
                    setActiveThread(item.chatId);
                    router.push(`/messages?chat=${item.chatId}`);
                  }
                  setOpen(false);
                };
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "space-y-1 rounded-xl border border-border/50 bg-background/60 p-3 text-sm",
                      !item.read && "border-accent/60 bg-accent/10",
                      item.chatId && "cursor-pointer hover:border-accent/80"
                    )}
                    onClick={() => {
                      if (item.chatId) {
                        handleNavigate();
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white">{item.title}</p>
                      <span className="text-[11px] text-muted-foreground">{formatTime(item.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.body}</p>
                    {item.chatId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleChatMute(item.chatId!);
                        }}
                      >
                        {chatMuted ? t("notifications_unmute_thread") : t("notifications_mute_thread")}
                      </Button>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-muted-foreground">{t("notifications_empty")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
