import { describe, it, expect } from "vitest";
import { safeHttpUrl } from "./urlUtils";

describe("safeHttpUrl", () => {
  it("returns null for null/undefined/empty", () => {
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
  });

  it("returns href for valid https URL", () => {
    expect(safeHttpUrl("https://example.com")).toBe("https://example.com/");
  });

  it("returns href for valid http URL", () => {
    expect(safeHttpUrl("http://example.com")).toBe("http://example.com/");
  });

  it("returns null for ftp protocol", () => {
    expect(safeHttpUrl("ftp://example.com")).toBeNull();
  });

  it("returns null for javascript protocol", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
  });

  it("returns null for malformed URL", () => {
    expect(safeHttpUrl("not a url")).toBeNull();
  });

  it("normalizes valid URLs", () => {
    expect(safeHttpUrl("https://Example.COM/path")).toBe(
      "https://example.com/path"
    );
  });
});
