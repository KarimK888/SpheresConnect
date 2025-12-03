"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Crown, Gift, Medal, Sparkles, Trophy, Wand2 } from "lucide-react";
import { useSessionState } from "@/context/session";
import { useI18n } from "@/context/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";

const rewardIcons = {
  rituals: Trophy,
  fulfill: Gift,
  customize: Wand2
};

type RewardTier = {
  id: string;
  label: string;
  points: string;
  perks: string[];
  gradient: string;
};

type RewardsCopy = {
  heroTag: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  primaryCtaAuthed: string;
  primaryCtaGuest: string;
  secondaryCta: string;
  tiers: RewardTier[];
  perks: { title: string; copy: string; icon: keyof typeof rewardIcons }[];
  automationBadge: string;
  automationHeading: string;
  automationBody: string;
  automationPills: { id: string; label: string }[];
  automationCardTitle: string;
  automationTrigger: string;
  automationReward: string;
  automationFallback: string;
  automationNote: string;
  highlightBadge: string;
  highlightHeading: string;
  highlightBody: string;
  highlightSecondary: string;
  tierStats: { label: string; value: string; caption: string }[];
  tierStay: string;
};

const rewardsCopy: Record<Locale, RewardsCopy> = {
  en: {
    heroTag: "Rewards",
    heroBadge: "Loyalty preview",
    heroTitle: "Let partners browse your loyalty engine without logging in",
    heroDescription:
      "This landing simulates tier unlocks, automation lanes, and perk catalogs while the actual reward workflows stay behind the authenticated wall.",
    primaryCtaAuthed: "Manage rewards",
    primaryCtaGuest: "Join rewards",
    secondaryCta: "Enter reward HQ",
    tiers: [
      {
        id: "signal",
        label: "Signal tier",
        points: "0-499",
        perks: ["Priority matching", "Hub boosts"],
        gradient: "from-emerald-400/30 to-transparent"
      },
      {
        id: "impact",
        label: "Impact tier",
        points: "500-1499",
        perks: ["Merch drops", "Studio credits"],
        gradient: "from-amber-400/30 to-transparent"
      },
      {
        id: "legend",
        label: "Legend tier",
        points: "1500+",
        perks: ["Profit share", "Early product votes"],
        gradient: "from-rose-400/30 to-transparent"
      }
    ],
    perks: [
      { title: "Stacked rituals", copy: "Reward streaks, attendance, and submissions automatically.", icon: "rituals" },
      { title: "Fulfillment", copy: "Ship merch or digital perks straight from Supabase triggers.", icon: "fulfill" },
      { title: "Customization", copy: "Blend manual drops with automated leaderboards per cohort.", icon: "customize" }
    ],
    automationBadge: "Automation lanes",
    automationHeading: "Preview every trigger before you flip rewards live",
    automationBody: "Give leadership or partners a transparent peek at how members earn perks from other system pillars—no credentials required.",
    automationPills: [
      { id: "Presence", label: "Presence" },
      { id: "Marketplace", label: "Marketplace" },
      { id: "Events", label: "Events" },
      { id: "Referrals", label: "Referrals" }
    ],
    automationCardTitle: "{lane} lane",
    automationTrigger: "Trigger: {lane} milestone",
    automationReward: "Reward: +120 points • Send merch voucher",
    automationFallback: "Fallback: DM if unclaimed in 72h",
    automationNote: "This is the exact messaging users will feel once they hit the metric inside the authenticated app.",
    highlightBadge: "Reward preview",
    highlightHeading: "Invite anyone to explore your loyalty engine, risk-free",
    highlightBody: "When you are ready, point them to the authenticated workspace powering all the automation.",
    highlightSecondary: "Open rewards workspace",
    tierStats: [
      { label: "Members in tier", value: "48", caption: "Auto-updated hourly" },
      { label: "Upcoming drops", value: "3", caption: "Merch • Travel • Credits" }
    ],
    tierStay: "Members stay here for 42 days on average"
  },
  fr: {
    heroTag: "Recompenses",
    heroBadge: "Preview fidelite",
    heroTitle: "Laissez vos partenaires explorer la loyaut sans login",
    heroDescription:
      "Cette landing simule les niveaux, automatisations et catalogues de perks tandis que les workflows reels restent derriere l'espace authentifie.",
    primaryCtaAuthed: "Gerer les rewards",
    primaryCtaGuest: "Rejoindre les rewards",
    secondaryCta: "Entrer dans le QG rewards",
    tiers: [
      {
        id: "signal",
        label: "Niveau signal",
        points: "0-499",
        perks: ["Matching prioritaire", "Boost hubs"],
        gradient: "from-emerald-400/30 to-transparent"
      },
      {
        id: "impact",
        label: "Niveau impact",
        points: "500-1499",
        perks: ["Drops merch", "Credits studio"],
        gradient: "from-amber-400/30 to-transparent"
      },
      {
        id: "legend",
        label: "Niveau legend",
        points: "1500+",
        perks: ["Profit share", "Votes produit"],
        gradient: "from-rose-400/30 to-transparent"
      }
    ],
    perks: [
      { title: "Rituels empiles", copy: "Recompensez streaks, presences et soumissions automatiquement.", icon: "rituals" },
      { title: "Fulfillment", copy: "Envoyez merch ou perks digitaux depuis les triggers Supabase.", icon: "fulfill" },
      { title: "Personnalisation", copy: "Melez drops manuels et leaderboards auto par cohorte.", icon: "customize" }
    ],
    automationBadge: "Lanes automation",
    automationHeading: "Previsualisez chaque trigger avant le go live",
    automationBody: "Offrez aux leaders un apercu clair de la facon dont les membres gagnent des perks depuis les autres piliers, sans identifiants.",
    automationPills: [
      { id: "Presence", label: "Presence" },
      { id: "Marketplace", label: "Marketplace" },
      { id: "Events", label: "Evenements" },
      { id: "Referrals", label: "Parrainages" }
    ],
    automationCardTitle: "Lane {lane}",
    automationTrigger: "Trigger : palier {lane}",
    automationReward: "Reward : +120 pts • Envoyer bon merch",
    automationFallback: "Fallback : DM si non reclame en 72h",
    automationNote: "C'est le message que verront les membres quand ils atteignent ce metric dans l'app.",
    highlightBadge: "Preview reward",
    highlightHeading: "Invitez qui vous voulez a explorer votre loyaut",
    highlightBody: "Quand vous etes pret, renvoyez-les vers l'espace authentifie qui pilote toute l'automatisation.",
    highlightSecondary: "Ouvrir le workspace rewards",
    tierStats: [
      { label: "Membres dans ce niveau", value: "48", caption: "Mise a jour horaire" },
      { label: "Drops a venir", value: "3", caption: "Merch • Voyage • Credits" }
    ],
    tierStay: "Les membres restent ici 42 jours en moyenne"
  },
  es: {
    heroTag: "Recompensas",
    heroBadge: "Preview de lealtad",
    heroTitle: "Deja que socios exploren tu motor de lealtad sin iniciar sesion",
    heroDescription:
      "Esta landing simula niveles, automatizaciones y catalogos de perks mientras los flujos reales permanecen tras el muro autenticado.",
    primaryCtaAuthed: "Gestionar recompensas",
    primaryCtaGuest: "Unirse a recompensas",
    secondaryCta: "Entrar al HQ de rewards",
    tiers: [
      {
        id: "signal",
        label: "Nivel senal",
        points: "0-499",
        perks: ["Matching prioritario", "Impulsos de hub"],
        gradient: "from-emerald-400/30 to-transparent"
      },
      {
        id: "impact",
        label: "Nivel impacto",
        points: "500-1499",
        perks: ["Drops de merch", "Creditos de estudio"],
        gradient: "from-amber-400/30 to-transparent"
      },
      {
        id: "legend",
        label: "Nivel legend",
        points: "1500+",
        perks: ["Participacion en ganancias", "Votos tempranos"],
        gradient: "from-rose-400/30 to-transparent"
      }
    ],
    perks: [
      { title: "Rituales encadenados", copy: "Premia streaks, asistencia y envios de forma automatica.", icon: "rituals" },
      { title: "Fulfillment", copy: "Despacha merch o perks digitales directo de Supabase.", icon: "fulfill" },
      { title: "Personalizacion", copy: "Combina drops manuales con leaderboards automaticos por cohorte.", icon: "customize" }
    ],
    automationBadge: "Lanes de automatizacion",
    automationHeading: "Previsualiza cada trigger antes de activar rewards",
    automationBody: "Da a lideres y socios una vista clara de como los miembros ganan perks en otros pilares sin credenciales.",
    automationPills: [
      { id: "Presence", label: "Presencia" },
      { id: "Marketplace", label: "Marketplace" },
      { id: "Events", label: "Eventos" },
      { id: "Referrals", label: "Referidos" }
    ],
    automationCardTitle: "Lane {lane}",
    automationTrigger: "Trigger: hito de {lane}",
    automationReward: "Recompensa: +120 pts • Enviar vale de merch",
    automationFallback: "Fallback: DM si no se reclama en 72h",
    automationNote: "Este es el mensaje que sentiran cuando alcancen el metric dentro del app.",
    highlightBadge: "Preview de rewards",
    highlightHeading: "Invita a cualquiera a explorar tu motor de lealtad",
    highlightBody: "Cuando estes listo, envia a todos al workspace autenticado que activa la automatizacion.",
    highlightSecondary: "Abrir workspace de rewards",
    tierStats: [
      { label: "Miembros en el nivel", value: "48", caption: "Actualizado cada hora" },
      { label: "Drops proximos", value: "3", caption: "Merch • Viaje • Creditos" }
    ],
    tierStay: "Los miembros permanecen aqui 42 dias en promedio"
  }
};

export default function RewardsLandingPage() {
  const { locale } = useI18n();
  const copy = rewardsCopy[locale as Locale] ?? rewardsCopy.en;
  const sessionUser = useSessionState((state) => state.user);
  const [activeTier, setActiveTier] = useState(copy.tiers[0].id);
  const [activeAutomation, setActiveAutomation] = useState(copy.automationPills[0].id);

  const tier = useMemo(() => copy.tiers.find((entry) => entry.id === activeTier) ?? copy.tiers[0], [copy.tiers, activeTier]);
  const primaryCtaHref = sessionUser ? "/rewards/workspace" : "/signup";
  const primaryCtaLabel = sessionUser ? copy.primaryCtaAuthed : copy.primaryCtaGuest;
  const automationOptions = copy.automationPills;
  const perkCards = useMemo(
    () =>
      copy.perks.map((perk) => ({
        title: perk.title,
        copy: perk.copy,
        Icon: rewardIcons[perk.icon]
      })),
    [copy.perks]
  );

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-accent/30 via-transparent to-transparent blur-3xl" />
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Crown className="h-4 w-4" /> {copy.heroTag}
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
            <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-border/20 p-2 text-sm text-muted-foreground">
              {copy.tiers.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={cn(
                    "rounded-xl px-3 py-2 font-semibold transition",
                    entry.id === activeTier ? "bg-background/80 text-white" : "hover:text-white"
                  )}
                  onClick={() => setActiveTier(entry.id)}
                >
                  {entry.label}
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
                <Link href="/rewards/workspace">{copy.secondaryCta}</Link>
              </Button>
            </div>
          </div>
          <TierPreview tier={tier} copy={copy} />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {perkCards.map((perk) => (
            <Card
              key={perk.title}
              className="border border-border/50 bg-card/50 transition duration-300 hover:-translate-y-1 hover:border-accent"
            >
              <CardContent className="flex flex-col gap-4 p-6">
                <perk.Icon className="h-8 w-8 text-accent" />
                <h3 className="text-lg font-semibold text-white">{perk.title}</h3>
                <p className="text-sm text-muted-foreground">{perk.copy}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-border/50 bg-card/40 p-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-4">
              <Badge variant="secondary" className="bg-accent/20 text-accent">
                {copy.automationBadge}
              </Badge>
              <h2 className="text-3xl font-semibold text-white">{copy.automationHeading}</h2>
              <p className="text-base text-muted-foreground">{copy.automationBody}</p>
              <div className="flex flex-wrap gap-3">
                {automationOptions.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    className={cn(
                      "rounded-full border px-4 py-1 text-sm uppercase tracking-[0.3em]",
                      pill.id === activeAutomation ? "border-accent text-white" : "border-border/50 text-muted-foreground"
                    )}
                    onClick={() => setActiveAutomation(pill.id)}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
            <Card className="flex-1 border border-border/40 bg-background/80">
              <CardContent className="space-y-4 p-6">
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                  {copy.automationCardTitle.replace("{lane}", automationOptions.find((opt) => opt.id === activeAutomation)?.label ?? activeAutomation)}
                </p>
                <div className="rounded-2xl border border-border/40 bg-border/10 p-4 text-sm text-muted-foreground">
                  <p className="text-white">
                    {copy.automationTrigger.replace(
                      "{lane}",
                      automationOptions.find((opt) => opt.id === activeAutomation)?.label ?? activeAutomation
                    )}
                  </p>
                  <p>{copy.automationReward}</p>
                  <p>{copy.automationFallback}</p>
                </div>
                <p className="text-sm text-muted-foreground">{copy.automationNote}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="rounded-3xl border border-border/50 bg-gradient-to-br from-border/40 via-background to-background p-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">{copy.highlightBadge}</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">{copy.highlightHeading}</h2>
          <p className="mt-2 text-base text-muted-foreground">{copy.highlightBody}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href={primaryCtaHref}>
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/rewards/workspace">{copy.highlightSecondary}</Link>
            </Button>
          </div>
        </section>
      </section>
    </div>
  );
}

const TierPreview = ({ tier, copy }: { tier: RewardTier; copy: RewardsCopy }) => {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.55)]">
      <div className={cn("rounded-2xl border border-border/40 bg-gradient-to-br p-6 text-white", tier.gradient)}>
        <p className="text-xs uppercase tracking-[0.3em] text-white/80">{tier.points} pts</p>
        <h3 className="mt-2 text-2xl font-semibold">{tier.label}</h3>
        <ul className="mt-3 space-y-2 text-sm text-white/80">
          {tier.perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> {perk}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="border border-border/40 bg-background/70">
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.3em]">{copy.tierStats[0].label}</p>
            <p className="text-lg font-semibold text-white">{copy.tierStats[0].value}</p>
            <p>{copy.tierStats[0].caption}</p>
          </CardContent>
        </Card>
        <Card className="border border-border/40 bg-background/70">
          <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
            <p className="text-xs uppercase tracking-[0.3em]">{copy.tierStats[1].label}</p>
            <p className="text-lg font-semibold text-white">{copy.tierStats[1].value}</p>
            <p>{copy.tierStats[1].caption}</p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 rounded-2xl border border-border/40 bg-border/10 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Medal className="h-4 w-4 text-amber-300" />
          {copy.tierStay}
        </div>
      </div>
    </div>
  );
};
