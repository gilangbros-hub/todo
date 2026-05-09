import { describe, it, expect } from "vitest";
import { detectOverdueTasks } from "@/lib/overdue";
import { Task } from "@/lib/types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Test Task",
    description: null,
    type_id: null,
    pic_id: null,
    deadline: null,
    status: "todo",
    priority: "normal",
    parent_task_id: null,
    branch_type: null,
    branch_order: null,
    xp_reward: 10,
    created_at: "2024-01-01T00:00:00Z",
    completed_at: null,
    ...overrides,
  };
}

describe("detectOverdueTasks", () => {
  const now = "2024-03-15T12:00:00Z";

  describe("detects overdue tasks", () => {
    it("returns task ID when deadline is in the past and status is todo", () => {
      const tasks = [
        makeTask({ id: "t1", deadline: "2024-03-14T00:00:00Z", status: "todo" }),
      ];
      expect(detectOverdueTasks(tasks, now)).toEqual(["t1"]);
    });

    it("returns task ID when deadline is in the past and status is in_progress", () => {
      const tasks = [
        makeTask({ id: "t1", deadline: "2024-03-10T00:00:00Z", status: "in_progress" }),
      ];
      expect(detectOverdueTasks(tasks, now)).toEqual(["t1"]);
    });

    it("returns multiple task IDs when multiple tasks are overdue", () => {
      const tasks = [
        makeTask({ id: "t1", deadline: "2024-03-14T00:00:00Z", status: "todo" }),
        makeTask({ id: "t2", deadline: "2024-03-01T00:00:00Z", status: "in_progress" }),
      ];
      expect(detectOverdueTasks(tasks, now)).toEqual(["t1", "t2"]);
    });
  });

  describe("never marks tasks with no deadline", () => {
    it("excludes tasks with null deadline", () => {
      const tasks = [
        makeTask({ id: "t1", deadline: null, status: "todo" }),
      ];
      expect(detectOverdueTasks(tasks, now)).toEqual([]);
    });
  });

  describe("never modifies tasks already done", () => {
    it("excludes tasks with status done even if deadline is past", () => {
      const tasks = [
        makeTask({ id: "t1", deadline: "2024-03-01T00:00:00Z", status: "done" }),
      ];
      expect(detectOverdueTasks(tasks, now)).toEqual([]);
    });
  });

  describe("never marks tasks already overdue", () => {
    it("excludes tasks with status overdue", () => {
      const tasks = [
        makeTask({ id: "t1", deadline: "2024-03-01T00:00:00Z", status: "overdue" }),
      ];
      expect(detectOverdueTasks(tasks, now)).toEqual([]);
    });
  });

  describe("leaves future deadlines unchanged", () => {
    it("excludes tasks with deadline in the future", () => {
      const tasks = [
        makeTask({ id: "t1", deadline: "2024-03-20T00:00:00Z", status: "todo" }),
      ];
      expect(detectOverdueTasks(tasks, now)).toEqual([]);
    });
  });

  describe("accepts Date object as now parameter", () => {
    it("works with Date object for now", () => {
      const tasks = [
        makeTask({ id: "t1", deadline: "2024-03-14T00:00:00Z", status: "todo" }),
      ];
      expect(detectOverdueTasks(tasks, new Date("2024-03-15T12:00:00Z"))).toEqual(["t1"]);
    });
  });

  describe("mixed scenarios", () => {
    it("correctly filters a mix of overdue, done, future, and no-deadline tasks", () => {
      const tasks = [
        makeTask({ id: "overdue-todo", deadline: "2024-03-10T00:00:00Z", status: "todo" }),
        makeTask({ id: "overdue-ip", deadline: "2024-03-12T00:00:00Z", status: "in_progress" }),
        makeTask({ id: "done-past", deadline: "2024-03-01T00:00:00Z", status: "done" }),
        makeTask({ id: "already-overdue", deadline: "2024-03-05T00:00:00Z", status: "overdue" }),
        makeTask({ id: "future", deadline: "2024-04-01T00:00:00Z", status: "todo" }),
        makeTask({ id: "no-deadline", deadline: null, status: "todo" }),
      ];
      expect(detectOverdueTasks(tasks, now)).toEqual(["overdue-todo", "overdue-ip"]);
    });
  });

  describe("edge cases", () => {
    it("returns empty array for empty task list", () => {
      expect(detectOverdueTasks([], now)).toEqual([]);
    });

    it("does not mark task when deadline equals now exactly", () => {
      // deadline < now is the condition, so equal should NOT be overdue
      const tasks = [
        makeTask({ id: "t1", deadline: "2024-03-15T12:00:00Z", status: "todo" }),
      ];
      expect(detectOverdueTasks(tasks, "2024-03-15T12:00:00Z")).toEqual([]);
    });
  });
});
