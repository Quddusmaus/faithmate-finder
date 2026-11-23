import { describe, expect, it } from "vitest";
import {
  ADMIN_URL,
  alertSummary,
  buildAdminAlert,
  isAdminAlertKind,
} from "../../supabase/functions/notify-admins/content";

describe("admin alert emails", () => {
  it("accepts only the three kinds the triggers send", () => {
    expect(["report", "appeal", "contact"].every(isAdminAlertKind)).toBe(true);
    expect(isAdminAlertKind("like")).toBe(false);
    expect(isAdminAlertKind(undefined)).toBe(false);
  });

  it("labels a report by its reason", () => {
    const { subject, html } = buildAdminAlert("report", "fake_profile");
    expect(subject).toBe("New profile report: Fake or misleading profile");
    expect(html).toContain(ADMIN_URL);
  });

  it("shows unknown report reasons as Other", () => {
    expect(alertSummary("report", "something_new")).toBe("Other");
  });

  it("never includes an appeal's text", () => {
    const { subject, html } = buildAdminAlert("appeal", "my private explanation");
    expect(subject).toBe("New ban appeal");
    expect(html).not.toContain("private explanation");
  });

  it("escapes and trims a contact subject", () => {
    const { subject, html } = buildAdminAlert("contact", "  <b>Help</b>\n please  ");
    expect(subject).toBe("New contact form message: <b>Help</b> please");
    expect(html).toContain("&lt;b&gt;Help&lt;/b&gt; please");
    expect(html).not.toContain("<b>Help</b>");
    expect(alertSummary("contact", "x".repeat(150))).toHaveLength(100);
  });
});
