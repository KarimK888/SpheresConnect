"use client";

import Image from "next/image";
import { useI18n } from "@/context/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArtworkCard } from "@/components/ArtworkCard";
import type { Artwork, MatchSuggestion, User } from "@/lib/types";
import { MatchCard } from "@/components/MatchCard";
import { sampleUsers, sampleHubs } from "@/lib/sample-data";

interface ProfileClientProps {
  user: User;
  listings: Artwork[];
}

export const ProfileClient = ({ user, listings }: ProfileClientProps) => {
  const { t } = useI18n();
  const userHub = sampleHubs.find((hub) => hub.activeUsers.includes(user.userId));
  const suggested: MatchSuggestion[] = sampleUsers
    .filter((candidate) => candidate.userId !== user.userId)
    .slice(0, 3)
    .map((candidate) => {
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

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/20 via-background to-background px-6 py-10 shadow-2xl">
        <div className="grid gap-8 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
            <div className="relative h-32 w-32 overflow-hidden rounded-full border border-border/60 bg-background/80">
              {user.profilePictureUrl ? (
                <Image src={user.profilePictureUrl} alt={user.displayName} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-white">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white">{user.displayName}</h1>
              <p className="text-sm text-muted-foreground">{user.bio || t("profile_bio_placeholder")}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              {user.skills.slice(0, 8).map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="accent">{t("profile_button_collaborate")}</Button>
              <Button variant="outline">{t("profile_button_message")}</Button>
            </div>
          </div>
          <Card className="border-border/40 bg-background/70">
            <CardContent className="grid h-full gap-6 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("profile_connections_label")}</p>
                <p className="text-2xl font-semibold text-white">{user.connections.length}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("profile_joined_label")}</p>
                <p className="text-2xl font-semibold text-white">
                  {new Date(user.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("profile_language_label")}</p>
                <p className="text-2xl font-semibold text-white">{user.language.toUpperCase()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
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
              <ArtworkCard key={artwork.artworkId} artwork={artwork} />
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
              <ArtworkCard key={artwork.artworkId} artwork={artwork} />
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
    </div>
  );
};
