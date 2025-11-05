"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileDrop } from "@/components/FileDrop";
import { getBackend } from "@/lib/backend";
import { useI18n } from "@/context/i18n";

export default function CreateProfilePage() {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    skills: "",
    portfolioUrl: ""
  });
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
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

  const saveProfile = async () => {
    const session = await backend.auth.getSession();
    if (!session) return;
    await backend.users.update(session.user.userId, {
      displayName: form.displayName,
      bio: form.bio,
      skills: form.skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      profilePictureUrl: uploadUrl ?? undefined
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-semibold text-white">{t("create_profile_title")}</h1>
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
            {form.skills || t("generic_pending")}
          </p>
          <p>
            <strong>{t("create_profile_summary_portfolio")}: </strong>
            {form.portfolioUrl || t("generic_pending")}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={prev} disabled={currentStep === 0}>
          {t("generic_back")}
        </Button>
        {currentStep < steps.length - 1 ? (
          <Button onClick={next}>{t("generic_next")}</Button>
        ) : (
          <Button onClick={() => void saveProfile()}>{t("generic_finish")}</Button>
        )}
      </div>
    </div>
  );
}
