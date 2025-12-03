"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AvatarCard } from "@/components/AvatarCard";
import { useI18n } from "@/context/i18n";
import { getBackend } from "@/lib/backend";
import type { User } from "@/lib/types";

interface ProfilesClientProps {
  initialUsers: User[];
}

const DEFAULT_LIMIT = 48;

export const ProfilesClient = ({ initialUsers }: ProfilesClientProps) => {
  const { t } = useI18n();
  const router = useRouter();
  const [people, setPeople] = useState<User[]>(() => initialUsers.slice(0, DEFAULT_LIMIT));
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const popularSkills = useMemo(() => {
    const tally = new Map<string, number>();
    initialUsers.forEach((user) => {
      user.skills.slice(0, 6).forEach((skill) => {
        tally.set(skill, (tally.get(skill) ?? 0) + 1);
      });
    });
    return Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([skill]) => skill)
      .slice(0, 12);
  }, [initialUsers]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const backend = getBackend();
        const query = search.trim() || selectedSkill?.trim() || "";
        const results = await backend.users.list(query ? { query } : {});
        let filtered = results;
        if (selectedSkill) {
          const lower = selectedSkill.toLowerCase();
          filtered = filtered.filter((user) =>
            user.skills.some((skill) => skill.toLowerCase() === lower)
          );
        }
        if (search.trim().length >= 2) {
          const q = search.trim().toLowerCase();
          filtered = filtered.filter(
            (user) =>
              user.displayName.toLowerCase().includes(q) ||
              user.skills.some((skill) => skill.toLowerCase().includes(q)) ||
              user.bio?.toLowerCase().includes(q)
          );
        }
        if (!cancelled) {
          setPeople(filtered.slice(0, DEFAULT_LIMIT));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[profiles] failed to load directory", err);
          setError(t("profiles_error"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [search, selectedSkill, t]);

  const resultLabel = useMemo(() => {
    const count = people.length;
    return t("profiles_results").replace("{count}", String(count));
  }, [people.length, t]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-border/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          <Sparkles className="h-4 w-4 text-accent" />
          {t("nav_profiles")}
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-white">{t("profiles_title")}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t("profiles_subtitle")}</p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("profiles_filter_placeholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedSkill ? "outline" : "default"}
              className="cursor-pointer"
              onClick={() => setSelectedSkill(null)}
            >
              {t("generic_all")}
            </Badge>
            {popularSkills.map((skill) => (
              <Badge
                key={skill}
                variant={selectedSkill === skill ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedSkill((current) => (current === skill ? null : skill))}
              >
                #{skill}
              </Badge>
            ))}
          </div>
          {(search || selectedSkill) && (
            <Button variant="ghost" onClick={() => { setSearch(""); setSelectedSkill(null); }}>
              {t("profiles_clear_filters")}
            </Button>
          )}
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{resultLabel}</span>
          {loading && <span className="animate-pulse">{t("generic_loading")}</span>}
        </div>
        {error && (
          <Card className="border-destructive/60 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </Card>
        )}
        {!error && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {people.map((user) => (
              <AvatarCard key={user.userId} user={user} onSelect={(id) => router.push(`/profile/${id}`)} />
            ))}
            {!people.length && (
              <Card className="border-dashed border-border/60 bg-background/40 p-6 text-sm text-muted-foreground">
                {t("profiles_empty")}
              </Card>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

