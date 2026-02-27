import { describe, it, expect } from "vitest";
import { distributeToDays } from "./tripUtils";

describe("distributeToDays", () => {
  it("returns empty array for 0 items", () => {
    expect(distributeToDays(0, 3)).toEqual([]);
  });

  it("returns empty array for 0 days", () => {
    expect(distributeToDays(5, 0)).toEqual([]);
  });

  it("puts all items in day 1 when numDays === 1", () => {
    expect(distributeToDays(4, 1)).toEqual([1, 1, 1, 1]);
  });

  it("distributes 6 items across 3 days evenly", () => {
    expect(distributeToDays(6, 3)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it("distributes 7 items across 3 days (rounds up first days)", () => {
    // perDay = ceil(7/3) = 3 → [1,1,1, 2,2,2, 3]
    expect(distributeToDays(7, 3)).toEqual([1, 1, 1, 2, 2, 2, 3]);
  });

  it("distributes 5 items across 2 days", () => {
    // perDay = ceil(5/2) = 3 → [1,1,1, 2,2]
    expect(distributeToDays(5, 2)).toEqual([1, 1, 1, 2, 2]);
  });

  it("handles fewer items than days (2 items, 5 days)", () => {
    // perDay = ceil(2/5) = 1 → [1,2] — days 3-5 empty
    expect(distributeToDays(2, 5)).toEqual([1, 2]);
  });

  it("returns day 1 for a single item", () => {
    expect(distributeToDays(1, 3)).toEqual([1]);
  });

  it("returns 1-indexed day numbers (minimum value is 1)", () => {
    const result = distributeToDays(4, 2);
    expect(Math.min(...result)).toBe(1);
  });

  it("never exceeds numDays", () => {
    const numDays = 3;
    const result = distributeToDays(10, numDays);
    expect(Math.max(...result)).toBeLessThanOrEqual(numDays);
  });
});
