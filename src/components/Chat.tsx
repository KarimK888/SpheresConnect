"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChatMessage, User } from "@/lib/types";
import { getBackend } from "@/lib/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/context/i18n";

interface ChatProps {
  chatId: string;
  currentUser: User;
  participants: User[];
}

export const Chat = ({ chatId, currentUser, participants }: ChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const { t } = useI18n();

  const backend = useMemo(() => getBackend(), []);
  const participantIndex = useMemo(
    () =>
      participants.reduce<Record<string, User>>((acc, user) => {
        acc[user.userId] = user;
        return acc;
      }, {}),
    [participants]
  );

  useEffect(() => {
    const load = async () => {
      const result = await backend.messages.list({ chatId });
      setMessages(result);
    };
    void load();
  }, [backend, chatId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setPending(true);
    try {
      const message = await backend.messages.send({
        chatId,
        senderId: currentUser.userId,
        content: input
      });
      setMessages((prev) => [...prev, message]);
      setInput("");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-border p-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const author = participantIndex[message.senderId];
            const isSelf = message.senderId === currentUser.userId;
            return (
              <motion.div
                key={message.messageId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex flex-col gap-1 ${isSelf ? "items-end text-right" : "items-start text-left"}`}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{author?.displayName ?? t("chat_unknown")}</span>
                  {message.lang && (
                    <Badge variant="outline" className="text-[10px]">
                      {message.lang.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isSelf ? "bg-accent text-black" : "bg-border/40"}`}>
                  {message.content ? (
                    message.content
                  ) : message.attachments?.length ? (
                    <a
                      className="underline"
                      href={message.attachments[0].url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {message.attachments[0].name ?? t("chat_attachment")}
                    </a>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-3">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("chat_placeholder")}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
        />
        <Button onClick={() => void sendMessage()} disabled={pending}>
          {t("chat_send")}
        </Button>
      </div>
    </div>
  );
};
