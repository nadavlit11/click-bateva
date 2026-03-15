import { describe, it, expect } from "vitest";
import { getStrength, isPasswordValid } from "./passwordStrength";

describe("getStrength", () => {
  it("returns weak for short passwords", () => {
    expect(getStrength("")).toBe("weak");
    expect(getStrength("Ab1")).toBe("weak");
    expect(getStrength("1234567")).toBe("weak");
  });

  it("returns medium when missing letter", () => {
    expect(getStrength("12345678")).toBe("medium");
  });

  it("returns medium when missing number", () => {
    expect(getStrength("abcdefgh")).toBe("medium");
  });

  it("returns strong when 8+ chars with letter and number", () => {
    expect(getStrength("abcd1234")).toBe("strong");
    expect(getStrength("Password1")).toBe("strong");
  });
});

describe("isPasswordValid", () => {
  it("returns false for short passwords", () => {
    expect(isPasswordValid("Ab1")).toBe(false);
  });

  it("returns false when missing number", () => {
    expect(isPasswordValid("abcdefgh")).toBe(false);
  });

  it("returns false when missing letter", () => {
    expect(isPasswordValid("12345678")).toBe(false);
  });

  it("returns true for valid passwords", () => {
    expect(isPasswordValid("abcd1234")).toBe(true);
  });

  it("returns true at exact boundary (8 chars with letter and number)", () => {
    expect(isPasswordValid("abcdefg1")).toBe(true);
  });
});
