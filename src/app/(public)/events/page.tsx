"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlarmClock, ArrowRight, CalendarDays, Clock4, Mic2, Ticket } from "lucide-react";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const spotlightEvents = [
  {
    name: "Creator Salon 004",
    time: "Thu 7PM",
    location: "Lisbon Atlantic",
    tags: ["Salon", "Hybrid"],
    color: "text-emerald-300"
  },
  {
    name: "Metropolis Listening Lab",
    time: "Sat 9PM",
    location: "Brooklyn Wave",
    tags: ["Music", "Immersive"],
    color: "text-amber-300"
  },
  {
    name: "Studio Tours",
    time: "Sun 1PM",
    location: "Seoul Heights",
    tags: ["Open", "IRL"],
    color: "text-violet-300"
  }
];

type TranslateFn = ReturnType<typeof useI18n>["t"];

export default function EventsLandingPage() {
  const { t } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const stages = useMemo(() => buildEventStages(t), [t]);
  const logistics = useMemo(() => buildEventLogistics(t), [t]);
  const [activeStage, setActiveStage] = useState(stages[0]?.id ?? "ideate");

  const primaryCtaHref = sessionUser ? "/events/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? t("events_cta_primary_authed") : t("events_cta_primary_guest");

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> {t("events_landing_tag")}
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                {t("events_landing_badge")}
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                {t("events_landing_title")}
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">{t("events_landing_description")}</p>
            </div>
            <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm text-muted-foreground">
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  className={cn(
                    "rounded-xl px-3 py-2 font-semibold transition",
                    activeStage === stage.id ? "bg-background/80 text-white" : "hover:text-white"
                  )}
                  onClick={() => setActiveStage(stage.id)}
                >
                  {stage.title}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href={primaryCtaHref}>
                  {primaryCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/events/workspace">{t("events_cta_secondary")}</Link>
              </Button>
            </div>
          </div>
          <SchedulePreview activeStage={activeStage} stages={stages} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {logistics.map((item) => (
            <Card
              key={item.title}
              className="border border-border/50 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <item.icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-border/50 bg-card/40 p-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-4">
              <Badge variant="secondary" className="bg-accent/20 text-accent">
                {t("events_spotlight_badge")}
              </Badge>
              <h2 className="text-3xl font-semibold text-white">{t("events_spotlight_heading")}</h2>
              <p className="text-base text-muted-foreground">{t("events_spotlight_body")}</p>
              <div className="grid gap-4 md:grid-cols-3">
                {spotlightEvents.map((event) => (
                  <div key={event.name} className="rounded-2xl border border-border/40 bg-border/10 p-4">
                    <p className={cn("text-xs uppercase tracking-[0.3em]", event.color)}>{event.time}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{event.name}</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      {event.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Card className="flex-1 border border-border/40 bg-background/80">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <Clock4 className="h-8 w-8 text-accent" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("events_stats_label")}</p>
                    <p className="text-lg font-semibold text-white">{t("events_stats_value")}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{t("events_stats_body")}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{t("events_landing_badge")}</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">{t("events_footer_heading")}</h2>
          <p className="mt-2 text-base text-muted-foreground">{t("events_footer_body")}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/events/workspace">{t("events_cta_secondary")}</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const SchedulePreview = ({
  activeStage,
  stages
}: {
  activeStage: string;
  stages: ReturnType<typeof buildEventStages>;
}) => {
  const { t } = useI18n();
  const stage = stages.find((entry) => entry.id === activeStage) ?? stages[0];

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span>{t("events_preview_title")}</span>
        <span>{t("events_preview_status")}</span>
      </div>
      <div className="rounded-2xl border border-border/40 bg-background/70 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{stage.title}</p>
        <p className="mt-2 text-lg font-semibold text-white">{stage.detail}</p>
        <p className="text-sm text-accent">{stage.metric}</p>
      </div>
      <div className="mt-5 space-y-3">
        {spotlightEvents.map((event) => (
          <div key={event.name} className="rounded-2xl border border-border/40 bg-border/10 p-4">
            <p className="text-sm font-semibold text-white">{event.name}</p>
            <p className="text-xs text-muted-foreground">{event.time} • {event.location}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-border/40 bg-border/10 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <AlarmClock className="h-4 w-4 text-accent" />
          {t("events_preview_reminder")}
        </div>
      </div>
    </div>
  );
};

const buildEventStages = (t: TranslateFn) => [
  {
    id: "ideate",
    title: t("events_stage_ideate_title"),
    detail: t("events_stage_ideate_detail"),
    metric: t("events_stage_ideate_metric")
  },
  {
    id: "promote",
    title: t("events_stage_promote_title"),
    detail: t("events_stage_promote_detail"),
    metric: t("events_stage_promote_metric")
  },
  {
    id: "recap",
    title: t("events_stage_recap_title"),
    detail: t("events_stage_recap_detail"),
    metric: t("events_stage_recap_metric")
  }
];

const buildEventLogistics = (t: TranslateFn) => [
  { icon: CalendarDays, title: t("events_logistics_agenda_title"), copy: t("events_logistics_agenda_copy") },
  { icon: Ticket, title: t("events_logistics_badging_title"), copy: t("events_logistics_badging_copy") },
  { icon: Mic2, title: t("events_logistics_talent_title"), copy: t("events_logistics_talent_copy") }
];
