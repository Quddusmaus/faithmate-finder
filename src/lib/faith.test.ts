import { describe, it, expect } from "vitest";
import { faithLabel, isFaith, isMissingFaithColumn, matchesFaithFilter } from "./faith";

describe("faith", () => {
  it("labels the two values and nothing else", () => {
    expect(faithLabel("bahai")).toBe("Bahá'í");
    expect(faithLabel("non_bahai")).toBe("Non-Bahá'í visitor");
    expect(faithLabel(null)).toBeNull();
    expect(faithLabel("other")).toBeNull();
    expect(isFaith(undefined)).toBe(false);
  });

  it("'all' shows everyone, including members who haven't chosen yet", () => {
    for (const f of ["bahai", "non_bahai", null, undefined]) {
      expect(matchesFaithFilter(f, "all")).toBe(true);
    }
  });

  it("a specific filter shows only that choice", () => {
    expect(matchesFaithFilter("bahai", "bahai")).toBe(true);
    expect(matchesFaithFilter("non_bahai", "bahai")).toBe(false);
    expect(matchesFaithFilter(null, "bahai")).toBe(false);
    expect(matchesFaithFilter("non_bahai", "non_bahai")).toBe(true);
    expect(matchesFaithFilter(null, "non_bahai")).toBe(false);
  });
});

describe("isMissingFaithColumn", () => {
  it("spots PostgREST's missing-column error for faith only", () => {
    expect(isMissingFaithColumn({ code: "PGRST204", message: "Could not find the 'faith' column of 'profiles' in the schema cache" })).toBe(true);
    expect(isMissingFaithColumn({ code: "42703", message: 'column "faith" does not exist' })).toBe(true);
    expect(isMissingFaithColumn({ code: "PGRST204", message: "Could not find the 'bio' column" })).toBe(false);
    expect(isMissingFaithColumn({ code: "23514", message: "profiles_faith_check" })).toBe(false);
    expect(isMissingFaithColumn(null)).toBe(false);
  });
});
