"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass, MapPin, MoveRight, Radar, RadioTower, Users } from "lucide-react";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";

const demoHubs = [
  {
    name: "Lisbon Atlantic",
    city: "Lisbon, PT",
    members: 182,
    checkins: 742,
    coords: { x: "35%", y: "42%" },
    color: "from-emerald-400/50 to-emerald-900/10"
  },
  {
    name: "Brooklyn Wave",
    city: "New York, US",
    members: 264,
    checkins: 1_104,
    coords: { x: "22%", y: "28%" },
    color: "from-amber-400/50 to-amber-900/10"
  },
  {
    name: "Seoul Heights",
    city: "Seoul, KR",
    members: 118,
    checkins: 508,
    coords: { x: "70%", y: "33%" },
    color: "from-violet-400/60 to-indigo-900/10"
  }
];

const signalIcons = {
  radar: Radar,
  users: Users,
  radio: RadioTower
};

type HubCopy = {
  heroTag: string;
  heroTitle: string;
  heroDescription: string;
  heroBadgeGlobal: string;
  heroBadgeLocal: string;
  viewToggle: Record<"global" | "local", string>;
  primaryCtaAuthed: string;
  primaryCtaGuest: string;
  secondaryCta: string;
  coverageStats: { label: string; value: string; delta: string }[];
  signalStories: { title: string; copy: string; icon: keyof typeof signalIcons }[];
  signalBadge: string;
  signalHeading: string;
  signalBody: string;
  hubMembersLabel: string;
  zoomLabel: string;
  shareLabel: string;
  shareBody: string;
  footerBadge: string;
  footerHeading: string;
  footerBody: string;
  footerSecondary: string;
  previewHeaderGlobal: string;
  previewHeaderLocal: string;
  previewStatus: string;
  previewNow: string;
  previewReminder: string;
};

const hubCopy: Record<Locale, HubCopy> = {
  en: {
    heroTag: "Hub map",
    heroTitle: "See every creator hub pulse before you drop in",
    heroDescription:
      "Share this map-first landing with investors or collaborators to demonstrate reach. Toggle between global presence and zoomed local insights, then open the realtime workspace when it is action time.",
    heroBadgeGlobal: "Worldwide heat",
    heroBadgeLocal: "Local heartbeat",
    viewToggle: {
      global: "Planet-wide signals",
      local: "Per-hub deep dive"
    },
    primaryCtaAuthed: "Launch live map",
    primaryCtaGuest: "Join hubs",
    secondaryCta: "Preview live layer",
    coverageStats: [
      { label: "Active hubs", value: "38", delta: "+6 this quarter" },
      { label: "Daily check-ins", value: "2,817", delta: "41% lift" },
      { label: "Average dwell", value: "3h 12m", delta: "+27m YoY" }
    ],
    signalStories: [
      {
        title: "On-the-minute presence",
        copy: "Members light up the map seconds after tapping the in-hub beacon.",
        icon: "radar"
      },
      {
        title: "Roster-grade filters",
        copy: "Drill into collectors, curators, or builders with layered search.",
        icon: "users"
      },
      {
        title: "Zero-config zones",
        copy: "Spin up pop-up hubs with saved layouts and airing schedules.",
        icon: "radio"
      }
    ],
    signalBadge: "Signal intelligence",
    signalHeading: "Turn check-ins into proof of community",
    signalBody:
      "This landing shows your hub velocity before anyone opens the authenticated app. Embed it in investor decks, newsletters, or local screens to broadcast momentum.",
    hubMembersLabel: "members",
    zoomLabel: "Zoomed insight",
    shareLabel: "Shareable insight",
    shareBody: "Export this panel as an image or embed link before inviting external partners to the live workspace.",
    footerBadge: "Open access preview",
    footerHeading: "Drop investors into the map without requiring a login",
    footerBody: "When they are ready to go deeper, invite them to the authenticated hub map workspace.",
    footerSecondary: "Open realtime board",
    previewHeaderGlobal: "Planet coverage",
    previewHeaderLocal: "Local lens",
    previewStatus: "Realtime",
    previewNow: "Now showing",
    previewReminder: "Reminder workflow ready once attendees RSVP."
  },
  fr: {
    heroTag: "Carte des hubs",
    heroTitle: "Voyez chaque hub creatif avant d'y entrer",
    heroDescription:
      "Partagez cette landing map-first avec investisseurs ou collaborateurs pour montrer votre portee. Alternez presence globale et insights locaux avant d'ouvrir le workspace live.",
    heroBadgeGlobal: "Chaleur mondiale",
    heroBadgeLocal: "Battement local",
    viewToggle: {
      global: "Signaux planete",
      local: "Zoom par hub"
    },
    primaryCtaAuthed: "Lancer la carte live",
    primaryCtaGuest: "Rejoindre les hubs",
    secondaryCta: "Previsualiser la couche live",
    coverageStats: [
      { label: "Hubs actifs", value: "38", delta: "+6 ce trimestre" },
      { label: "Check-ins quotidiens", value: "2 817", delta: "+41%" },
      { label: "Temps moyen", value: "3h 12m", delta: "+27m/an" }
    ],
    signalStories: [
      {
        title: "Presence instantanee",
        copy: "Les membres allument la carte secondes apres le beacon.",
        icon: "radar"
      },
      {
        title: "Filtres roster",
        copy: "Explorez collectionneurs, curateurs ou builders avec une recherche stratifiee.",
        icon: "users"
      },
      {
        title: "Zones zero config",
        copy: "Lancez des pop-up hubs avec layouts et schedules sauvegardes.",
        icon: "radio"
      }
    ],
    signalBadge: "Intel signaux",
    signalHeading: "Transformez les check-ins en preuve de communaute",
    signalBody:
      "Cette landing montre la vitesse de vos hubs avant meme d'ouvrir l'app. A integrer dans decks investisseurs, newsletters ou ecrans locaux.",
    hubMembersLabel: "membres",
    zoomLabel: "Insight zoome",
    shareLabel: "Insight partageable",
    shareBody: "Exportez ce panneau en image ou embed avant d'inviter des partenaires externes.",
    footerBadge: "Preview libre",
    footerHeading: "Plongez les investisseurs dans la carte sans login",
    footerBody: "Quand ils veulent aller plus loin, invitez-les dans le workspace hub map.",
    footerSecondary: "Ouvrir le board live",
    previewHeaderGlobal: "Couverture planete",
    previewHeaderLocal: "Vue locale",
    previewStatus: "Temps reel",
    previewNow: "Actuellement",
    previewReminder: "Workflow rappel pret apres RSVP."
  },
  es: {
    heroTag: "Mapa de hubs",
    heroTitle: "Ve cada pulso creativo antes de llegar",
    heroDescription:
      "Comparte esta landing enfocada en el mapa con inversionistas o colaboradores para demostrar alcance. Alterna presencia global y vista local, luego abre el workspace en tiempo real cuando toque actuar.",
    heroBadgeGlobal: "Calor global",
    heroBadgeLocal: "Latido local",
    viewToggle: {
      global: "Senales planetarias",
      local: "Profundidad por hub"
    },
    primaryCtaAuthed: "Lanzar mapa en vivo",
    primaryCtaGuest: "Unirse a hubs",
    secondaryCta: "Previsualizar capa en vivo",
    coverageStats: [
      { label: "Hubs activos", value: "38", delta: "+6 este trimestre" },
      { label: "Check-ins diarios", value: "2 817", delta: "41% mas" },
      { label: "Estadia promedio", value: "3h 12m", delta: "+27m interanual" }
    ],
    signalStories: [
      {
        title: "Presencia al minuto",
        copy: "Los miembros iluminan el mapa segundos despues de tocar el beacon.",
        icon: "radar"
      },
      {
        title: "Filtros de roster",
        copy: "Profundiza en coleccionistas, curadores o builders con busqueda en capas.",
        icon: "users"
      },
      {
        title: "Zonas sin config",
        copy: "Activa hubs pop-up con layouts y horarios guardados.",
        icon: "radio"
      }
    ],
    signalBadge: "Inteligencia de senal",
    signalHeading: "Convierte check-ins en prueba de comunidad",
    signalBody:
      "Esta landing muestra la velocidad de tus hubs antes de abrir la app autenticada. Embedala en decks, newsletters o pantallas locales para transmitir momentum.",
    hubMembersLabel: "miembros",
    zoomLabel: "Insight con zoom",
    shareLabel: "Insight compartible",
    shareBody: "Exporta este panel como imagen o enlace antes de invitar socios externos al workspace en vivo.",
    footerBadge: "Preview abierta",
    footerHeading: "Deja que inversores vivan el mapa sin login",
    footerBody: "Cuando quieran profundizar, invitalos al workspace autenticado.",
    footerSecondary: "Abrir tablero en tiempo real",
    previewHeaderGlobal: "Cobertura planeta",
    previewHeaderLocal: "Lente local",
    previewStatus: "Tiempo real",
    previewNow: "Mostrando",
    previewReminder: "Workflow de recordatorio listo despues del RSVP."
  }
};

export default function HubMapLandingPage() {
  const { locale } = useI18n();
  const sessionUser = useSessionState((state) => state.user);
  const copy = hubCopy[locale as Locale] ?? hubCopy.en;
  const [activeHubIndex, setActiveHubIndex] = useState(0);
  const [view, setView] = useState<"global" | "local">("global");

  const activeHub = useMemo(() => demoHubs[activeHubIndex], [activeHubIndex]);
  const primaryCtaHref = sessionUser ? "/hub-map/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? copy.primaryCtaAuthed : copy.primaryCtaGuest;
  const coverageStats = copy.coverageStats;
  const signalStories = useMemo(
    () =>
      copy.signalStories.map((story) => ({
        title: story.title,
        copy: story.copy,
        Icon: signalIcons[story.icon]
      })),
    [copy]
  );

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <MapPin className="h-4 w-4" /> {copy.heroTag}
            </div>
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit bg-accent/20 text-accent">
                {view === "global" ? copy.heroBadgeGlobal : copy.heroBadgeLocal}
              </Badge>
              <h1 className="text-balance font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">{copy.heroDescription}</p>
            </div>
            <div className="inline-grid grid-cols-2 gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm text-muted-foreground">
              {(["global", "local"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "rounded-xl px-4 py-2 text-left font-semibold transition",
                    view === mode ? "bg-background/80 text-white" : "hover:text-white"
                  )}
                  onClick={() => setView(mode)}
                >
                  {copy.viewToggle[mode]}
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
              <Button asChild size="lg" variant="outline" className="gap-2">
                <Link href="/hub-map/workspace">
                  {copy.secondaryCta}
                  <MoveRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {coverageStats.map((stat) => (
                <Card key={stat.label} className="border border-border/40 bg-card/50">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-semibold text-white">{stat.value}</p>
                    <p className="text-xs text-accent">{stat.delta}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <HubMapPreview hubs={demoHubs} activeHub={activeHub} onSelectHub={setActiveHubIndex} view={view} copy={copy} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {signalStories.map((story) => (
            <Card
              key={story.title}
              className="border border-border/50 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <story.Icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{story.title}</h3>
                <p className="text-sm text-muted-foreground">{story.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 rounded-3xl border border-border/50 bg-card/40 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Badge variant="secondary" className="bg-accent/20 text-accent">
              {copy.signalBadge}
            </Badge>
            <h2 className="text-3xl font-semibold text-white">{copy.signalHeading}</h2>
            <p className="text-base text-muted-foreground">{copy.signalBody}</p>
            <div className="grid gap-4 md:grid-cols-3">
              {demoHubs.map((hub, index) => (
                <button
                  type="button"
                  key={hub.name}
                  onMouseEnter={() => setActiveHubIndex(index)}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-left transition",
                    activeHubIndex === index ? "border-accent bg-border/30 text-white" : "border-border/40 bg-border/10 text-muted-foreground"
                  )}
                >
                  <p className="text-xs uppercase tracking-[0.3em]">{hub.city}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{hub.name}</p>
                  <p className="mt-3 text-sm">
                    {hub.members} {copy.hubMembersLabel}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <Card className="border border-border/40 bg-background/70">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <Compass className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{copy.zoomLabel}</p>
                  <p className="text-lg font-semibold text-white">{activeHub.name}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/40 bg-border/10 p-4">
                <p className="text-sm text-muted-foreground">{activeHub.city}</p>
                <p className="mt-3 text-sm text-white">{activeHub.members} verified members</p>
                <p className="text-sm text-white">{activeHub.checkins} lifetime check-ins</p>
              </div>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{copy.shareLabel}</p>
              <p className="text-sm text-muted-foreground">{copy.shareBody}</p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{copy.footerBadge}</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">{copy.footerHeading}</h2>
          <p className="mt-3 text-base text-muted-foreground">{copy.footerBody}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/hub-map/workspace">{copy.footerSecondary}</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const HubMapPreview = ({
  hubs,
  activeHub,
  onSelectHub,
  view,
  copy
}: {
  hubs: typeof demoHubs;
  activeHub: (typeof demoHubs)[number];
  onSelectHub: (index: number) => void;
  view: "global" | "local";
  copy: HubCopy;
}) => {
  return (
    <div className="relative grid rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-muted-foreground">
        <span>{view === "global" ? copy.previewHeaderGlobal : copy.previewHeaderLocal}</span>
        <span>{copy.previewStatus}</span>
      </div>
      <div className="relative h-80 overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background via-border/10 to-background">
        {hubs.map((hub, index) => (
          <button
            key={hub.name}
            type="button"
            className={cn(
              "group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full px-2 py-1 text-center text-xs font-medium",
              `bg-gradient-to-br ${hub.color}`,
              activeHub.name === hub.name ? "text-white" : "text-muted-foreground"
            )}
            style={{ left: hub.coords.x, top: hub.coords.y }}
            onMouseEnter={() => onSelectHub(index)}
          >
            <span>{hub.name}</span>
            <span className="rounded-full border border-white/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.4em] text-white">
              {hub.members}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-border/40 bg-border/10 p-4 text-sm">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{copy.previewNow}</p>
        <p className="mt-2 text-lg font-semibold text-white">{activeHub.name}</p>
        <p className="text-sm text-muted-foreground">{activeHub.city}</p>
      </div>
    </div>
  );
};
