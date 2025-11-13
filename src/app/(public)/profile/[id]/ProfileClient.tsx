"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useI18n } from "@/context/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArtworkCard } from "@/components/ArtworkCard";
import type {
  Artwork,
  MatchSuggestion,
  User,
  UserProfile,
  UserProfileMedia,
  UserProfileProject,
  UserSocialLinks
} from "@/lib/types";
import { MatchCard } from "@/components/MatchCard";
import { sampleUsers, sampleHubs } from "@/lib/sample-data";
import { FileDrop } from "@/components/FileDrop";
import { getBackend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  Dribbble,
  ExternalLink,
  Globe,
  Instagram,
  Linkedin,
  Palette,
  Plus,
  Save,
  Twitter,
  UploadCloud,
  X,
  Youtube
} from "lucide-react";

const makeLocalId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const SOCIAL_FIELDS = [
  { key: "website", label: "Website", icon: Globe },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "twitter", label: "Twitter / X", icon: Twitter },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "behance", label: "Behance", icon: Palette },
  { key: "dribbble", label: "Dribbble", icon: Dribbble },
  { key: "youtube", label: "YouTube", icon: Youtube }
] as const;

type SocialKey = (typeof SOCIAL_FIELDS)[number]["key"];

const defaultSocials: UserSocialLinks = SOCIAL_FIELDS.reduce(
  (acc, field) => ({ ...acc, [field.key]: "" }),
  {}
) as UserSocialLinks;

type Availability = NonNullable<UserProfile["availability"]>;
type CollaborationMode = NonNullable<UserProfile["preferredCollabModes"]>[number];

interface ProfileEditorState {
  displayName: string;
  bio: string;
  headline: string;
  locationName: string;
  availability: Availability;
  timezone: string;
  skills: string[];
  coverImageUrl: string;
  profilePictureUrl: string;
  socials: UserSocialLinks;
  media: UserProfileMedia[];
  projects: UserProfileProject[];
  resumeUrl: string;
  featuredVideoUrl: string;
  preferredCollabModes: CollaborationMode[];
}

const buildFormState = (user: User): ProfileEditorState => {
  const profile = user.profile ?? {};
  return {
    displayName: user.displayName ?? "",
    bio: user.bio ?? "",
    headline: profile.headline ?? "",
    locationName: profile.locationName ?? "",
    availability: profile.availability ?? "open",
    timezone: profile.timezone ?? "UTC",
    skills: user.skills ?? [],
    coverImageUrl:
      profile.coverImageUrl ?? `https://placehold.co/1200x420?text=${encodeURIComponent(user.displayName ?? "Profile")}`,
    profilePictureUrl: user.profilePictureUrl ?? "",
    socials: { ...defaultSocials, ...(profile.socials ?? {}) },
    media: profile.media ?? [],
    projects: profile.projects ?? [],
    resumeUrl: profile.resumeUrl ?? "",
    featuredVideoUrl: profile.featuredVideoUrl ?? "",
    preferredCollabModes: profile.preferredCollabModes ?? ["remote"]
  };
};

const sanitizeSocials = (socials: UserSocialLinks): UserSocialLinks =>
  Object.entries(socials).reduce<UserSocialLinks>((acc, [key, value]) => {
    if (value?.trim()) {
      acc[key as SocialKey] = value.trim();
    }
    return acc;
  }, {});

const COLLAB_OPTIONS: CollaborationMode[] = ["remote", "in-person", "hybrid"];

const SOCIAL_ICON_MAP: Record<SocialKey, LucideIcon> = {
  website: Globe,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  behance: Palette,
  dribbble: Dribbble,
  youtube: Youtube
};

interface ProfileClientProps {
  user: User;
  listings: Artwork[];
  viewerId?: string | null;
  onUserUpdated?: (next: User) => void;
}

export const ProfileClient = ({ user, listings, viewerId, onUserUpdated }: ProfileClientProps) => {
  const { t } = useI18n();
  const router = useRouter();
  const backend = useMemo(() => getBackend(), []);
  const [profileUser, setProfileUser] = useState(user);
  const [formState, setFormState] = useState<ProfileEditorState>(() => buildFormState(user));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedListing, setSelectedListing] = useState<Artwork | null>(null);
  const [purchaseState, setPurchaseState] = useState<{ status: "idle" | "loading" | "success" | "error"; message?: string }>({
    status: "idle"
  });
  const [purchaseIntent, setPurchaseIntent] = useState<{ clientSecret: string; orderId: string } | null>(null);

  useEffect(() => {
    setProfileUser(user);
    setFormState(buildFormState(user));
  }, [user]);

  const profile = profileUser.profile ?? {};
  const isOwner = Boolean(viewerId && viewerId === profileUser.userId);
  const userHub = useMemo(
    () => sampleHubs.find((hub) => hub.activeUsers.includes(profileUser.userId)),
    [profileUser.userId]
  );

  const suggested = useMemo(() => {
    return sampleUsers
      .filter((candidate) => candidate.userId !== profileUser.userId)
      .slice(0, 3)
      .map<MatchSuggestion>((candidate) => {
        const candidateHub = sampleHubs.find((hub) => hub.activeUsers.includes(candidate.userId));
        return {
          ...candidate,
          hubId: candidateHub?.hubId,
          hubName: candidateHub?.name,
          sharedHub: Boolean(userHub && candidateHub && candidateHub.hubId === userHub.hubId),
          distanceKm: undefined,
          score: undefined
        };
      });
  }, [profileUser.userId, userHub]);

  const handleCollaborate = useCallback(() => {
    router.push(`/matcher?with=${profileUser.userId}`);
  }, [router, profileUser.userId]);

  const handleMessage = useCallback(async () => {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    if (viewerId === profileUser.userId) {
      setFeedback({ type: "error", message: t("profile_message_self_error") });
      return;
    }
    setMessaging(true);
    setFeedback(null);
    try {
      const existingChats = await backend.messages.listChats({ userId: viewerId });
      const existing = existingChats.find(
        (chat) =>
          !chat.isGroup &&
          chat.memberIds.length === 2 &&
          chat.memberIds.includes(viewerId) &&
          chat.memberIds.includes(profileUser.userId)
      );
      const chat =
        existing ??
        (await backend.messages.createChat({
          memberIds: Array.from(new Set([viewerId, profileUser.userId])),
          isGroup: false
        }));
      router.push(`/messages?chat=${chat.chatId}`);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : t("profile_editor_error")
      });
    } finally {
      setMessaging(false);
    }
  }, [backend, router, viewerId, profileUser.userId, t]);

  const openListing = useCallback((artwork: Artwork) => {
    setSelectedListing(artwork);
    setPurchaseState({ status: "idle" });
    setPurchaseIntent(null);
  }, []);

  const closeListing = useCallback(() => {
    setSelectedListing(null);
    setPurchaseState({ status: "idle" });
    setPurchaseIntent(null);
  }, []);

  const handlePurchase = useCallback(
    async (artwork: Artwork) => {
      if (!viewerId) {
        router.push("/login");
        return;
      }

      setPurchaseState({ status: "loading" });
      setPurchaseIntent(null);
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artworkId: artwork.artworkId })
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error?.message ?? "Unable to start purchase");
        }
        const payload = await response.json();
        setPurchaseIntent({
          clientSecret: payload.clientSecret,
          orderId: payload.order.orderId
        });
        setPurchaseState({ status: "success", message: t("profile_collect_success") });
      } catch (error) {
        setPurchaseState({
          status: "error",
          message: error instanceof Error ? error.message : t("profile_collect_error")
        });
      }
    },
    [router, t, viewerId]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const sanitizedSocials = sanitizeSocials(formState.socials);
      const cleanedSkills = Array.from(new Set(formState.skills.map((skill) => skill.trim()).filter(Boolean)));
      const payload: Partial<User> = {
        displayName: formState.displayName.trim() || profileUser.displayName,
        bio: formState.bio.trim() || undefined,
        skills: cleanedSkills,
        profilePictureUrl: formState.profilePictureUrl || undefined,
        connections: profileUser.connections,
        isVerified: profileUser.isVerified,
        language: profileUser.language,
        location: profileUser.location,
        profile: {
          ...(profileUser.profile ?? {}),
          headline: formState.headline.trim() || undefined,
          locationName: formState.locationName.trim() || undefined,
          availability: formState.availability,
          timezone: formState.timezone,
          coverImageUrl: formState.coverImageUrl || undefined,
          socials: sanitizedSocials,
          media: formState.media,
          projects: formState.projects,
          resumeUrl: formState.resumeUrl || undefined,
          featuredVideoUrl: formState.featuredVideoUrl || undefined,
          preferredCollabModes: formState.preferredCollabModes.length
            ? formState.preferredCollabModes
            : ["remote"]
        }
      };
      const updated = await backend.users.update(profileUser.userId, payload);
      setProfileUser(updated);
      setFormState(buildFormState(updated));
      setFeedback({ type: "success", message: t("profile_editor_success") });
      setEditing(false);
      onUserUpdated?.(updated);
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : t("profile_editor_error")
      });
    } finally {
      setSaving(false);
    }
  }, [backend, formState, onUserUpdated, profileUser, t]);

  const baseCoverImage =
    profile.coverImageUrl ?? `https://placehold.co/1200x420?text=${encodeURIComponent(profileUser.displayName)}`;
  const displayedCoverImage = editing ? formState.coverImageUrl || baseCoverImage : baseCoverImage;
  const baseAvatarImage = profileUser.profilePictureUrl ?? "";
  const displayedAvatarImage = editing ? formState.profilePictureUrl || baseAvatarImage : baseAvatarImage;
  const previewDisplayName = editing ? formState.displayName || profileUser.displayName : profileUser.displayName;
  const previewHeadline = editing ? formState.headline : profile.headline;
  const previewBio = editing ? formState.bio : profileUser.bio;
  const previewLocation = editing ? formState.locationName : profile.locationName;
  const previewAvailability = editing ? formState.availability : profile.availability ?? "open";
  const previewCollabModes = editing ? formState.preferredCollabModes : profile.preferredCollabModes ?? [];
  const previewSkills = editing ? formState.skills : profileUser.skills;
  const previewSocials = editing ? sanitizeSocials(formState.socials) : profile.socials ?? {};
  const previewMedia = editing ? formState.media : profile.media ?? [];
  const previewProjects = editing ? formState.projects : profile.projects ?? [];
  const socialEntries = SOCIAL_FIELDS.filter((field) => previewSocials[field.key]);

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-background/80 shadow-2xl">
        <div className="relative h-48 w-full overflow-hidden">
          <Image src={displayedCoverImage} alt={profileUser.displayName} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/40 to-background" />
        </div>
        <div className="grid gap-8 p-6 md:grid-cols-[auto,1fr]">
          <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
            <div className="relative">
              <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-background/60 bg-background">
                {displayedAvatarImage ? (
                  <Image src={displayedAvatarImage} alt={profileUser.displayName} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-white">
                    {profileUser.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              {isOwner && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -right-2 -bottom-2 h-9 w-9 rounded-full"
                  onClick={() => setEditing(true)}
                >
                  <UploadCloud className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white">{previewDisplayName}</h1>
              <p className="text-sm text-muted-foreground">
                {previewHeadline || previewBio || t("profile_bio_placeholder")}
              </p>
              {previewLocation && <p className="text-xs text-muted-foreground">{previewLocation}</p>}
            </div>
            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              {previewSkills.slice(0, 8).map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-3 md:justify-start">
              <Button variant="accent" onClick={handleCollaborate}>
                {t("profile_button_collaborate")}
              </Button>
              <Button variant="outline" onClick={handleMessage} disabled={messaging}>
                {messaging ? t("profile_loading") : t("profile_button_message")}
              </Button>
              {isOwner && (
                <Button variant="ghost" onClick={() => setEditing((value) => !value)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("profile_edit_button")}
                </Button>
              )}
            </div>
            {socialEntries.length ? <SocialLinksBar socials={previewSocials} /> : null}
          </div>
          <Card className="border-border/40 bg-background/70">
            <CardContent className="grid gap-6 p-6 text-sm text-muted-foreground">
              <div>
                <p className="text-xs uppercase tracking-[0.3em]">{t("profile_connections_label")}</p>
                <p className="text-2xl font-semibold text-white">{profileUser.connections.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em]">{t("profile_joined_label")}</p>
                <p className="text-2xl font-semibold text-white">
                  {new Date(profileUser.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em]">{t("profile_language_label")}</p>
                <p className="text-2xl font-semibold text-white">{profileUser.language.toUpperCase()}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{previewAvailability}</Badge>
                  {previewCollabModes.map((mode) => (
                    <Badge key={mode} variant="outline">
                      {mode}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {feedback && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          )}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="mr-2 inline h-4 w-4" />
          ) : (
            <AlertTriangle className="mr-2 inline h-4 w-4" />
          )}
          {feedback.message}
        </div>
      )}

      {editing && (
        <ProfileEditorPanel
          state={formState}
          setState={setFormState}
          onSubmit={handleSave}
          onCancel={() => {
            setFormState(buildFormState(profileUser));
            setEditing(false);
          }}
          saving={saving}
          t={t}
        />
      )}

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-border/60 bg-background/60 p-6">
          <h2 className="text-lg font-semibold text-white">{t("profile_media_label")}</h2>
          <Separator className="my-4" />
          <MediaGallery media={previewMedia} emptyLabel={t("profile_media_empty")} />
        </Card>
        <Card className="border-border/60 bg-background/60 p-6">
          <h2 className="text-lg font-semibold text-white">{t("profile_projects_label")}</h2>
          <Separator className="my-4" />
          <ProjectsList
            projects={previewProjects}
            emptyLabel={t("profile_projects_empty")}
            viewLabel={t("profile_view_project")}
          />
        </Card>
      </section>

      <Tabs defaultValue="portfolio" className="space-y-6">
        <TabsList>
          <TabsTrigger value="portfolio">{t("profile_tab_portfolio")}</TabsTrigger>
          <TabsTrigger value="listings">{t("profile_tab_listings")}</TabsTrigger>
          <TabsTrigger value="matches">{t("profile_tab_matches")}</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listings.slice(0, 6).map((artwork) => (
              <ArtworkCard
                key={artwork.artworkId}
                artwork={artwork}
                onSelect={openListing}
                onAction={() => openListing(artwork)}
                actionLabel={t("profile_collect_cta")}
                disabled={isOwner}
              />
            ))}
            {listings.length === 0 && (
              <Card className="border-dashed bg-border/10 p-6 text-sm text-muted-foreground">
                {t("profile_empty_portfolio")}
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="listings">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((artwork) => (
              <ArtworkCard
                key={artwork.artworkId}
                artwork={artwork}
                onSelect={openListing}
                onAction={() => openListing(artwork)}
                actionLabel={t("profile_collect_cta")}
                disabled={isOwner}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matches">
          <div className="grid gap-6 md:grid-cols-2">
            {suggested.map((candidate) => (
              <MatchCard key={candidate.userId} user={candidate} onConnect={() => {}} onSkip={() => {}} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
      {selectedListing && (
        <ListingPreviewOverlay
          artwork={selectedListing}
          onClose={closeListing}
          onPurchase={handlePurchase}
          purchaseState={purchaseState}
          purchaseIntent={purchaseIntent}
          isOwner={isOwner}
        />
      )}
    </div>
  );
};

interface ProfileEditorPanelProps {
  state: ProfileEditorState;
  setState: Dispatch<SetStateAction<ProfileEditorState>>;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  t: ReturnType<typeof useI18n>["t"];
}

const ProfileEditorPanel = ({ state, setState, onSubmit, onCancel, saving, t }: ProfileEditorPanelProps) => {
  const [skillInput, setSkillInput] = useState("");

  const addSkill = () => {
    if (!skillInput.trim()) return;
    setState((prev) => ({
      ...prev,
      skills: Array.from(new Set([...prev.skills, skillInput.trim()]))
    }));
    setSkillInput("");
  };

  return (
    <Card className="border-border/60 bg-background/80 p-6">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t("profile_display_name_label")}</Label>
            <Input value={state.displayName} onChange={(event) => setState((prev) => ({ ...prev, displayName: event.target.value }))} />
          </div>
          <div>
            <Label>{t("profile_headline_label")}</Label>
            <Input value={state.headline} onChange={(event) => setState((prev) => ({ ...prev, headline: event.target.value }))} />
          </div>
          <div>
            <Label>{t("profile_location_label")}</Label>
            <Input value={state.locationName} onChange={(event) => setState((prev) => ({ ...prev, locationName: event.target.value }))} />
          </div>
          <div>
            <Label>{t("profile_timezone_label")}</Label>
            <Input value={state.timezone} onChange={(event) => setState((prev) => ({ ...prev, timezone: event.target.value }))} />
          </div>
        </div>
        <div>
          <Label>{t("profile_bio_placeholder")}</Label>
          <Textarea rows={4} value={state.bio} onChange={(event) => setState((prev) => ({ ...prev, bio: event.target.value }))} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t("profile_availability_label")}</Label>
            <select
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
              value={state.availability}
              onChange={(event) => setState((prev) => ({ ...prev, availability: event.target.value as Availability }))}
            >
              <option value="open">Open</option>
              <option value="limited">Limited</option>
              <option value="booked">Booked</option>
            </select>
          </div>
          <div>
            <Label>{t("profile_preferred_modes_label")}</Label>
            <div className="flex flex-wrap gap-2">
              {COLLAB_OPTIONS.map((option) => {
                const active = state.preferredCollabModes.includes(option);
                return (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={active ? "accent" : "outline"}
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        preferredCollabModes: active
                          ? prev.preferredCollabModes.filter((mode) => mode !== option)
                          : [...prev.preferredCollabModes, option]
                      }))
                    }
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
        <div>
          <Label>{t("profile_skills_label")}</Label>
          <div className="flex gap-2">
            <Input
              value={skillInput}
              placeholder={t("profile_add_skill_placeholder")}
              onChange={(event) => setSkillInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addSkill();
                }
              }}
            />
            <Button type="button" onClick={addSkill}>
              <Plus className="mr-2 h-4 w-4" />
              {t("profile_add_skill_action")}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="cursor-pointer"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    skills: prev.skills.filter((item) => item !== skill)
                  }))
                }
              >
                {skill}
                <X className="ml-2 h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t("profile_avatar_label")}</Label>
            <Input
              value={state.profilePictureUrl}
              placeholder="https://"
              onChange={(event) => setState((prev) => ({ ...prev, profilePictureUrl: event.target.value }))}
            />
            <FileDrop onUploaded={(url) => setState((prev) => ({ ...prev, profilePictureUrl: url }))} />
          </div>
          <div>
            <Label>{t("profile_cover_label")}</Label>
            <Input
              value={state.coverImageUrl}
              placeholder="https://"
              onChange={(event) => setState((prev) => ({ ...prev, coverImageUrl: event.target.value }))}
            />
            <FileDrop onUploaded={(url) => setState((prev) => ({ ...prev, coverImageUrl: url }))} />
          </div>
        </div>
        <div>
          <Label>{t("profile_socials_label")}</Label>
          <div className="grid gap-4 md:grid-cols-2">
            {SOCIAL_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-2">
                <field.icon className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={state.socials[field.key] ?? ""}
                  placeholder={field.label}
                  onChange={(event) =>
                    setState((prev) => ({
                      ...prev,
                      socials: { ...prev.socials, [field.key]: event.target.value }
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label>{t("profile_media_label")}</Label>
          <div className="space-y-4">
            {state.media.length === 0 && <p className="text-sm text-muted-foreground">{t("profile_media_empty")}</p>}
            {state.media.map((asset) => (
              <div key={asset.mediaId} className="rounded-2xl border border-border/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={asset.title}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        media: prev.media.map((item) =>
                          item.mediaId === asset.mediaId ? { ...item, title: event.target.value } : item
                        )
                      }))
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        media: prev.media.filter((item) => item.mediaId !== asset.mediaId)
                      }))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  className="mt-2"
                  value={asset.url}
                  placeholder="https://"
                  onChange={(event) =>
                    setState((prev) => ({
                      ...prev,
                      media: prev.media.map((item) =>
                        item.mediaId === asset.mediaId ? { ...item, url: event.target.value } : item
                      )
                    }))
                  }
                />
                <Textarea
                  className="mt-2"
                  rows={2}
                  value={asset.description ?? ""}
                  placeholder={t("profile_media_description_placeholder")}
                  onChange={(event) =>
                    setState((prev) => ({
                      ...prev,
                      media: prev.media.map((item) =>
                        item.mediaId === asset.mediaId ? { ...item, description: event.target.value } : item
                      )
                    }))
                  }
                />
              </div>
            ))}
            <FileDrop
              onUploaded={(url) =>
                setState((prev) => ({
                  ...prev,
                  media: [
                    ...prev.media,
                    {
                      mediaId: makeLocalId("media"),
                      title: "New asset",
                      type: "image",
                      url
                    }
                  ]
                }))
              }
            />
          </div>
        </div>
        <div>
          <Label>{t("profile_projects_label")}</Label>
          <div className="space-y-4">
            {state.projects.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("profile_projects_empty")}</p>
            )}
            {state.projects.map((project) => (
              <div key={project.projectId} className="rounded-2xl border border-border/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={project.title}
                    onChange={(event) =>
                      setState((prev) => ({
                        ...prev,
                        projects: prev.projects.map((item) =>
                          item.projectId === project.projectId ? { ...item, title: event.target.value } : item
                        )
                      }))
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        projects: prev.projects.filter((item) => item.projectId !== project.projectId)
                      }))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea
                  className="mt-2"
                  rows={2}
                  value={project.summary ?? ""}
                  placeholder={t("profile_project_summary_placeholder")}
                  onChange={(event) =>
                    setState((prev) => ({
                      ...prev,
                      projects: prev.projects.map((item) =>
                        item.projectId === project.projectId ? { ...item, summary: event.target.value } : item
                      )
                    }))
                  }
                />
                <Input
                  className="mt-2"
                  value={project.link ?? ""}
                  placeholder="https://"
                  onChange={(event) =>
                    setState((prev) => ({
                      ...prev,
                      projects: prev.projects.map((item) =>
                        item.projectId === project.projectId ? { ...item, link: event.target.value } : item
                      )
                    }))
                  }
                />
                <Input
                  className="mt-2"
                  value={project.tags?.join(", ") ?? ""}
                  placeholder={t("profile_project_tags_placeholder")}
                  onChange={(event) =>
                    setState((prev) => ({
                      ...prev,
                      projects: prev.projects.map((item) =>
                        item.projectId === project.projectId
                          ? {
                              ...item,
                              tags: event.target.value
                                .split(",")
                                .map((tag) => tag.trim())
                                .filter(Boolean)
                            }
                          : item
                      )
                    }))
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  projects: [
                    ...prev.projects,
                    {
                      projectId: makeLocalId("project"),
                      title: "New project",
                      summary: "",
                      tags: []
                    }
                  ]
                }))
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("profile_add_project")}
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>{t("profile_resume_label")}</Label>
            <Input value={state.resumeUrl} placeholder="https://" onChange={(event) => setState((prev) => ({ ...prev, resumeUrl: event.target.value }))} />
            <FileDrop onUploaded={(url) => setState((prev) => ({ ...prev, resumeUrl: url }))} />
          </div>
          <div>
            <Label>{t("profile_featured_media_label")}</Label>
            <Input
              value={state.featuredVideoUrl}
              placeholder="https://youtube.com/..."
              onChange={(event) => setState((prev) => ({ ...prev, featuredVideoUrl: event.target.value }))}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? t("profile_saving_label") : t("profile_save_button")}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            <X className="mr-2 h-4 w-4" />
            {t("profile_cancel_button")}
          </Button>
        </div>
      </form>
    </Card>
  );
};

const SocialLinksBar = ({ socials }: { socials?: UserSocialLinks }) => {
  if (!socials) return null;
  const entries = SOCIAL_FIELDS.filter((field) => socials[field.key]);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2 md:justify-start">
      {entries.map((field) => {
        const value = socials[field.key];
        if (!value) return null;
        const Icon = SOCIAL_ICON_MAP[field.key];
        return (
          <Button key={field.key} variant="ghost" size="sm" className="gap-2" asChild>
            <a href={value} target="_blank" rel="noreferrer">
              <Icon className="h-4 w-4" />
              {field.label}
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        );
      })}
    </div>
  );
};

const MediaGallery = ({ media, emptyLabel }: { media: UserProfileMedia[]; emptyLabel: string }) => {
  if (!media.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {media.map((item) => (
        <Card key={item.mediaId} className="overflow-hidden border-border/40 bg-background/50">
          <div className="relative h-40 w-full">
            {item.type === "image" ? (
              <Image src={item.url} alt={item.title} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-border/20 text-xs text-muted-foreground">
                {item.type.toUpperCase()}
              </div>
            )}
          </div>
          <CardContent className="space-y-1 p-4">
            <p className="font-semibold text-white">{item.title}</p>
            {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const ProjectsList = ({
  projects,
  emptyLabel,
  viewLabel
}: {
  projects: UserProfileProject[];
  emptyLabel: string;
  viewLabel: string;
}) => {
  if (!projects.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div key={project.projectId} className="rounded-2xl border border-border/40 bg-background/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-white">{project.title}</p>
            {project.link && (
              <a href={project.link} target="_blank" rel="noreferrer" className="text-xs text-accent">
                {viewLabel}
              </a>
            )}
          </div>
          {project.summary && <p className="mt-2 text-sm text-muted-foreground">{project.summary}</p>}
          {project.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

interface ListingPreviewOverlayProps {
  artwork: Artwork;
  onClose: () => void;
  onPurchase: (artwork: Artwork) => void;
  purchaseState: { status: "idle" | "loading" | "success" | "error"; message?: string };
  purchaseIntent: { clientSecret: string; orderId: string } | null;
  isOwner: boolean;
}

const ListingPreviewOverlay = ({
  artwork,
  onClose,
  onPurchase,
  purchaseState,
  purchaseIntent,
  isOwner
}: ListingPreviewOverlayProps) => {
  const { t } = useI18n();
  const isLoading = purchaseState.status === "loading";
  const showFeedback = purchaseState.status === "success" || purchaseState.status === "error";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-10"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <Card
        className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-y-auto border-border/80 bg-background/95 p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("marketplace_detail_heading")}</p>
            <h2 className="text-2xl font-semibold text-white">{artwork.title}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            {t("marketplace_detail_close")}
          </Button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/20">
              <Image
                src={artwork.mediaUrls[0] ?? "https://placehold.co/800x600?text=Artwork"}
                alt={artwork.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {artwork.description ?? t("marketplace_detail_description")}
            </p>
            <div className="flex flex-wrap gap-2">
              {artwork.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-border/60 bg-background/40 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {t("marketplace_detail_price")}
              </p>
              <p className="text-3xl font-semibold text-white">
                {(artwork.price / 100).toLocaleString(undefined, {
                  style: "currency",
                  currency: artwork.currency?.toUpperCase() ?? "USD",
                  minimumFractionDigits: 0
                })}
              </p>
            </div>
            <Separator className="border-border/40" />
            {isOwner ? (
              <p className="text-sm text-muted-foreground">{t("profile_collect_owner")}</p>
            ) : (
              <Button
                size="lg"
                className="w-full"
                disabled={isLoading}
                onClick={() => onPurchase(artwork)}
              >
                {isLoading ? t("profile_collect_processing") : t("profile_collect_cta")}
              </Button>
            )}
            {showFeedback && purchaseState.message && (
              <div
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm",
                  purchaseState.status === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                )}
              >
                {purchaseState.message}
              </div>
            )}
            {purchaseIntent && (
              <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-xs text-muted-foreground">
                <p className="text-sm font-semibold text-white">{t("profile_collect_order_label")}</p>
                <p className="mt-1 font-mono text-xs text-white/80">{purchaseIntent.orderId}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
