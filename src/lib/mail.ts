type SendInviteParams = {
  email: string;
  name?: string;
  inviteLink: string;
};

const getSender = () => process.env.PROFILE_INVITE_FROM ?? "SpheraConnect <no-reply@spheraconnect.dev>";

export const sendProfileInviteEmail = async ({ email, name, inviteLink }: SendInviteParams) => {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = getSender();

  const subject = "Complete your SpheraConnect profile";
  const previewName = name ? `, ${name}` : "";
  const html = `
    <p>Hey${previewName || ""},</p>
    <p>Thanks for joining SpheraConnect. Click the button below to finish setting up your creator profile.</p>
    <p><a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;border-radius:999px;text-decoration:none;">Create your profile</a></p>
    <p>If the button doesn’t work, copy and paste this URL into your browser:<br/>${inviteLink}</p>
    <p>See you inside,<br/>The SpheraConnect Team</p>
  `;

  if (!apiKey) {
    console.info(`[email] Profile invite for ${email}: ${inviteLink}`);
    return { delivered: false, via: "console" as const };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: sender,
      to: [email],
      subject,
      html
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.message ?? payload?.error ?? "Unknown error";
    console.warn("[email] failed to send profile invite", message);
    return { delivered: false, via: "resend", message };
  }

  return { delivered: true, via: "resend" as const };
};
