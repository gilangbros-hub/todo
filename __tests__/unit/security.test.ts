import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  safeHexColor,
  validateHexColor,
  capString,
  sanitizeIdentifier,
  isUuid,
} from "@/lib/security";

describe("safeHexColor", () => {
  it("accepts valid 6-digit hex colors", () => {
    expect(safeHexColor("#4a9eff")).toBe("#4a9eff");
    expect(safeHexColor("#AABBCC")).toBe("#AABBCC");
  });

  it("accepts valid 3-digit hex colors", () => {
    expect(safeHexColor("#abc")).toBe("#abc");
    expect(safeHexColor("#FFF")).toBe("#FFF");
  });

  it("rejects CSS injection attempts", () => {
    expect(safeHexColor("red; background: url(x)")).toBe("#6b7280");
    expect(safeHexColor("expression(alert(1))")).toBe("#6b7280");
    expect(safeHexColor("rgb(0,0,0)")).toBe("#6b7280");
    expect(safeHexColor("url('x')")).toBe("#6b7280");
    expect(safeHexColor("#abc;}</style><script>alert(1)</script>")).toBe("#6b7280");
  });

  it("rejects malformed hex values", () => {
    expect(safeHexColor("")).toBe("#6b7280");
    expect(safeHexColor("#")).toBe("#6b7280");
    expect(safeHexColor("#zzz")).toBe("#6b7280");
    expect(safeHexColor("#12345")).toBe("#6b7280");
    expect(safeHexColor("4a9eff")).toBe("#6b7280"); // missing #
  });

  it("handles non-string inputs gracefully", () => {
    expect(safeHexColor(null)).toBe("#6b7280");
    expect(safeHexColor(undefined)).toBe("#6b7280");
  });

  it("respects a custom fallback", () => {
    expect(safeHexColor("bad", "#ff0000")).toBe("#ff0000");
  });

  it("property: never returns a string containing injection sentinels", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = safeHexColor(input);
        // Result is always either the fallback or a clean hex value.
        expect(result).toMatch(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
      }),
      { numRuns: 200 }
    );
  });
});

describe("validateHexColor", () => {
  it("accepts valid hex colors", () => {
    expect(validateHexColor("#4a9eff")).toEqual({ valid: true });
    expect(validateHexColor("#abc")).toEqual({ valid: true });
  });

  it("rejects empty or invalid colors with a message", () => {
    expect(validateHexColor("").valid).toBe(false);
    expect(validateHexColor("red").valid).toBe(false);
    expect(validateHexColor("#xyz").valid).toBe(false);
  });
});

describe("capString", () => {
  it("trims whitespace and caps length", () => {
    expect(capString("  hello  ", 10)).toBe("hello");
    expect(capString("abcdefghij", 5)).toBe("abcde");
  });

  it("handles non-string inputs", () => {
    expect(capString(null, 5)).toBe("");
    expect(capString(undefined, 5)).toBe("");
  });
});

describe("sanitizeIdentifier", () => {
  it("strips HTML-unsafe and control characters", () => {
    expect(sanitizeIdentifier("<script>alert(1)</script>")).toBe("scriptalert(1)/script");
    expect(sanitizeIdentifier('name"with`quotes')).toBe("namewithquotes");
    expect(sanitizeIdentifier("line1\nline2")).toBe("line1line2");
    expect(sanitizeIdentifier("tab\there")).toBe("tabhere");
  });

  it("preserves safe unicode and emoji", () => {
    expect(sanitizeIdentifier("⚔️")).toBe("⚔️");
    expect(sanitizeIdentifier("Warrior-2")).toBe("Warrior-2");
  });

  it("caps length", () => {
    expect(sanitizeIdentifier("a".repeat(200), 50).length).toBeLessThanOrEqual(50);
  });

  it("property: never emits angle brackets, quotes, or control chars", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = sanitizeIdentifier(input);
        expect(result).not.toMatch(/[<>"'`]/);
        // eslint-disable-next-line no-control-regex
        expect(result).not.toMatch(/[\x00-\x1F\x7F]/);
      }),
      { numRuns: 200 }
    );
  });
});

describe("isUuid", () => {
  it("accepts valid UUIDs", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isUuid("AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")).toBe(true);
  });

  it("rejects malformed IDs and injection attempts", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("'; DROP TABLE tasks; --")).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(123)).toBe(false);
  });
});
