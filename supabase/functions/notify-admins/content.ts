// Plain TypeScript (no Deno imports) so it can be unit-tested with vitest:
// src/lib/adminAlertContent.test.ts.

export type AdminAlertKind = "report" | "appeal" | "contact";

export const REPORT_REASON_LABELS: Record<string, string> = {
  fake_profile: "Fake or misleading profile",
  inappropriate_content: "Inappropriate photos or content",
  harassment: "Harassment or abusive behavior",
  spam: "Spam or scam",
  underage: "User appears to be underage",
  other: "Other",
};

const KIND_TITLES: Record<AdminAlertKind, string> = {
  report: "New profile report",
  appeal: "New ban appeal",
  contact: "New contact form message",
};

export const ADMIN_URL = "https://unityhearts.app/admin";

export function isAdminAlertKind(value: unknown): value is AdminAlertKind {
  return value === "report" || value === "appeal" || value === "contact";
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The one-line summary shown under the title. Reports show their reason, contact
 * messages their subject (members type it, so it is trimmed and escaped later);
 * appeals show nothing, since the reason is free text about the member.
 */
export function alertSummary(kind: AdminAlertKind, detail: unknown): string {
  const text = typeof detail === "string" ? detail.replace(/\s+/g, " ").trim() : "";
  if (kind === "report") return REPORT_REASON_LABELS[text] ?? (text ? "Other" : "");
  if (kind === "contact") return text.length > 100 ? `${text.slice(0, 99)}…` : text;
  return "";
}

export function buildAdminAlert(kind: AdminAlertKind, detail: unknown): { subject: string; html: string } {
  const title = KIND_TITLES[kind];
  const summary = alertSummary(kind, detail);
  const subject = summary ? `${title}: ${summary}` : title;
  const summaryHtml = summary
    ? `<p style="color: #4b5563; font-size: 16px; line-height: 1.6; text-align: center;"><strong>${escapeHtml(summary)}</strong></p>`
    : "";
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <h1 style="color: #1f2937; font-size: 22px; text-align: center; margin-bottom: 16px;">${escapeHtml(title)}</h1>
    ${summaryHtml}
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
      Something new is waiting for an admin on Uniting Hearts. Details are in the admin page.
      Alerts are grouped: if more arrive within 10 minutes, they won't each send an email.
    </p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="${ADMIN_URL}" style="display: inline-block; background: linear-gradient(135deg, #ec4899, #f43f5e); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open admin page</a>
    </div>
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
      You get this because you are an admin of Uniting Hearts.
    </p>
  </div>
</body>
</html>`;
  return { subject, html };
}
