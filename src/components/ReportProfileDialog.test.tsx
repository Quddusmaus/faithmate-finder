import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@/i18n";

const inserted: unknown[] = [];
const profileLookups: string[] = [];
let lookupResult: { data: { id: string } | null; error: unknown } = { data: { id: "profile-b" }, error: null };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: (_col: string, value: string) => ({
              maybeSingle: async () => {
                profileLookups.push(value);
                return lookupResult;
              },
            }),
          }),
        };
      }
      if (table === "profile_reports") {
        return {
          insert: async (row: unknown) => {
            inserted.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  },
}));

import { ReportProfileDialog } from "./ReportProfileDialog";
import { Toaster } from "@/components/ui/toaster";

async function submitHarassmentReport(details: string) {
  fireEvent.click(screen.getByTitle("Report Profile"));
  fireEvent.click(await screen.findByLabelText("Harassment or abusive behavior"));
  fireEvent.change(screen.getByPlaceholderText("Additional details (optional)"), { target: { value: details } });
  fireEvent.click(screen.getByRole("button", { name: "Submit Report" }));
}

describe("ReportProfileDialog", () => {
  beforeEach(() => {
    inserted.length = 0;
    profileLookups.length = 0;
    lookupResult = { data: { id: "profile-b" }, error: null };
  });

  it("reports a profile card by its profile id without a lookup", async () => {
    render(<ReportProfileDialog profileId="profile-a" profileName="Ana" currentUserId="me" />);
    await submitHarassmentReport("rude");
    await waitFor(() => expect(inserted).toHaveLength(1));
    expect(profileLookups).toEqual([]);
    expect(inserted[0]).toEqual({ reporter_id: "me", reported_profile_id: "profile-a", reason: "harassment", details: "rude" });
  });

  it("reports from a chat by the member's user id, looking up their profile id", async () => {
    render(<ReportProfileDialog reportedUserId="user-b" profileName="Ben" currentUserId="me" />);
    await submitHarassmentReport("  sent abusive messages  ");
    await waitFor(() => expect(inserted).toHaveLength(1));
    expect(profileLookups).toEqual(["user-b"]);
    expect(inserted[0]).toEqual({
      reporter_id: "me",
      reported_profile_id: "profile-b",
      reason: "harassment",
      details: "sent abusive messages",
    });
  });

  it("shows an error and inserts nothing when the member's profile can't be found", async () => {
    lookupResult = { data: null, error: null };
    render(
      <>
        <ReportProfileDialog reportedUserId="user-gone" profileName="Gone" currentUserId="me" />
        <Toaster />
      </>,
    );
    await submitHarassmentReport("x");
    await waitFor(() => expect(profileLookups).toEqual(["user-gone"]));
    expect(inserted).toEqual([]);
    // The dialog stays open so the member can try again or cancel.
    expect(screen.getByRole("button", { name: "Submit Report" })).toBeInTheDocument();
  });

  it("renders nothing when signed out", () => {
    const { container } = render(<ReportProfileDialog profileId="p" profileName="X" currentUserId={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
