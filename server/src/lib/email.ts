import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Rotisserie <onboarding@resend.dev>";
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

let warnedOnce = false;

// Notification emails are best-effort: a missing API key or a delivery failure should
// never break the underlying friend-request/family-invite action, so this only logs.
async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    if (!warnedOnce) {
      console.warn("RESEND_API_KEY is not set — notification emails will be skipped.");
      warnedOnce = true;
    }
    return;
  }
  try {
    await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
  } catch (err) {
    console.error("Failed to send notification email:", err);
  }
}

function escapeHtml(value: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (c) => map[c]);
}

function layout(title: string, bodyHtml: string, ctaHref: string, ctaLabel: string): string {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #c2410c; margin-bottom: 8px;">${title}</h2>
      <p style="color: #374151; font-size: 14px; line-height: 1.5;">${bodyHtml}</p>
      <a href="${ctaHref}" style="display: inline-block; margin-top: 16px; background: #c2410c; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">${ctaLabel}</a>
    </div>
  `;
}

export async function sendFriendRequestEmail(to: string, fromName: string) {
  const name = escapeHtml(fromName);
  const html = layout(
    "New friend request",
    `<strong>${name}</strong> wants to be your friend on Rotisserie. Sign in to accept or decline.`,
    `${APP_URL}/friends`,
    "View request"
  );
  await sendEmail(to, `${fromName} sent you a friend request`, html);
}

export async function sendFamilyInviteEmail(
  to: string,
  opts: { familyName: string; invitedByName: string; hasAccount: boolean }
) {
  const invitedBy = escapeHtml(opts.invitedByName);
  const familyName = escapeHtml(opts.familyName);
  const href = opts.hasAccount ? `${APP_URL}/family` : `${APP_URL}/?signup=${encodeURIComponent(to)}`;
  const html = layout(
    "Household invite",
    `<strong>${invitedBy}</strong> invited you to join <strong>${familyName}</strong> on Rotisserie, sharing recipes, meal plans, and the shopping list.`,
    href,
    opts.hasAccount ? "View invite" : "Sign up to join"
  );
  await sendEmail(to, `You're invited to join ${opts.familyName}`, html);
}
