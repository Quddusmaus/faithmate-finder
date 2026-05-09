import { describe, it, expect } from "vitest";
import { calculateCompatibility } from "./useCurrentUserProfile";

describe("calculateCompatibility", () => {
  it("returns 0 when either side has no interests", () => {
    expect(calculateCompatibility([], ["a"])).toEqual({ score: 0, shared: [], total: 0 });
    expect(calculateCompatibility(["a"], [])).toEqual({ score: 0, shared: [], total: 0 });
  });

  it("returns 100 when interests match exactly", () => {
    const result = calculateCompatibility(["prayer", "music"], ["prayer", "music"]);
    expect(result.score).toBe(100);
    expect(result.shared.sort()).toEqual(["music", "prayer"]);
    expect(result.total).toBe(2);
  });

  it("computes Jaccard-style overlap correctly", () => {
    // shared = 1 (music), union = 3 (prayer, music, art) -> 33%
    const result = calculateCompatibility(["prayer", "music"], ["music", "art"]);
    expect(result.score).toBe(33);
    expect(result.shared).toEqual(["music"]);
    expect(result.total).toBe(1);
  });

  it("returns 0 when there is no overlap", () => {
    const result = calculateCompatibility(["a", "b"], ["c", "d"]);
    expect(result.score).toBe(0);
    expect(result.shared).toEqual([]);
  });
});
