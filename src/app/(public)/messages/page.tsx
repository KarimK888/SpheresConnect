"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, MessageSquare, Mic, Paperclip, PhoneCall, Sparkles, Wifi } from "lucide-react";
import { useSessionState } from "@/context/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const messageFeatures = [
  {
    title: "Threaded reactions",
    copy: "Keep async updates inside one timeline with emoji-level insights.",
    icon: MessageSquare
  },
  {
    title: "Audio + docs",
    copy: "Drop Loom links, WAV files, and polls in the same composer.",
    icon: Paperclip
  },
  {
    title: "Presence-aware",
    copy: "Typing states and silent send keep ops tidy in every time zone.",
    icon: Wifi
  }
];

const complianceNotes = [
  { title: "Moderation queue", detail: "AI + human review" },
  { title: "Audit trails", detail: "Every attachment tracked" },
  { title: "Tenant isolation", detail: "Hub-specific encryption" }
];

const chatScript = [
  { id: "1", sender: "Nova", text: "Deck updates pushed. Need a quick read?", timestamp: "11:04", accent: "text-white" },
  { id: "2", sender: "Dev", text: "Looping in the sound team. Uploading refs now.", timestamp: "11:05", accent: "text-emerald-300" },
  { id: "3", sender: "Mika", text: "Attaching stems + updated mix. Ready for notes.", timestamp: "11:06", accent: "text-amber-300" }
];

export default function MessagesLandingPage() {
  const sessionUser = useSessionState((state) => state.user);
  const [typing, setTyping] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState(chatScript.slice(0, 2));

  useEffect(() => {
    const typingTimer = window.setInterval(() => {
      setTyping(true);
      setTimeout(() => setTyping(false), 1500);
    }, 4800);
    return () => window.clearInterval(typingTimer);
  }, []);

  useEffect(() => {
    const messageTimer = window.setInterval(() => {
      setVisibleMessages((prev) => {
        if (prev.length >= chatScript.length) return chatScript.slice(0, 2);
        return chatScript.slice(0, prev.length + 1);
      });
    }, 5200);
    return () => window.clearInterval(messageTimer);
  }, []);

  const primaryCtaHref = sessionUser ? "/messages/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? "Open inbox" : "Activate inbox";

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <MessageSquare className="h-4 w-4" /> Messages
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                Inbox preview
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                Give stakeholders a feel for your inbox rituals without onboarding them
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Show how threads, reactions, polls, and attachments behave before you ever invite someone into the live
                chat workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="gap-2">
                <Link href={primaryCtaHref}>
                  {primaryCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/messages/workspace">Enter live inbox</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {complianceNotes.map((note) => (
                <Card key={note.title} className="border border-border/40 bg-card/50">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{note.title}</p>
                    <p className="text-lg font-semibold text-white">{note.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <ChatPreview messages={visibleMessages} typing={typing} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {messageFeatures.map((feature) => (
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
              Signal clarity
            </Badge>
            <h2 className="text-3xl font-semibold text-white">Routes, approvals, and async rituals preview here</h2>
            <p className="text-base text-muted-foreground">
              Let guests explore sample threads, polls, and audio recaps—the same UI they will use once invited to the
              authenticated inbox.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-emerald-300" /> Voice notes transcribe live
              </li>
              <li className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-amber-300" /> Spin up huddles directly from threads
              </li>
              <li className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-rose-300" /> Channel-level permissions are mirrored
              </li>
            </ul>
          </div>
          <Card className="border border-border/40 bg-background/80">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Message sentiment</p>
              <div className="rounded-2xl border border-border/40 bg-border/10 p-4 text-sm text-muted-foreground">
                <p className="text-white">Avg. response time 11m</p>
                <p>Approval queue cleared 94%</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Once they&apos;re ready for the high-fidelity experience, route them to the real-time workspace.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Inbox preview</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Share this link to prove your comms game</h2>
          <p className="mt-2 text-base text-muted-foreground">
            No login required until they want the full control center of SpheresConnect Messages.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/messages/workspace">Open authenticated inbox</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const ChatPreview = ({
  messages,
  typing
}: {
  messages: Array<(typeof chatScript)[number]>;
  typing: boolean;
}) => {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span>Thread preview</span>
        <span>Realtime</span>
      </div>
      <div className="space-y-4">
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
          <Card className="border border-border/30 bg-border/10">
            <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-accent" /> Someone is typing...
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
