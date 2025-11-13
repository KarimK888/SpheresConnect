"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileDrop } from "@/components/FileDrop";
import { getBackend } from "@/lib/backend";
import { useI18n } from "@/context/i18n";
import { GateMessage } from "@/components/gates/GateMessage";
import { useSessionState } from "@/context/session";
import type { User } from "@/lib/types";

type InviteError = "missing" | "invalid" | "expired" | "network" | null;

const CreateProfileContent = () => {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const sessionUser = useSessionState((state) => state.user);
  const sessionLoading = useSessionState((state) => state.loading);
  const setSessionUser = useSessionState((state) => state.setUser);

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    skills: "",
    portfolioUrl: ""
  });
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<InviteError>(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const backend = getBackend();

  const steps = useMemo(
    () => [
      t("create_profile_step_basics"),
      t("create_profile_step_skills"),
      t("create_profile_step_portfolio"),
      t("create_profile_step_review")
    ],
    [t]
  );

  const next = () => setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  const prev = () => setCurrentStep((step) => Math.max(step - 1, 0));

  useEffect(() => {
    let cancelled = false;
    if (!inviteToken) {
      setInviteEmail(null);
      setInviteError("missing");
      setInviteLoading(false);
      return;
    }
    setInviteLoading(true);
    setInviteError(null);
    const verify = async () => {
      try {
        const response = await fetch(`/api/profile-invite?token=${encodeURIComponent(inviteToken)}`);
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.valid) {
          if (!cancelled) {
            setInviteEmail(null);
            setInviteError(response.status === 410 ? "expired" : "invalid");
          }
          return;
        }
        if (!cancelled) {
          setInviteEmail(payload.email ?? null);
          setInviteError(null);
        }
      } catch (error) {
        console.warn("[create-profile] invite verification failed", error);
        if (!cancelled) {
          setInviteEmail(null);
          setInviteError("network");
        }
      } finally {
        if (!cancelled) {
          setInviteLoading(false);
        }
      }
    };
    void verify();
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  const normalizedSkills = useMemo(
    () =>
      form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
    [form.skills]
  );

  const saveProfile = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const session = await backend.auth.getSession();
      if (!session || !inviteEmail) {
        throw new Error("unauthenticated");
      }
      if (session.user.email.toLowerCase() !== inviteEmail.toLowerCase()) {
        throw new Error("mismatch");
      }

      const prevProfile: User["profile"] | undefined = session.user.profile ?? undefined;
      const mediaEntry = uploadUrl
        ? {
            mediaId: `onboard_media_${Date.now().toString(36)}`,
            type: "image" as const,
            title: form.displayName || "Portfolio asset",
            url: uploadUrl,
            description: form.bio || undefined,
            tags: ["onboarding"]
          }
        : null;
      const projectEntry = form.portfolioUrl
        ? {
            projectId: `onboard_project_${Date.now().toString(36)}`,
            title: form.displayName ? `${form.displayName} Portfolio` : "Portfolio highlight",
            summary: form.bio || "Portfolio submitted via onboarding",
            link: form.portfolioUrl,
            status: "live" as const,
            tags: ["onboarding"]
          }
        : null;

      const nextProfile: User["profile"] = {
        ...(prevProfile ?? {}),
        resumeUrl: form.portfolioUrl || prevProfile?.resumeUrl,
        media: mediaEntry ? [...(prevProfile?.media ?? []), mediaEntry] : prevProfile?.media,
        projects: projectEntry ? [...(prevProfile?.projects ?? []), projectEntry] : prevProfile?.projects
      };

      const updated = await backend.users.update(session.user.userId, {
        displayName: form.displayName,
        bio: form.bio,
        skills: normalizedSkills,
        profilePictureUrl: uploadUrl ?? undefined,
        profile: nextProfile
      });
      setSessionUser(updated);
      router.push("/profile");
    } catch (error) {
      console.error("[create-profile] failed to save profile", error);
      setSaveError(t("create_profile_save_error"));
    } finally {
      setSaving(false);
    }
  };

  if (inviteLoading || sessionLoading) {
    return <CreateProfileSkeleton />;
  }

  if (inviteError) {
    const copyMap: Record<Exclude<InviteError, null>, string> = {
      missing: t("create_profile_invite_required"),
      invalid: t("create_profile_invite_invalid"),
      expired: t("create_profile_invite_expired"),
      network: t("generic_error_loading")
    };
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <GateMessage
          title={t("create_profile_title")}
          body={copyMap[inviteError]}
          actionLabel={t("cta_join")}
          onAction={() => router.push("/signup")}
        />
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <GateMessage
          title={t("create_profile_title")}
          body={t("create_profile_login_required")}
          actionLabel={t("auth_signup_login_link")}
          onAction={() => router.push("/login")}
        />
      </div>
    );
  }

  if (inviteEmail && sessionUser.email.toLowerCase() !== inviteEmail.toLowerCase()) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <GateMessage
          title={t("create_profile_title")}
          body={t("create_profile_email_mismatch", { email: inviteEmail })}
          actionLabel={t("nav_sign_out")}
          onAction={() => router.push("/login")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-semibold text-white">{t("create_profile_title")}</h1>
      {inviteEmail && (
        <div className="rounded-2xl border border-border/60 bg-border/20 p-3 text-xs text-muted-foreground">
          {t("create_profile_invite_verified", { email: inviteEmail })}
        </div>
      )}
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {steps.map((step, index) => (
          <span key={step} className={index === currentStep ? "text-primary" : undefined}>
            {index + 1}. {step}
          </span>
        ))}
      </div>

      {currentStep === 0 && (
        <div className="space-y-4">
          <Input
            placeholder={t("create_profile_display_placeholder")}
            value={form.displayName}
            onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
          />
          <Textarea
            placeholder={t("create_profile_bio_placeholder")}
            value={form.bio}
            onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
          />
        </div>
      )}

      {currentStep === 1 && (
        <div className="space-y-4">
          <Textarea
            placeholder={t("create_profile_skills_placeholder")}
            value={form.skills}
            onChange={(event) => setForm((prev) => ({ ...prev, skills: event.target.value }))}
          />
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-4">
          <FileDrop onUploaded={(url) => setUploadUrl(url)} />
          <Input
            placeholder={t("create_profile_portfolio_placeholder")}
            value={form.portfolioUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, portfolioUrl: event.target.value }))}
          />
          {uploadUrl && (
            <p className="text-xs text-muted-foreground">
              {t("create_profile_uploaded_asset")}: {uploadUrl}
            </p>
          )}
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>{t("create_profile_summary_name")}: </strong>
            {form.displayName || t("generic_pending")}
          </p>
          <p>
            <strong>{t("create_profile_summary_bio")}: </strong>
            {form.bio || t("generic_pending")}
          </p>
          <p>
            <strong>{t("create_profile_summary_skills")}: </strong>
            {normalizedSkills.length ? normalizedSkills.join(", ") : t("generic_pending")}
          </p>
          <p>
            <strong>{t("create_profile_summary_portfolio")}: </strong>
            {form.portfolioUrl || t("generic_pending")}
          </p>
        </div>
      )}

      {saveError && <p className="text-sm text-destructive">{saveError}</p>}

      <div className="flex gap-3">
        <Button variant="outline" onClick={prev} disabled={currentStep === 0}>
          {t("generic_back")}
        </Button>
        {currentStep < steps.length - 1 ? (
          <Button onClick={next}>{t("generic_next")}</Button>
        ) : (
          <Button onClick={() => void saveProfile()} disabled={saving}>
            {saving ? t("generic_loading") : t("generic_finish")}
          </Button>
        )}
      </div>
    </div>
  );
}

const CreateProfileSkeleton = () => (
  <div className="mx-auto w-full max-w-3xl space-y-4 px-6 py-10">
    <div className="h-9 w-60 animate-pulse rounded-full bg-border/30" />
    <div className="h-4 w-48 animate-pulse rounded-full bg-border/20" />
    <div className="h-32 animate-pulse rounded-3xl bg-border/20" />
    <div className="space-y-3">
      <div className="h-12 animate-pulse rounded-3xl bg-border/20" />
      <div className="h-12 animate-pulse rounded-3xl bg-border/20" />
      <div className="h-12 animate-pulse rounded-3xl bg-border/20" />
    </div>
  </div>
);

export default function CreateProfilePage() {
  return (
    <Suspense fallback={<CreateProfileSkeleton />}>
      <CreateProfileContent />
    </Suspense>
  );
}
