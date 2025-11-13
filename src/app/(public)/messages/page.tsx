"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  BellOff,
  Calendar,
  CheckCheck,
  Clock,
  Download,
  Edit3,
  FileText,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pin,
  Plus,
  QrCode,
  Search,
  Send,
  Share2,
  Shield,
  Smile,
  Trash2,
  UserPlus
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/context/i18n";
import { getBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type {
  Chat,
  ChatAttachment,
  ChatMessage,
  MessageEvent,
  MessageReaction,
  User
} from "@/lib/types";
import { useNotifications } from "@/context/notifications";

const REACTIONS = [
  "\u{1F44D}",
  "\u{1F525}",
  "\u{2764}\u{FE0F}",
  "\u{1F44F}",
  "\u{1F602}",
  "\u{1F389}",
  "\u{1F914}",
  "\u{1F64C}"
] as const;

const formatTimestamp = (value: number) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(value);

type Directory = Record<string, User>;
type TypingState = Record<string, Record<string, number>>;

interface DraftPollOption {
  id: string;
  label: string;
}

interface DraftPoll {
  question: string;
  options: DraftPollOption[];
  expiresAt?: string;
}

interface SidebarChat extends Chat {
  unreadCount: number;
  lastMessage?: ChatMessage;
  pinned: boolean;
  archived: boolean;
}

const makeLocalId = () => `local_${Math.random().toString(36).slice(2, 10)}`;

const resolveAttachmentType = (file: File): ChatAttachment["type"] => {
  const { type, name } = file;
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "image/gif" || name.toLowerCase().endsWith(".gif")) return "gif";
  if (name.toLowerCase().endsWith(".webp")) return "sticker";
  return "document";
};

const MessagesPageContent = () => {
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const backend = useMemo(() => getBackend(), []);
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatParam = searchParams?.get("chat") ?? null;

  const [directory, setDirectory] = useState<Directory>({});
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({});
  const [participantsByChat, setParticipantsByChat] = useState<Record<string, User[]>>({});
  const [typingByChat, setTypingByChat] = useState<TypingState>({});

  const [chatSearch, setChatSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");

  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isSilent, setIsSilent] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [draftPoll, setDraftPoll] = useState<DraftPoll>({ question: "", options: [] });
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState("");
  const [newChatResults, setNewChatResults] = useState<User[]>([]);
  const [newChatLoading, setNewChatLoading] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);
  const [participantManagerOpen, setParticipantManagerOpen] = useState(false);
  const [detailView, setDetailView] = useState<"timeline" | "moderation">("timeline");
  const [headerNotice, setHeaderNotice] = useState<string | null>(null);
  const [qrShareLink, setQrShareLink] = useState<string | null>(null);

  useEffect(() => {
    if (!headerNotice) return;
    const timer = setTimeout(() => setHeaderNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [headerNotice]);
  const [showArchived, setShowArchived] = useState(false);
  const [chatBusy, setChatBusy] = useState<string | null>(null);
  const mutedChats = useNotifications((state) => state.mutedChats);
  const toggleNotificationsForChat = useNotifications((state) => state.toggleChatMute);
  const markChatNotificationsRead = useNotifications((state) => state.markChatRead);
  const setActiveNotificationThread = useNotifications((state) => state.setActiveThread);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedParticipants = useMemo(
    () => (selectedChatId ? participantsByChat[selectedChatId] ?? [] : []),
    [participantsByChat, selectedChatId]
  );
  const manageableParticipants = useMemo(
    () => selectedParticipants.filter((participant) => participant.userId !== user?.userId),
    [selectedParticipants, user?.userId]
  );

  useEffect(() => {
    const loadDirectory = async () => {
      const list = await backend.users.list({});
      const map = list.reduce<Directory>((acc, item) => {
        acc[item.userId] = item;
        return acc;
      }, {});
      setDirectory(map);
    };
    void loadDirectory();
  }, [backend]);

  const refreshChats = useCallback(async () => {
    if (!user) return;
    const raw = await backend.messages.listChats({ userId: user.userId });
    setChats(raw);
  }, [backend.messages, user]);

  useEffect(() => {
    void refreshChats();
  }, [refreshChats]);

  useEffect(() => {
    if (!chats.length) {
      if (selectedChatId) {
        setSelectedChatId(null);
      }
      return;
    }
    if (chatParam) {
      const match = chats.find((chat) => chat.chatId === chatParam);
      if (match && selectedChatId !== chatParam) {
        setSelectedChatId(chatParam);
        return;
      }
    }
    if (!selectedChatId) {
      setSelectedChatId(chats[0].chatId);
      return;
    }
    if (!chats.some((chat) => chat.chatId === selectedChatId)) {
      setSelectedChatId(chats[0].chatId);
    }
  }, [chatParam, chats, selectedChatId]);

  const loadMessages = useCallback(
    async (chatId: string) => {
      const items = await backend.messages.list({ chatId });
      setMessagesByChat((prev) => ({ ...prev, [chatId]: items }));
    },
    [backend]
  );

  useEffect(() => {
    if (!selectedChatId) return;
    void loadMessages(selectedChatId);
  }, [loadMessages, selectedChatId]);

  useEffect(() => {
    if (!newChatOpen) {
      setNewChatResults([]);
      setNewChatError(null);
      return;
    }
    const term = newChatQuery.trim();
    if (term.length < 2) {
      setNewChatResults([]);
      setNewChatError(null);
      return;
    }
    let active = true;
    setNewChatLoading(true);
    setNewChatError(null);
    backend.users
      .list({ query: term })
      .then((users) => {
        if (!active) return;
        const filtered = users.filter((candidate) => candidate.userId !== user?.userId);
        setDirectory((prev) => {
          const next = { ...prev };
          filtered.forEach((person) => {
            next[person.userId] = person;
          });
          return next;
        });
        setNewChatResults(filtered);
      })
      .catch((error) => {
        if (!active) return;
        setNewChatResults([]);
        setNewChatError(error instanceof Error ? error.message : t("messages_new_chat_error"));
      })
      .finally(() => {
        if (active) {
          setNewChatLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [backend.users, newChatOpen, newChatQuery, t, user?.userId]);

  useEffect(() => {
    const hydrateParticipants = async () => {
      const pairs = await Promise.all(
        chats.map(async (chat) => {
          const members = await Promise.all(chat.memberIds.map((id) => backend.users.get(id)));
          return [chat.chatId, members.filter(Boolean) as User[]] as const;
        })
      );
      setParticipantsByChat((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    };
    if (chats.length) {
      void hydrateParticipants();
    }
  }, [backend, chats]);

  useEffect(() => {
    const unsubscribe = backend.messages.subscribe((event: MessageEvent) => {
      if (event.type === "message:created" || event.type === "message:updated" || event.type === "message:pinned") {
        setMessagesByChat((prev) => {
          const list = prev[event.chatId] ?? [];
          const index = list.findIndex((item) => item.messageId === event.message.messageId);
          const next = index >= 0 ? [...list] : [...list, event.message];
          if (index >= 0) {
            next[index] = event.message;
          }
          next.sort((a, b) => a.createdAt - b.createdAt);
          return { ...prev, [event.chatId]: next };
        });
        return;
      }
      if (event.type === "message:deleted") {
        setMessagesByChat((prev) => {
          const list = prev[event.chatId] ?? [];
          const next = list.map((item) =>
            item.messageId === event.message.messageId ? event.message : item
          );
          return { ...prev, [event.chatId]: next };
        });
        return;
      }
      if (event.type === "reaction:added" || event.type === "reaction:removed") {
        setMessagesByChat((prev) => {
          const list = prev[event.chatId] ?? [];
          const next = list.map((item) => {
            if (item.messageId !== event.messageId) return item;
            if (event.type === "reaction:added") {
              const exists = item.reactions.some(
                (reaction) => reaction.userId === event.reaction.userId && reaction.emoji === event.reaction.emoji
              );
              if (exists) return item;
              return { ...item, reactions: [...item.reactions, event.reaction] };
            }
            return {
              ...item,
              reactions: item.reactions.filter(
                (reaction) => !(reaction.userId === event.reaction.userId && reaction.emoji === event.reaction.emoji)
              )
            };
          });
          return { ...prev, [event.chatId]: next };
        });
        return;
      }
      if (event.type === "read") {
        setMessagesByChat((prev) => {
          const list = prev[event.chatId] ?? [];
          const next = list.map((item) => {
            if (item.messageId !== event.messageId) return item;
            if (item.readBy.includes(event.userId)) return item;
            return { ...item, readBy: [...item.readBy, event.userId] };
          });
          return { ...prev, [event.chatId]: next };
        });
        return;
      }
      if (event.type === "typing") {
        setTypingByChat((prev) => ({
          ...prev,
          [event.chatId]: {
            ...(prev[event.chatId] ?? {}),
            [event.userId]: event.isTyping ? event.expiresAt : 0
          }
        }));
      }
      if (event.type === "chat:updated") {
        setChats((prev) => {
          const exists = prev.some((chat) => chat.chatId === event.chat.chatId);
          return exists ? prev.map((chat) => (chat.chatId === event.chat.chatId ? event.chat : chat)) : prev;
        });
        return;
      }
      if (event.type === "chat:removed") {
        setChats((prev) => prev.filter((chat) => chat.chatId !== event.chatId));
        setSelectedChatId((current) => (current === event.chatId ? null : current));
      }
    });
    return unsubscribe;
  }, [backend.messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingByChat((prev) => {
        const next: TypingState = {};
        Object.entries(prev).forEach(([chatId, map]) => {
          const filtered = Object.fromEntries(
            Object.entries(map).filter(([, expires]) => expires > now)
          );
          if (Object.keys(filtered).length) {
            next[chatId] = filtered;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user || !selectedChatId) return;
    const list = messagesByChat[selectedChatId] ?? [];
    list.forEach((message) => {
      if (message.senderId === user.userId) return;
      if (message.readBy.includes(user.userId)) return;
      void backend.messages.markRead({ chatId: selectedChatId, messageId: message.messageId, userId: user.userId });
    });
  }, [backend.messages, messagesByChat, selectedChatId, user]);

  const sendTypingSignal = useCallback(
    (isTyping: boolean) => {
      if (!user || !selectedChatId) return;
      void backend.messages.typing({ chatId: selectedChatId, userId: user.userId, isTyping });
    },
    [backend.messages, selectedChatId, user]
  );

  useEffect(() => {
    if (!draft.trim()) return;
    sendTypingSignal(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => sendTypingSignal(false), 2000);
  }, [draft, sendTypingSignal]);

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setMessageSearch("");
    setDraft("");
    setAttachments([]);
    setScheduledAt("");
    setIsSilent(false);
    setEditingMessage(null);
    setShowPollBuilder(false);
    setDraftPoll({ question: "", options: [] });
    setReactionPickerFor(null);
  };

  const ensureChatParticipants = useCallback(
    async (chat: Chat) => {
      const members = await Promise.all(chat.memberIds.map((id) => backend.users.get(id)));
      const resolved = members.filter((value): value is User => Boolean(value));
      if (resolved.length) {
        setDirectory((prev) => {
          const next = { ...prev };
          resolved.forEach((person) => {
            next[person.userId] = person;
          });
          return next;
        });
        setParticipantsByChat((prev) => ({ ...prev, [chat.chatId]: resolved }));
      }
    },
    [backend.users]
  );

  const handleStartChatWithUser = useCallback(
    async (target: User) => {
      if (!user) return;
      setNewChatError(null);
      setNewChatLoading(true);
      try {
        const existing = chats.find(
          (chat) =>
            !chat.isGroup &&
            chat.memberIds.length === 2 &&
            chat.memberIds.includes(user.userId) &&
            chat.memberIds.includes(target.userId)
        );
        const chat =
          existing ??
          (await backend.messages.createChat({
            memberIds: Array.from(new Set([user.userId, target.userId])),
            isGroup: false
          }));
        setChats((prev) => {
          if (existing) {
            return prev;
          }
          return [chat, ...prev];
        });
        await ensureChatParticipants(chat);
        setSelectedChatId(chat.chatId);
        setNewChatOpen(false);
        setNewChatQuery("");
        setNewChatResults([]);
      } catch (error) {
        setNewChatError(error instanceof Error ? error.message : t("messages_new_chat_error"));
      } finally {
        setNewChatLoading(false);
      }
    },
    [backend.messages, chats, ensureChatParticipants, t, user]
  );

  const handleViewParticipant = useCallback(
    (participantId: string) => {
      setParticipantManagerOpen(false);
      router.push(`/profile/${participantId}?from=messages`);
    },
    [router]
  );

  useEffect(() => {
    if (selectedChatId) {
      setActiveNotificationThread(selectedChatId);
      markChatNotificationsRead(selectedChatId);
    } else {
      setActiveNotificationThread(null);
    }
  }, [markChatNotificationsRead, selectedChatId, setActiveNotificationThread]);

  const togglePinChat = (chatId: string) => {
    setPinnedChats((prev) => (prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]));
  };

  const handleArchiveChat = useCallback(
    async (chatId: string, archived: boolean) => {
      if (!user) return;
      setChatBusy(chatId);
      try {
        const updated = await backend.messages.archiveChat({ chatId, userId: user.userId, archived });
        setChats((prev) => {
          const next = prev.map((chat) =>
            chat.chatId === chatId ? { ...chat, archivedBy: updated.archivedBy } : chat
          );
          if (!showArchived && archived && selectedChatId === chatId) {
            const fallback = next.find(
              (chat) => !chat.archivedBy.includes(user.userId) && chat.chatId !== chatId
            );
            setSelectedChatId(fallback?.chatId ?? null);
          }
          return next;
        });
      } finally {
        setChatBusy(null);
      }
    },
    [backend.messages, selectedChatId, showArchived, user]
  );

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      if (!user) return;
      setChatBusy(chatId);
      try {
        await backend.messages.removeChat({ chatId, userId: user.userId });
        setChats((prev) => {
          const next = prev.filter((chat) => chat.chatId !== chatId);
          if (selectedChatId === chatId) {
            setSelectedChatId(next[0]?.chatId ?? null);
          }
          return next;
        });
        setParticipantsByChat((prev) => {
          const next = { ...prev };
          delete next[chatId];
          return next;
        });
        setMessagesByChat((prev) => {
          const next = { ...prev };
          delete next[chatId];
          return next;
        });
      } finally {
        setChatBusy(null);
      }
    },
    [backend.messages, selectedChatId, user]
  );

  const handleClearPinned = async () => {
    if (!user || !selectedChatId || !pinnedMessages.length) return;
    await Promise.all(
      pinnedMessages.map((message) =>
        backend.messages.pin({
          chatId: selectedChatId,
          messageId: message.messageId,
          pinned: false,
          userId: user.userId
        })
      )
    );
  };

  const handleAttachmentInput = (files: FileList | null) => {
    if (!files?.length) return;
    const payload: ChatAttachment[] = [];
    Array.from(files).forEach((file) => {
      payload.push({
        attachmentId: makeLocalId(),
        type: resolveAttachmentType(file),
        url: URL.createObjectURL(file),
        name: file.name,
        sizeBytes: file.size
      });
    });
    setAttachments((prev) => [...prev, ...payload]);
  };

  const resetComposer = () => {
    setDraft("");
    setAttachments([]);
    setIsSilent(false);
    setScheduledAt("");
    setEditingMessage(null);
    setShowPollBuilder(false);
    setDraftPoll({ question: "", options: [] });
    setReactionPickerFor(null);
    sendTypingSignal(false);
  };

  const handleSend = async () => {
    if (!user || !selectedChatId) return;
    const trimmed = draft.trim();
    const hasPoll = draftPoll.question.trim().length > 0;
    if (!trimmed && attachments.length === 0 && !hasPoll) return;

    const metadata = hasPoll
      ? {
          poll: {
            question: draftPoll.question.trim(),
            options: draftPoll.options.map((option) => ({ ...option, votes: [] })),
            createdBy: user.displayName ?? user.userId,
            expiresAt: draftPoll.expiresAt ? new Date(draftPoll.expiresAt).getTime() : undefined
          }
        }
      : undefined;

    if (editingMessage) {
      await backend.messages.update({
        chatId: selectedChatId,
        messageId: editingMessage.messageId,
        userId: user.userId,
        content: trimmed || undefined,
        metadata
      });
      resetComposer();
      return;
    }

    const scheduled = scheduledAt ? new Date(scheduledAt).getTime() : undefined;
    if (scheduled && scheduled < Date.now()) {
      return;
    }

    await backend.messages.send({
      chatId: selectedChatId,
      senderId: user.userId,
      content: trimmed || undefined,
      attachments,
      metadata,
      isSilent,
      scheduledFor: scheduled,
      expiresAt: undefined
    });
    resetComposer();
  };

  const handleReaction = async (message: ChatMessage, emoji: string) => {
    if (!user || !selectedChatId) return;
    const exists = message.reactions.some(
      (reaction) => reaction.userId === user.userId && reaction.emoji === emoji
    );
    if (exists) {
      await backend.messages.removeReaction({
        chatId: selectedChatId,
        messageId: message.messageId,
        userId: user.userId,
        emoji
      });
    } else {
      await backend.messages.addReaction({
        chatId: selectedChatId,
        messageId: message.messageId,
        userId: user.userId,
        emoji
      });
    }
  };

  const handleDelete = async (message: ChatMessage, hardDelete = false) => {
    if (!user || !selectedChatId) return;
    await backend.messages.remove({
      chatId: selectedChatId,
      messageId: message.messageId,
      userId: user.userId,
      hardDelete
    });
  };

const handlePinMessage = async (message: ChatMessage, pinned: boolean) => {
  if (!user || !selectedChatId) return;
  await backend.messages.pin({
    chatId: selectedChatId,
    messageId: message.messageId,
    pinned,
    userId: user.userId
  });
};

const getChatLink = useCallback(() => {
    if (typeof window === "undefined" || !selectedChatId) return null;
    return `${window.location.origin}/messages?chat=${selectedChatId}`;
  }, [selectedChatId]);

  const handleShareLink = useCallback(async () => {
    const link = getChatLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setHeaderNotice(t("messages_link_copied"));
    } catch {
      setHeaderNotice(link);
    }
  }, [getChatLink, t]);

  const handleOpenQrPanel = useCallback(() => {
    const link = getChatLink();
    if (!link) return;
    setQrShareLink(link);
}, [getChatLink]);

  const handleModerationMute = useCallback(() => {
    if (!selectedChatId) return;
    toggleNotificationsForChat(selectedChatId);
    setHeaderNotice(
      mutedChats.includes(selectedChatId) ? t("messages_notifications_on") : t("messages_notifications_off")
    );
  }, [mutedChats, selectedChatId, t, toggleNotificationsForChat]);

  const handleModerationArchive = useCallback(() => {
    if (!selectedChatId) return;
    void handleArchiveChat(selectedChatId, true);
  }, [handleArchiveChat, selectedChatId]);

  const handleModerationDelete = useCallback(() => {
    if (!selectedChatId) return;
    void handleDeleteChat(selectedChatId);
  }, [handleDeleteChat, selectedChatId]);

  const visibleChats = useMemo<SidebarChat[]>(() => {
    const normalized = chatSearch.trim().toLowerCase();
    return chats
      .map((chat) => {
        const thread = messagesByChat[chat.chatId] ?? [];
        const lastMessage = thread[thread.length - 1];
        const unread = user
          ? thread.filter((item) => !item.readBy.includes(user.userId) && item.senderId !== user.userId).length
          : 0;
        const archived = Boolean(user && chat.archivedBy.includes(user.userId));
        return {
          ...chat,
          unreadCount: unread,
          lastMessage,
          pinned: pinnedChats.includes(chat.chatId),
          archived
        };
      })
      .filter((chat) => {
        if (!showArchived && chat.archived) return false;
        if (!normalized) return true;
        const title =
          chat.title ??
          chat.memberIds
            .map((id) => directory[id]?.displayName ?? id)
            .join(", ");
        return title.toLowerCase().includes(normalized);
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.archived !== b.archived) return a.archived ? 1 : -1;
        const aTime = a.lastMessage?.createdAt ?? 0;
        const bTime = b.lastMessage?.createdAt ?? 0;
        return bTime - aTime;
      });
  }, [chatSearch, chats, directory, messagesByChat, pinnedChats, showArchived, user]);

  const filteredMessages = useMemo(() => {
    if (!selectedChatId) return [] as ChatMessage[];
    const list = messagesByChat[selectedChatId] ?? [];
    const normalized = messageSearch.trim().toLowerCase();
    if (!normalized) return list;
    return list.filter((message) => {
      if (message.content?.toLowerCase().includes(normalized)) return true;
      const poll = message.metadata?.poll as { question?: string; options?: { label: string }[] } | undefined;
      if (poll?.question?.toLowerCase().includes(normalized)) return true;
      if (poll?.options?.some((option) => option.label.toLowerCase().includes(normalized))) return true;
      return false;
    });
  }, [messageSearch, messagesByChat, selectedChatId]);

  const pinnedMessages = useMemo(() => {
    if (!selectedChatId) return [] as ChatMessage[];
    return (messagesByChat[selectedChatId] ?? []).filter((message) => message.pinned && !message.deletedAt);
  }, [messagesByChat, selectedChatId]);

  const typingNames = useMemo(() => {
    if (!selectedChatId) return "";
    const now = Date.now();
    const map = typingByChat[selectedChatId] ?? {};
    const ids = Object.entries(map)
      .filter(([, expires]) => expires > now)
      .map(([id]) => id)
      .filter((id) => id !== user?.userId);
    return ids.map((id) => directory[id]?.displayName ?? id).join(", ");
  }, [directory, selectedChatId, typingByChat, user?.userId]);

  const composerDisabled = !selectedChatId;

  const timelineEntries = useMemo(() => {
    if (!selectedChatId) return [];
    const list = messagesByChat[selectedChatId] ?? [];
    return list
      .slice(-5)
      .reverse()
      .map((message) => ({
        id: message.messageId,
        author: directory[message.senderId]?.displayName ?? message.senderId,
        preview: message.content ?? t("messages_attachment"),
        at: formatTimestamp(message.createdAt)
      }));
  }, [directory, messagesByChat, selectedChatId, t]);

  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-6 py-10">
        <Card className="w-full p-6 text-center text-sm text-muted-foreground">{t("messages_auth_required")}</Card>
        <Button variant="outline" asChild>
          <a href="/login">{t("messages_go_to_login")}</a>
        </Button>
      </div>
    );
  }

  return (
    <>
    <div className="mx-auto flex h-[calc(100vh-160px)] w-full max-w-6xl gap-4 px-6 py-8">
      <aside className="flex w-72 flex-shrink-0 flex-col gap-4 rounded-2xl border border-border/60 bg-card/70 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("messages_threads")}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowArchived((value) => !value)}
            className={cn("hover:text-white", showArchived ? "text-accent" : "text-muted-foreground")}
            title={showArchived ? t("messages_hide_archived") : t("messages_show_archived")}
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={chatSearch}
            onChange={(event) => setChatSearch(event.target.value)}
            placeholder={t("messages_search_chats")}
            className="pl-9"
          />
        </div>
        <div className="flex-1 space-y-2 overflow-auto pr-1">
          {visibleChats.map((chat) => {
            const isActive = chat.chatId === selectedChatId;
            const title =
              chat.title ??
              chat.memberIds
                .map((id) => directory[id]?.displayName ?? id)
                .join(", ");
            const handleKeyPress = (event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleSelectChat(chat.chatId);
              }
            };

            return (
              <div
                key={chat.chatId}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectChat(chat.chatId)}
                onKeyDown={handleKeyPress}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                  isActive ? "border-accent bg-accent/10 text-white" : "border-border/40 bg-background/40 hover:border-border",
                  chat.archived && !isActive ? "opacity-80" : ""
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="font-medium text-white">{title}</span>
                    {chat.archived && (
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        {t("messages_archived_badge")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {chat.unreadCount > 0 && (
                      <span className="rounded-full bg-accent/80 px-2 py-0.5 text-xs text-white">{chat.unreadCount}</span>
                    )}
                    <button
                      type="button"
                      className={cn(
                        "rounded-full p-1 transition-colors",
                        chat.pinned ? "text-accent" : "text-muted-foreground hover:text-white"
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        togglePinChat(chat.chatId);
                      }}
                      title={chat.pinned ? t("messages_unpin_chat") : t("messages_pin_chat")}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full p-1 transition-colors",
                        chat.archived ? "text-accent" : "text-muted-foreground hover:text-white",
                        chatBusy === chat.chatId ? "opacity-50" : ""
                      )}
                      disabled={chatBusy === chat.chatId}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleArchiveChat(chat.chatId, !chat.archived);
                      }}
                      title={chat.archived ? t("messages_unarchive_chat") : t("messages_archive_chat")}
                    >
                      <Archive className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full p-1 text-muted-foreground transition-colors hover:text-white",
                        chatBusy === chat.chatId ? "opacity-50" : ""
                      )}
                      disabled={chatBusy === chat.chatId}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteChat(chat.chatId);
                      }}
                      title={t("messages_delete_chat")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {chat.lastMessage && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {(directory[chat.lastMessage.senderId]?.displayName ?? chat.lastMessage.senderId) + ": "}
                    {chat.lastMessage.content ?? t("messages_attachment")}
                  </p>
                )}
              </div>
            );
          })}
          {!visibleChats.length && (
            <Card className="border-dashed bg-transparent p-4 text-center text-xs text-muted-foreground">
              {t("messages_no_chats")}
            </Card>
          )}
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setNewChatOpen((value) => !value)}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {t("messages_new_chat")}
        </Button>
        {newChatOpen && (
          <Card className="space-y-3 border-border/60 bg-card/80 p-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Input
                value={newChatQuery}
                onChange={(event) => setNewChatQuery(event.target.value)}
                placeholder={t("messages_new_chat_placeholder")}
                className="flex-1"
              />
              <Button variant="ghost" size="sm" onClick={() => setNewChatOpen(false)}>
                {t("messages_new_chat_close")}
              </Button>
            </div>
            {newChatError && <p className="text-xs text-destructive">{newChatError}</p>}
            <div className="max-h-64 space-y-2 overflow-auto">
              {newChatLoading && <p className="text-xs">{t("generic_loading")}</p>}
              {!newChatLoading && newChatQuery.trim().length < 2 && (
                <p className="text-xs">{t("messages_new_chat_hint")}</p>
              )}
              {!newChatLoading &&
                newChatQuery.trim().length >= 2 &&
                newChatResults.map((candidate) => (
                  <button
                    type="button"
                    key={candidate.userId}
                    className="flex w-full items-center justify-between rounded-xl border border-border/40 bg-background/40 px-3 py-2 text-left text-xs text-white transition-colors hover:border-accent"
                    onClick={() => handleStartChatWithUser(candidate)}
                  >
                    <span className="flex flex-col">
                      <span className="font-semibold">{candidate.displayName}</span>
                      <span className="text-[11px] text-muted-foreground">{candidate.email}</span>
                    </span>
                    <span className="text-accent">{t("messages_new_chat_select")}</span>
                  </button>
                ))}
              {!newChatLoading &&
                newChatQuery.trim().length >= 2 &&
                !newChatResults.length &&
                !newChatError && <p className="text-xs">{t("messages_new_chat_no_results")}</p>}
            </div>
          </Card>
        )}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col gap-4">
        {selectedChatId ? (
          <>
            <header className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold text-white">
                    {(() => {
                      const current = chats.find((chat) => chat.chatId === selectedChatId);
                      if (!current) return "";
                      return (
                        current.title ??
                        current.memberIds
                          .map((id) => directory[id]?.displayName ?? id)
                          .join(", ")
                      );
                    })()}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {typingNames
                      ? `${typingNames} ${t("messages_typing")}`
                      : t("messages_participant_count", { count: selectedParticipants.length })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={!selectedChatId}
                    onClick={() => selectedChatId && toggleNotificationsForChat(selectedChatId)}
                  >
                    <BellOff
                      className={cn(
                        "h-4 w-4",
                        selectedChatId && mutedChats.includes(selectedChatId) ? "text-accent" : ""
                      )}
                    />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleShareLink}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleOpenQrPanel}>
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    value={messageSearch}
                    onChange={(event) => setMessageSearch(event.target.value)}
                    placeholder={t("messages_search_thread")}
                    className="h-8 w-64 pl-8"
                  />
                </div>
                <Button
                  variant={detailView === "timeline" ? "accent" : "ghost"}
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => setDetailView("timeline")}
                >
                  <Calendar className="h-3 w-3" />
                  {t("messages_timeline")}
                </Button>
                <Button
                  variant={detailView === "moderation" ? "accent" : "ghost"}
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => setDetailView("moderation")}
                >
                  <Shield className="h-3 w-3" />
                  {t("messages_moderation")}
                </Button>
              </div>
              {headerNotice && (
                <div className="rounded-full bg-accent/20 px-3 py-1 text-xs text-accent">{headerNotice}</div>
              )}
              {detailView === "timeline" ? (
                <Card className="border-border/40 bg-border/10 p-3 text-xs text-muted-foreground">
                  {timelineEntries.length ? (
                    <ul className="space-y-2">
                      {timelineEntries.map((entry) => (
                        <li key={entry.id} className="flex items-center justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-white">{entry.author}</p>
                            <p className="line-clamp-2">{entry.preview}</p>
                          </div>
                          <span className="text-[11px]">{entry.at}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-[11px]">{t("messages_timeline_empty")}</p>
                  )}
                </Card>
              ) : (
                <Card className="border-border/40 bg-border/10 p-3 text-xs text-muted-foreground">
                  <p className="mb-3">{t("messages_moderation_hint")}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={handleModerationMute}>
                      {t("messages_moderation_toggle_mute")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleModerationArchive}>
                      {t("messages_moderation_archive")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleModerationDelete} className="text-destructive border-destructive/60">
                      {t("messages_moderation_delete")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setParticipantManagerOpen(true)}>
                      {t("messages_manage")}
                    </Button>
                  </div>
                </Card>
              )}
            </header>
            <div className="flex min-h-0 flex-1 gap-4">
              <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-4">
                <MessageThread
                  currentUser={user}
                  directory={directory}
                  participants={selectedParticipants}
                  messages={filteredMessages}
                  onReaction={handleReaction}
                  onEdit={(message) => {
                    setEditingMessage(message);
                    setDraft(message.content ?? "");
                    setAttachments(message.attachments ?? []);
                    const poll = message.metadata?.poll as {
                      question: string;
                      options: { id?: string; label: string }[];
                      expiresAt?: number;
                    } | undefined;
                    if (poll) {
                      setShowPollBuilder(true);
                      setDraftPoll({
                        question: poll.question,
                        options:
                          poll.options?.map((option) => ({
                            id: option.id ?? makeLocalId(),
                            label: option.label
                          })) ?? [],
                        expiresAt: poll.expiresAt
                          ? new Date(poll.expiresAt).toISOString().slice(0, 16)
                          : undefined
                      });
                    }
                  }}
                  onDelete={handleDelete}
                  onPin={handlePinMessage}
                  onTogglePicker={setReactionPickerFor}
                  reactionPickerFor={reactionPickerFor}
                />
                <Composer
                  disabled={composerDisabled}
                  draft={draft}
                  setDraft={setDraft}
                  attachments={attachments}
                  onRemoveAttachment={(id) =>
                    setAttachments((prev) => prev.filter((attachment) => attachment.attachmentId !== id))
                  }
                  onAttachmentChange={handleAttachmentInput}
                  isSilent={isSilent}
                  setIsSilent={setIsSilent}
                  scheduledFor={scheduledAt}
                  setScheduledFor={setScheduledAt}
                  onSend={handleSend}
                  isEditing={Boolean(editingMessage)}
                  onCancelEdit={resetComposer}
                  showPollBuilder={showPollBuilder}
                  setShowPollBuilder={setShowPollBuilder}
                  pollBuilder={draftPoll}
                  setPollBuilder={setDraftPoll}
                />
              </div>
        <RightRail
          pinnedMessages={pinnedMessages}
          participants={selectedParticipants}
          directory={directory}
          onUnpin={(message) => handlePinMessage(message, false)}
          onClearPinned={handleClearPinned}
          onManageParticipants={() => setParticipantManagerOpen(true)}
        />
            </div>
          </>
        ) : (
          <Card className="flex flex-1 items-center justify-center border-dashed bg-transparent text-sm text-muted-foreground">
            {t("messages_empty")}
          </Card>
        )}
      </section>
    </div>
    {participantManagerOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <Card className="w-full max-w-md space-y-4 border-border/80 bg-background/95 p-6 text-sm text-muted-foreground">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span>{t("messages_participants_manage_title")}</span>
            <Button variant="ghost" size="sm" onClick={() => setParticipantManagerOpen(false)}>
              {t("messages_qr_modal_close")}
            </Button>
          </div>
          <p className="text-xs">{t("messages_participants_manage_hint")}</p>
          <div className="max-h-64 space-y-3 overflow-auto">
            {manageableParticipants.length ? (
              manageableParticipants.map((participant) => (
                <Card key={participant.userId} className="border-border/40 bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{participant.displayName}</p>
                      <p className="text-[11px] text-muted-foreground">{participant.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator?.clipboard?.writeText(participant.userId).then(() => setHeaderNotice(t("messages_link_copied")));
                        }}
                      >
                        {t("messages_copy_id")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleViewParticipant(participant.userId)}>
                        {t("messages_participants_view_profile")}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-center text-xs text-muted-foreground">{t("messages_participants_empty")}</p>
            )}
          </div>
        </Card>
      </div>
    )}
    {qrShareLink && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <Card className="w-full max-w-md space-y-4 border-border/80 bg-background/95 p-6 text-sm text-muted-foreground">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span>{t("messages_qr_modal_title")}</span>
            <Button variant="ghost" size="sm" onClick={() => setQrShareLink(null)}>
              {t("messages_qr_modal_close")}
            </Button>
          </div>
          <p>{t("messages_qr_modal_body")}</p>
          <code className="block rounded-xl bg-border/30 p-3 text-xs text-white">{qrShareLink}</code>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => navigator?.clipboard?.writeText(qrShareLink)}>
              {t("messages_link_copied")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setQrShareLink(null)}>
              {t("messages_qr_modal_close")}
            </Button>
          </div>
        </Card>
      </div>
    )}
    </>
  );
}

interface MessageThreadProps {
  currentUser: User;
  directory: Directory;
  participants: User[];
  messages: ChatMessage[];
  onReaction: (message: ChatMessage, emoji: string) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage, hardDelete?: boolean) => void;
  onPin: (message: ChatMessage, pinned: boolean) => void;
  onTogglePicker: (messageId: string | null) => void;
  reactionPickerFor: string | null;
}

function MessageThread({
  currentUser,
  directory,
  participants,
  messages,
  onReaction,
  onEdit,
  onDelete,
  onPin,
  onTogglePicker,
  reactionPickerFor
}: MessageThreadProps) {
  const { t } = useI18n();
  const totalReceivers = Math.max(participants.length - 1, 0);

  return (
    <div className="flex-1 space-y-4 overflow-auto pr-2">
      {messages.map((message) => {
        const author = directory[message.senderId];
        const isOwn = message.senderId === currentUser.userId;
        const canEdit = isOwn && !message.deletedAt && Date.now() - message.createdAt < 15 * 60 * 1000;
        const readCount = message.readBy.filter((id) => id !== message.senderId).length;
        const fullyRead = totalReceivers > 0 && readCount >= totalReceivers;
        const poll = message.metadata?.poll as {
          question?: string;
          options?: { id?: string; label: string; votes?: string[] }[];
          createdBy?: string;
          expiresAt?: number;
        } | null;

        return (
          <div key={message.messageId} className={cn("flex gap-3", isOwn ? "flex-row-reverse" : "")}>
            <div className="h-9 w-9 rounded-full bg-border/60 text-center text-sm font-semibold leading-9 text-white">
              {(author?.displayName ?? message.senderId).slice(0, 2).toUpperCase()}
            </div>
            <div className={cn("max-w-xl space-y-2", isOwn ? "items-end text-right" : "items-start text-left")}>
              <div
                className={cn(
                  "inline-block rounded-2xl px-4 py-3",
                  isOwn ? "bg-primary text-primary-foreground" : "bg-border/30 text-white",
                  message.deletedAt ? "opacity-60" : ""
                )}
              >
                {message.deletedAt ? (
                  <span className="text-sm italic text-muted-foreground">{t("messages_removed")}</span>
                ) : (
                  <div className="space-y-3">
                    {message.content && <p className="text-sm leading-relaxed">{message.content}</p>}
                    {!!message.attachments?.length && (
                      <div className="space-y-2">
                        {message.attachments.map((attachment) => (
                          <AttachmentPreview key={attachment.attachmentId} attachment={attachment} />
                        ))}
                      </div>
                    )}
                    {poll?.question && (
                      <PollPreview poll={poll} isOwn={isOwn} />
                    )}
                  </div>
                )}
              </div>
              <div className={cn("flex flex-wrap items-center gap-2 text-xs text-muted-foreground", isOwn ? "justify-end" : "")}>
                <span>{formatTimestamp(message.createdAt)}</span>
                {message.updatedAt && message.updatedAt > message.createdAt && <span>{t("messages_edited")}</span>}
                {message.scheduledFor && message.scheduledFor > Date.now() && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t("messages_scheduled")}
                  </span>
                )}
                {fullyRead && (
                  <span className="flex items-center gap-1 text-accent">
                    <CheckCheck className="h-3 w-3" />
                    {t("messages_read")}
                  </span>
                )}
              </div>
              {message.reactions.length > 0 && (
                <div className={cn("flex flex-wrap gap-2", isOwn ? "justify-end" : "justify-start")}>
                  {Object.entries(
                    message.reactions.reduce<Record<string, MessageReaction[]>>((acc, reaction) => {
                      acc[reaction.emoji] = acc[reaction.emoji] ? [...acc[reaction.emoji], reaction] : [reaction];
                      return acc;
                    }, {})
                  ).map(([emoji, group]) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onReaction(message, emoji)}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-1 text-xs",
                        group.some((item) => item.userId === currentUser.userId)
                          ? "bg-accent/70 text-white"
                          : "bg-border/50 text-muted-foreground"
                      )}
                    >
                      <span>{emoji}</span>
                      <span>{group.length}</span>
                    </button>
                  ))}
                </div>
              )}
              {!message.deletedAt && (
                <div className={cn("flex flex-wrap items-center gap-2 text-xs", isOwn ? "justify-end" : "justify-start")}>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onTogglePicker(reactionPickerFor === message.messageId ? null : message.messageId)}
                    >
                      <Smile className="h-3.5 w-3.5" />
                    </Button>
                    {reactionPickerFor === message.messageId && (
                      <div className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-full border border-border/60 bg-background/95 px-2 py-1 shadow-xl">
                        {REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              onReaction(message, emoji);
                              onTogglePicker(null);
                            }}
                            className="text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(message)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(message, false)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPin(message, !message.pinned)}>
                    <Pin className={cn("h-3.5 w-3.5", message.pinned ? "text-accent" : "")} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {!messages.length && (
        <Card className="border-dashed bg-transparent p-6 text-center text-xs text-muted-foreground">
          {t("messages_empty")}
        </Card>
      )}
    </div>
  );
}

interface PollPreviewProps {
  poll: {
    question?: string;
    options?: { id?: string; label: string; votes?: string[] }[];
    createdBy?: string;
    expiresAt?: number;
  };
  isOwn: boolean;
}

function PollPreview({ poll, isOwn }: PollPreviewProps) {
  const { t } = useI18n();
  const closesAt = poll.expiresAt ? formatTimestamp(poll.expiresAt) : undefined;
  const options = poll.options ?? [];
  const question = poll.question ?? t("messages_poll_question");
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-left text-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("messages_poll_header")}</span>
        {closesAt && <span>{t("messages_poll_closes", { time: closesAt })}</span>}
      </div>
      <p className="text-white">{question}</p>
      <div className="space-y-2 text-xs text-muted-foreground">
        {options.map((option) => (
          <div key={option.id ?? option.label} className="flex items-center justify-between rounded-xl bg-border/40 px-3 py-2">
            <span>{option.label}</span>
            <span>{t("messages_poll_votes", { count: option.votes?.length ?? 0 })}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {isOwn
          ? t("messages_poll_created_self")
          : t("messages_poll_created_other", { name: poll.createdBy ?? t("messages_someone") })}
      </p>
    </div>
  );
}

interface AttachmentPreviewProps {
  attachment: ChatAttachment;
}

function AttachmentPreview({ attachment }: AttachmentPreviewProps) {
  const { t } = useI18n();
  const { type, url, name } = attachment;
  if (type === "image" || type === "gif" || type === "sticker") {
    return (
      <div className="relative max-h-64 overflow-hidden rounded-xl border border-border/60">
        <Image
          src={url}
          alt={name ?? t("messages_attachment")}
          width={800}
          height={600}
          className="h-full w-full object-cover"
          sizes="(max-width: 768px) 100vw, 512px"
          unoptimized
        />
      </div>
    );
  }
  if (type === "video") {
    return (
      <div className="overflow-hidden rounded-xl border border-border/60">
        <video src={url} controls className="max-h-72 w-full" />
      </div>
    );
  }
  if (type === "audio") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/50 px-3 py-2">
        <Mic className="h-4 w-4 text-muted-foreground" />
        <audio controls src={url} className="w-full" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-2">
        <FileText className="h-3.5 w-3.5" />
        {name ?? t("messages_attachment")}
      </span>
      <a href={url} download className="text-white">
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

interface ComposerProps {
  disabled: boolean;
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  attachments: ChatAttachment[];
  onRemoveAttachment: (id: string) => void;
  onAttachmentChange: (files: FileList | null) => void;
  isSilent: boolean;
  setIsSilent: Dispatch<SetStateAction<boolean>>;
  scheduledFor: string;
  setScheduledFor: Dispatch<SetStateAction<string>>;
  onSend: () => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  showPollBuilder: boolean;
  setShowPollBuilder: Dispatch<SetStateAction<boolean>>;
  pollBuilder: DraftPoll;
  setPollBuilder: Dispatch<SetStateAction<DraftPoll>>;
}

function Composer({
  disabled,
  draft,
  setDraft,
  attachments,
  onRemoveAttachment,
  onAttachmentChange,
  isSilent,
  setIsSilent,
  scheduledFor,
  setScheduledFor,
  onSend,
  isEditing,
  onCancelEdit,
  showPollBuilder,
  setShowPollBuilder,
  pollBuilder,
  setPollBuilder
}: ComposerProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <div className="space-y-4">
      {!!attachments.length && (
        <div className="flex flex-wrap gap-3">
          {attachments.map((attachment) => (
            <div key={attachment.attachmentId} className="relative">
              <AttachmentPreview attachment={attachment} />
              <button
                type="button"
                className="absolute right-2 top-2 rounded-full bg-background/70 px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground"
                onClick={() => onRemoveAttachment(attachment.attachmentId)}
              >
                {t("messages_remove")}
              </button>
            </div>
          ))}
        </div>
      )}

      {showPollBuilder && (
        <Card className="space-y-3 border-border/60 bg-background/50 p-4 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>{t("messages_create_poll")}</span>
            <Button variant="ghost" size="sm" onClick={() => setShowPollBuilder(false)}>
              {t("messages_close")}
            </Button>
          </div>
          <Input
            value={pollBuilder.question}
            onChange={(event) => setPollBuilder({ ...pollBuilder, question: event.target.value })}
            placeholder={t("messages_poll_question")}
          />
          <div className="space-y-2">
            {pollBuilder.options.map((option) => (
              <div key={option.id} className="flex items-center gap-2">
                <Input
                  value={option.label}
                  onChange={(event) =>
                    setPollBuilder({
                      ...pollBuilder,
                      options: pollBuilder.options.map((item) =>
                        item.id === option.id ? { ...item, label: event.target.value } : item
                      )
                    })
                  }
                  placeholder={t("messages_poll_option")}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setPollBuilder({
                      ...pollBuilder,
                      options: pollBuilder.options.filter((item) => item.id !== option.id)
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (pollBuilder.options.length < 5) {
                  setPollBuilder({
                    ...pollBuilder,
                    options: [...pollBuilder.options, { id: makeLocalId(), label: "" }]
                  });
                }
              }}
            >
              <Plus className="mr-2 h-3.5 w-3.5" /> {t("messages_poll_add_option")}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>{t("messages_poll_close_label")}</span>
            <Input
              type="datetime-local"
              value={pollBuilder.expiresAt ?? ""}
              onChange={(event) => setPollBuilder({ ...pollBuilder, expiresAt: event.target.value })}
              className="h-8"
            />
          </div>
        </Card>
      )}

      <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
        {isEditing && (
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("messages_editing")}</span>
            <button type="button" onClick={onCancelEdit} className="text-white">
              {t("messages_cancel")}
            </button>
          </div>
        )}
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("messages_composer_placeholder")}
          className="resize-none border-0 bg-transparent text-sm focus-visible:ring-0"
          rows={3}
          disabled={disabled}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(event) => onAttachmentChange(event.target.files)}
            />
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowPollBuilder((value) => !value)}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsSilent((value) => !value)}>
              <BellOff className={cn("h-4 w-4", isSilent ? "text-accent" : "")} />
            </Button>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                className="h-8 w-44"
              />
            </div>
          </div>
          <Button type="button" variant="accent" size="sm" onClick={onSend} disabled={disabled}>
            <Send className="mr-2 h-4 w-4" /> {isEditing ? t("messages_update") : t("messages_send")}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RightRailProps {
  pinnedMessages: ChatMessage[];
  participants: User[];
  directory: Directory;
  onUnpin: (message: ChatMessage) => void;
  onClearPinned: () => void;
  onManageParticipants: () => void;
}

function RightRail({ pinnedMessages, participants, directory, onUnpin, onClearPinned, onManageParticipants }: RightRailProps) {
  const { t } = useI18n();
  return (
    <aside className="hidden w-80 flex-shrink-0 flex-col gap-4 rounded-2xl border border-border/60 bg-card/70 p-4 xl:flex">
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("messages_pinned_header")}</span>
          <button type="button" className="text-white" onClick={onClearPinned} disabled={!pinnedMessages.length}>
            {t("messages_clear_all")}
          </button>
        </div>
        {pinnedMessages.length ? (
          <div className="space-y-2">
            {pinnedMessages.map((message) => (
              <Card key={message.messageId} className="space-y-2 border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{directory[message.senderId]?.displayName ?? message.senderId}</span>
                  <button type="button" onClick={() => onUnpin(message)} className="text-accent">
                    <Pin className="h-3 w-3" />
                  </button>
                </div>
                <p className="line-clamp-2 text-xs">{message.content ?? t("messages_attachment")}</p>
                <span className="text-[11px] text-muted-foreground">{formatTimestamp(message.createdAt)}</span>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed bg-transparent p-4 text-center text-[11px] text-muted-foreground">{t("messages_pinned_empty")}</Card>
        )}
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("messages_participants")}</span>
          <button type="button" className="text-white" onClick={onManageParticipants}>
            {t("messages_manage")}
          </button>
        </div>
        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.userId}
              className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-border/60 text-center text-[11px] font-semibold leading-7 text-white">
                  {participant.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-white">{participant.displayName}</p>
                  <p>{t("messages_online")}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

const MessagesFallback = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-12">
    <div className="h-8 w-48 animate-pulse rounded-full bg-border/40" />
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="h-96 animate-pulse rounded-3xl bg-border/20" />
      <div className="h-96 animate-pulse rounded-3xl bg-border/20" />
    </div>
  </div>
);

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesFallback />}>
      <MessagesPageContent />
    </Suspense>
  );
}

