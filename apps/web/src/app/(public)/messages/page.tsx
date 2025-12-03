"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, MessageSquare, Mic, Paperclip, PhoneCall, Sparkles, Wifi } from "lucide-react";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  buildLandingHeroCopy,
  buildLandingPreviewCopy,
  translateCollection
} from "@/lib/landing-copy";
import type { TranslationKey } from "@/lib/landing-copy";

type TranslateFn = ReturnType<typeof useI18n>["t"];

type FeatureConfig = {
  icon: typeof MessageSquare;
  titleKey: TranslationKey;
  copyKey: TranslationKey;
};

const featureBase: ReadonlyArray<FeatureConfig> = [
  { icon: MessageSquare, titleKey: "messages_feature_thread_title", copyKey: "messages_feature_thread_copy" },
  { icon: Paperclip, titleKey: "messages_feature_media_title", copyKey: "messages_feature_media_copy" },
  { icon: Wifi, titleKey: "messages_feature_presence_title", copyKey: "messages_feature_presence_copy" }
];

const complianceBase: ReadonlyArray<{ titleKey: TranslationKey; detailKey: TranslationKey }> = [
  { titleKey: "messages_compliance_moderation_title", detailKey: "messages_compliance_moderation_detail" },
  { titleKey: "messages_compliance_audit_title", detailKey: "messages_compliance_audit_detail" },
  { titleKey: "messages_compliance_isolation_title", detailKey: "messages_compliance_isolation_detail" }
];

const chatScriptBase: ReadonlyArray<{
  id: string;
  sender: string;
  textKey: TranslationKey;
  timestamp: string;
  accent: string;
}> = [
  { id: "1", sender: "Nova", textKey: "messages_chat_text_1", timestamp: "11:04", accent: "text-white" },
  { id: "2", sender: "Dev", textKey: "messages_chat_text_2", timestamp: "11:05", accent: "text-emerald-300" },
  { id: "3", sender: "Mika", textKey: "messages_chat_text_3", timestamp: "11:06", accent: "text-amber-300" }
] as const;

type MessagesCopy = {
  heroTag: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  primaryCtaAuthed: string;
  primaryCtaGuest: string;
  secondaryCta: string;
  features: Array<{ icon: typeof MessageSquare; title: string; copy: string }>;
  compliance: Array<{ title: string; detail: string }>;
  signalBadge: string;
  signalHeading: string;
  signalBody: string;
  signalBullets: string[];
  statTitle: string;
  statResponse: string;
  statQueue: string;
  statNote: string;
  previewBadge: string;
  previewHeading: string;
  previewBody: string;
  previewSecondary: string;
  typingLabel: string;
  threadHeader: string;
  threadStatus: string;
  chatScript: Array<{ id: string; sender: string; text: string; timestamp: string; accent: string }>;
};

export default function MessagesLandingPage() {
  const { t } = useI18n();
  const copy = useMemo(() => buildMessagesCopy(t), [t]);
  const sessionUser = useSessionState((state) => state.user);
  const [typing, setTyping] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState(copy.chatScript.slice(0, 2));

  useEffect(() => {
    const typingTimer = window.setInterval(() => {
      setTyping(true);
      setTimeout(() => setTyping(false), 1500);
    }, 4800);
    return () => window.clearInterval(typingTimer);
  }, []);

  useEffect(() => {
    setVisibleMessages(copy.chatScript.slice(0, 2));
  }, [copy.chatScript]);

  useEffect(() => {
    const messageTimer = window.setInterval(() => {
      setVisibleMessages((prev) => {
        if (prev.length >= copy.chatScript.length) return copy.chatScript.slice(0, 2);
        return copy.chatScript.slice(0, prev.length + 1);
      });
    }, 5200);
    return () => window.clearInterval(messageTimer);
  }, [copy.chatScript]);

  const primaryCtaHref = sessionUser ? "/messages/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? copy.primaryCtaAuthed : copy.primaryCtaGuest;

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <MessageSquare className="h-4 w-4" /> {copy.heroTag}
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                {copy.heroBadge}
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">{copy.heroDescription}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="gap-2">
                <Link href={primaryCtaHref}>
                  {primaryCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/messages/workspace">{copy.secondaryCta}</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {copy.compliance.map((note) => (
                <Card key={note.title} className="border border-border/40 bg-card/50">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{note.title}</p>
                    <p className="text-lg font-semibold text-white">{note.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <ChatPreview messages={visibleMessages} typing={typing} copy={copy} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {copy.features.map((feature) => (
            <Card
              key={feature.title}
              className="border border-border/50 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <feature.icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-8 rounded-3xl border border-border/50 bg-card/40 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Badge variant="secondary" className="bg-accent/20 text-accent">
              {copy.signalBadge}
            </Badge>
            <h2 className="text-3xl font-semibold text-white">{copy.signalHeading}</h2>
            <p className="text-base text-muted-foreground">{copy.signalBody}</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-emerald-300" /> {copy.signalBullets[0]}
              </li>
              <li className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-amber-300" /> {copy.signalBullets[1]}
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-rose-300" /> {copy.signalBullets[2]}
              </li>
            </ul>
          </div>
          <Card className="border border-border/40 bg-background/80">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{copy.statTitle}</p>
              <div className="rounded-2xl border border-border/40 bg-border/10 p-4 text-sm text-muted-foreground">
                <p className="text-white">{copy.statResponse}</p>
                <p>{copy.statQueue}</p>
              </div>
              <p className="text-sm text-muted-foreground">{copy.statNote}</p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{copy.previewBadge}</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">{copy.previewHeading}</h2>
          <p className="mt-2 text-base text-muted-foreground">{copy.previewBody}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/messages/workspace">{copy.previewSecondary}</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const ChatPreview = ({
  messages,
  typing,
  copy
}: {
  messages: MessagesCopy["chatScript"];
  typing: boolean;
  copy: MessagesCopy;
}) => {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span>{copy.threadHeader}</span>
        <span>{copy.threadStatus}</span>
      </div>
      <div className="space-y-4" role="log" aria-live="polite" aria-relevant="additions text">
        {messages.map((message) => (
          <Card key={message.id} className="border border-border/40 bg-background/80">
            <CardContent className="space-y-1 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className={cn("font-semibold text-white", message.accent)}>{message.sender}</span>
                <span>{message.timestamp}</span>
              </div>
              <p className="text-sm text-white">{message.text}</p>
            </CardContent>
          </Card>
        ))}
        {typing && (
          <Card className="border border-border/30 bg-border/10" aria-live="polite">
            <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-accent" /> {copy.typingLabel}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const buildMessagesCopy = (t: TranslateFn): MessagesCopy => {
  const hero = buildLandingHeroCopy(t, "messages");
  const preview = buildLandingPreviewCopy(t, "messages");
  const features = translateCollection(featureBase, { title: "titleKey", copy: "copyKey" }, t);
  const compliance = translateCollection(complianceBase, { title: "titleKey", detail: "detailKey" }, t);
  const chatScript = chatScriptBase.map((entry) => ({
    ...entry,
    text: t(entry.textKey)
  }));

  return {
    ...hero,
    ...preview,
    features,
    compliance,
    signalBadge: t("messages_signal_badge"),
    signalHeading: t("messages_signal_heading"),
    signalBody: t("messages_signal_body"),
    signalBullets: [
      t("messages_signal_voice"),
      t("messages_signal_huddles"),
      t("messages_signal_permissions")
    ],
    statTitle: t("messages_stat_title"),
    statResponse: t("messages_stat_response"),
    statQueue: t("messages_stat_queue"),
    statNote: t("messages_stat_note"),
    typingLabel: t("messages_typing_label"),
    threadHeader: t("messages_thread_header"),
    threadStatus: t("messages_thread_status"),
    chatScript
  };
};
