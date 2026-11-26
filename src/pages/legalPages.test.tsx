import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsOfService";
import { LegalLinks } from "@/components/LegalLinks";
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/legal";
import "@/i18n";

const renderAt = (path: string, initialEntries: string[] = [path]) =>
  render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
      <Routes>
        <Route path="/" element={<h1>Home page</h1>} />
        <Route path="/profile-setup" element={<div><h1>Settings page</h1><LegalLinks /></div>} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
    </MemoryRouter>,
  );

describe.each([
  ["/privacy", "Privacy Policy"],
  ["/terms", "Terms of Service"],
])("%s", (path, title) => {
  it("shows a fixed last-updated date, not today's date", () => {
    renderAt(path);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(`Last updated: ${LEGAL_LAST_UPDATED}`)).toBeInTheDocument();
  });

  it("points to the real contact address only", () => {
    const { container } = renderAt(path);
    const mailtos = [...container.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute("href"));
    expect(mailtos.length).toBeGreaterThan(0);
    for (const href of mailtos) expect(href).toBe(`mailto:${CONTACT_EMAIL}`);
    expect(container.textContent).not.toMatch(/unityhearts\.com/);
  });

  it("goes home from Back when opened directly", () => {
    renderAt(path);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Home page" })).toBeInTheDocument();
  });
});

describe("Settings legal links", () => {
  it("open the policy pages, and Back returns to Settings", () => {
    renderAt("/profile-setup");
    fireEvent.click(screen.getByRole("link", { name: /privacy policy/i }));
    expect(screen.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Settings page" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: /terms of service/i }));
    expect(screen.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeInTheDocument();
  });

  it("include safety tips and contact", () => {
    renderAt("/profile-setup");
    expect(screen.getByRole("link", { name: /safety tips/i })).toHaveAttribute("href", "/safety");
    expect(screen.getByRole("link", { name: /contact/i })).toHaveAttribute("href", "/contact");
  });
});

describe("Privacy Policy content", () => {
  it("names the data deletion path and the service providers", () => {
    const { container } = renderAt("/privacy");
    const text = container.textContent ?? "";
    expect(text).toContain("Delete Account");
    for (const provider of ["Supabase", "Daily.co", "Resend", "Cloudflare Turnstile", "Firebase Cloud Messaging"]) {
      expect(text).toContain(provider);
    }
  });
});
