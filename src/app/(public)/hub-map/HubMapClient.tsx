"use client";

import { useMemo, useState } from "react";
import { Map } from "@/components/Map";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCheckin } from "@/hooks/useCheckin";
import { useI18n } from "@/context/i18n";
import type { Hub, Checkin } from "@/lib/types";
import { sampleUsers } from "@/lib/sample-data";

interface HubMapClientProps {
  hubs: Hub[];
  initialCheckins: Checkin[];
}

export const HubMapClient = ({ hubs, initialCheckins }: HubMapClientProps) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const { checkins, checkIn } = useCheckin({ autoRefreshMs: 15000 });
  const [online, setOnline] = useState(true);

  const activeCheckins = checkins.length ? checkins : initialCheckins;
  const enrichedCheckins = useMemo(() => {
    return activeCheckins
      .map((entry) => ({
        ...entry,
        profile: sampleUsers.find((candidate) => candidate.userId === entry.userId)
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [activeCheckins]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">{t("hub_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("hub_subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={online}
            onCheckedChange={setOnline}
            aria-label={t("hub_presence_toggle")}
          />
          <span className="text-sm text-muted-foreground">
            {online ? t("generic_online") : t("generic_offline")}
          </span>
          <Button
            disabled={!user}
            onClick={() =>
              user &&
              checkIn({
                userId: user.userId,
                status: online ? "online" : "offline",
                location: user.location ?? { lat: 45.5017, lng: -73.5673 }
              })
            }
          >
            {user ? t("generic_check_in") : t("generic_login_to_check_in")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-border/60 bg-border/10 p-4">
          <Map hubs={hubs} checkins={activeCheckins} />
        </div>
        <div className="flex flex-col gap-4">
          <Card className="border-border/60 bg-card/80">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("hub_live_creatives_label")}</p>
                  <p className="text-2xl font-semibold text-white">{activeCheckins.length}</p>
                </div>
                <Badge>{t("hub_live_creatives_delta")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t("hub_live_creatives_description")}</p>
            </CardContent>
          </Card>

          <Card className="flex-1 border-border/60 bg-card/80">
            <CardContent className="space-y-3 p-5">
              <h2 className="text-sm font-semibold text-white">{t("hub_recent_activity_title")}</h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {enrichedCheckins.map((entry) => (
                  <li
                    key={entry.checkinId}
                    className="flex items-center justify-between rounded-xl border border-border/40 bg-background/40 px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-white">
                        {entry.profile?.displayName ?? entry.userId}
                      </span>
                      <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        {entry.status.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
              {enrichedCheckins.length === 0 && (
                <p className="rounded-xl border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground">
                  {t("hub_recent_activity_empty")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/80">
            <CardContent className="space-y-2 p-5">
              <h2 className="text-sm font-semibold text-white">{t("hub_active_hubs_title")}</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {hubs.map((hub) => (
                  <li key={hub.hubId} className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2">
                    <span>{hub.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {hub.activeUsers.length} {t("hub_active_hubs_count")}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
