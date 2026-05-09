import { describe, it, expect } from "vitest";
import { updateStreak } from "@/lib/streak";

describe("updateStreak", () => {
  describe("same-day idempotence", () => {
    it("returns same streak when completionDate equals lastCompletedDate", () => {
      const result = updateStreak(5, "2024-03-15", "2024-03-15");
      expect(result).toEqual({
        newStreak: 5,
        newLastCompletedDate: "2024-03-15",
      });
    });

    it("returns streak of 1 unchanged on same day", () => {
      const result = updateStreak(1, "2024-01-01", "2024-01-01");
      expect(result).toEqual({
        newStreak: 1,
        newLastCompletedDate: "2024-01-01",
      });
    });
  });

  describe("consecutive day increment", () => {
    it("increments streak when lastCompletedDate is the preceding day", () => {
      const result = updateStreak(3, "2024-03-14", "2024-03-15");
      expect(result).toEqual({
        newStreak: 4,
        newLastCompletedDate: "2024-03-15",
      });
    });

    it("increments streak across month boundary", () => {
      const result = updateStreak(10, "2024-01-31", "2024-02-01");
      expect(result).toEqual({
        newStreak: 11,
        newLastCompletedDate: "2024-02-01",
      });
    });

    it("increments streak across year boundary", () => {
      const result = updateStreak(7, "2023-12-31", "2024-01-01");
      expect(result).toEqual({
        newStreak: 8,
        newLastCompletedDate: "2024-01-01",
      });
    });

    it("increments streak from 0 to 1 on consecutive day", () => {
      const result = updateStreak(0, "2024-06-10", "2024-06-11");
      expect(result).toEqual({
        newStreak: 1,
        newLastCompletedDate: "2024-06-11",
      });
    });
  });

  describe("streak reset", () => {
    it("resets streak to 1 when lastCompletedDate is null", () => {
      const result = updateStreak(0, null, "2024-03-15");
      expect(result).toEqual({
        newStreak: 1,
        newLastCompletedDate: "2024-03-15",
      });
    });

    it("resets streak to 1 when gap is more than one day", () => {
      const result = updateStreak(5, "2024-03-10", "2024-03-15");
      expect(result).toEqual({
        newStreak: 1,
        newLastCompletedDate: "2024-03-15",
      });
    });

    it("resets streak to 1 when gap is exactly two days", () => {
      const result = updateStreak(3, "2024-03-13", "2024-03-15");
      expect(result).toEqual({
        newStreak: 1,
        newLastCompletedDate: "2024-03-15",
      });
    });

    it("resets streak when completionDate is before lastCompletedDate", () => {
      const result = updateStreak(5, "2024-03-15", "2024-03-10");
      expect(result).toEqual({
        newStreak: 1,
        newLastCompletedDate: "2024-03-10",
      });
    });
  });
});
