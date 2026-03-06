import { describe, it, expect } from "vitest";
import { renderBoldText } from "./renderBoldText";

describe("renderBoldText", () => {
  it("returns plain text when no bold markers", () => {
    expect(renderBoldText("hello world")).toBe("hello world");
  });

  it("wraps text between ** in strong tags", () => {
    const result = renderBoldText("hello **world** end");
    expect(Array.isArray(result)).toBe(true);
    const arr = result as Array<unknown>;
    expect(arr).toHaveLength(3);
    expect(arr[0]).toBe("hello ");
    // Verify the strong element
    const strong = arr[1] as { type: string; props: { children: string } };
    expect(strong.type).toBe("strong");
    expect(strong.props.children).toBe("world");
    expect(arr[2]).toBe(" end");
  });

  it("handles multiple bold sections", () => {
    const result = renderBoldText("**a** and **b**");
    expect(Array.isArray(result)).toBe(true);
    const arr = result as Array<unknown>;
    expect(arr).toHaveLength(5);
  });

  it("handles empty bold markers", () => {
    const result = renderBoldText("hello **** end");
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns plain text for unmatched ** (odd delimiters)", () => {
    // Single unmatched ** — should return raw text, not bold everything after it
    expect(renderBoldText("hello **world")).toBe("hello **world");
  });
});
