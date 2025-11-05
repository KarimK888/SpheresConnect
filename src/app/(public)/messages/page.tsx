"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent
} from "react";
import {
  BellOff,
  Calendar,
  CheckCheck,
  Clock,
  Download,
  Edit3,
  FileText,
  Menu,
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

export default function MessagesPage() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const backend = useMemo(() => getBackend(), []);

  const [directory, setDirectory] = useState<Directory>({});
  const [chats, setChats] = useState<SidebarChat[]>([]);
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

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedMessages = selectedChatId ? messagesByChat[selectedChatId] ?? [] : [];
  const selectedParticipants = selectedChatId ? participantsByChat[selectedChatId] ?? [] : [];

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

  useEffect(() => {
    if (!user) return;
    const loadChats = async () => {
      const raw = await backend.messages.listChats({ userId: user.userId });
      const enriched = raw.map<SidebarChat>((chat) => ({
        ...chat,
        unreadCount: 0,
        lastMessage: undefined,
        pinned: pinnedChats.includes(chat.chatId)
      }));
      setChats(enriched);
      if (!selectedChatId && enriched.length) {
        setSelectedChatId(enriched[0].chatId);
      }
    };
    void loadChats();
  }, [backend.messages, pinnedChats, selectedChatId, user]);

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

  const togglePinChat = (chatId: string) => {
    setPinnedChats((prev) => (prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]));
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

  const visibleChats = useMemo(() => {
    const normalized = chatSearch.trim().toLowerCase();
    return chats
      .map((chat) => {
        const thread = messagesByChat[chat.chatId] ?? [];
        const lastMessage = thread[thread.length - 1];
        const unread = user
          ? thread.filter((item) => !item.readBy.includes(user.userId) && item.senderId !== user.userId).length
          : 0;
        return {
          ...chat,
          unreadCount: unread,
          lastMessage,
          pinned: pinnedChats.includes(chat.chatId)
        };
      })
      .filter((chat) => {
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
        const aTime = a.lastMessage?.createdAt ?? 0;
        const bTime = b.lastMessage?.createdAt ?? 0;
        return bTime - aTime;
      });
  }, [chatSearch, chats, directory, messagesByChat, pinnedChats, user]);

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

  const pinnedMessages = useMemo(
    () => filteredMessages.filter((message) => message.pinned && !message.deletedAt),
    [filteredMessages]
  );

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
    <div className="mx-auto flex h-[calc(100vh-160px)] w-full max-w-6xl gap-4 px-6 py-8">
      <aside className="flex w-72 flex-shrink-0 flex-col gap-4 rounded-2xl border border-border/60 bg-card/70 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("messages_threads")}</h2>
          <Button variant="ghost" size="icon" onClick={() => setChatSearch("")} className="text-muted-foreground hover:text-white">
            <Menu className="h-4 w-4" />
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
            return (
              <button
                key={chat.chatId}
                onClick={() => handleSelectChat(chat.chatId)}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                  isActive ? "border-accent bg-accent/10 text-white" : "border-border/40 bg-background/40 hover:border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{title}</span>
                  <div className="flex items-center gap-2">
                    {chat.unreadCount > 0 && (
                      <span className="rounded-full bg-accent/80 px-2 py-0.5 text-xs text-white">{chat.unreadCount}</span>
                    )}
                    <button
                      type="button"
                      className={cn("rounded-full p-1", chat.pinned ? "text-accent" : "text-muted-foreground hover:text-white")}
                      onClick={(event) => {
                        event.stopPropagation();
                        togglePinChat(chat.chatId);
                      }}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {chat.lastMessage && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {(directory[chat.lastMessage.senderId]?.displayName ?? chat.lastMessage.senderId) + ": "}
                    {chat.lastMessage.content ?? t("messages_attachment")}
                  </p>
                )}
              </button>
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
          onClick={async () => {
            const chat = await backend.messages.createChat({ memberIds: [user.userId], isGroup: false });
            setChats((prev) => [{ ...chat, unreadCount: 0, lastMessage: undefined, pinned: false }, ...prev]);
            setSelectedChatId(chat.chatId);
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {t("messages_new_chat")}
        </Button>
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
                  <Button variant="ghost" size="icon">
                    <BellOff className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
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
                <Button variant="ghost" size="sm" className="gap-2 text-xs">
                  <Calendar className="h-3 w-3" />
                  {t("messages_timeline")}
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 text-xs">
                  <Shield className="h-3 w-3" />
                  {t("messages_moderation")}
                </Button>
              </div>
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
    question: string;
    options: { id?: string; label: string; votes?: string[] }[];
    createdBy?: string;
    expiresAt?: number;
  };
  isOwn: boolean;
}

function PollPreview({ poll, isOwn }: PollPreviewProps) {
  const { t } = useI18n();
  const closesAt = poll.expiresAt ? formatTimestamp(poll.expiresAt) : undefined;
  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-left text-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("messages_poll_header")}</span>
        {closesAt && <span>{t("messages_poll_closes", { time: closesAt })}</span>}
      </div>
      <p className="text-white">{poll.question}</p>
      <div className="space-y-2 text-xs text-muted-foreground">
        {poll.options.map((option) => (
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
      <div className="overflow-hidden rounded-xl border border-border/60">
        <img src={url} alt={name ?? t("messages_attachment")} className="max-h-64 w-full object-cover" />
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
  setDraft: (value: string) => void;
  attachments: ChatAttachment[];
  onRemoveAttachment: (id: string) => void;
  onAttachmentChange: (files: FileList | null) => void;
  isSilent: boolean;
  setIsSilent: (value: boolean) => void;
  scheduledFor: string;
  setScheduledFor: (value: string) => void;
  onSend: () => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  showPollBuilder: boolean;
  setShowPollBuilder: (value: boolean) => void;
  pollBuilder: DraftPoll;
  setPollBuilder: (value: DraftPoll) => void;
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
}

function RightRail({ pinnedMessages, participants, directory, onUnpin }: RightRailProps) {
  const { t } = useI18n();
  return (
    <aside className="hidden w-80 flex-shrink-0 flex-col gap-4 rounded-2xl border border-border/60 bg-card/70 p-4 xl:flex">
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("messages_pinned_header")}</span>
          <button type="button" className="text-white">
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
          <button type="button" className="text-white">
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

