"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/context/i18n";
import type { MatchSuggestion } from "@/lib/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";

interface MatchCardProps {
  user: MatchSuggestion;
  onConnect: (userId: string) => void;
  onSkip: (userId: string) => void;
}

export const MatchCard = ({ user, onConnect, onSkip }: MatchCardProps) => {
  const { t } = useI18n();
  const hasHubMeta = Boolean(user.hubName || user.sharedHub || typeof user.distanceKm === "number");

  return (
    <motion.div
      key={user.userId}
      className="max-w-md"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              {user.displayName}
              {user.isVerified && <Badge>{t("match_card_verified")}</Badge>}
            </CardTitle>
            {hasHubMeta && (
              <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                {user.sharedHub && <Badge variant="accent">{t("matcher_same_hub_badge")}</Badge>}
                {!user.sharedHub && user.hubName && (
                  <Badge variant="outline">{t("matcher_other_hub_badge", { hub: user.hubName })}</Badge>
                )}
                {typeof user.distanceKm === "number" && (
                  <span>{t("matcher_distance_label", { distance: Math.round(user.distanceKm) })}</span>
                )}
              </div>
            )}
          </div>
          {user.bio && <p className="text-sm text-muted-foreground">{user.bio}</p>}
        </CardHeader>
        <CardContent className="space-y-3">
          {user.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {user.skills.slice(0, 10).map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="ghost" onClick={() => onSkip(user.userId)}>
            {t("match_card_skip")}
          </Button>
          <Button variant="accent" onClick={() => onConnect(user.userId)}>
            {t("match_card_connect")}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
