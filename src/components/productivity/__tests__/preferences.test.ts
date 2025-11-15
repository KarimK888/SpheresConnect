import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  loadPreferences,
  parsePreferences,
  savePreferences
} from "../preferences";

class MemoryStorage implements Pick<Storage, "getItem" | "setItem"> {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe("productivity preferences helpers", () => {
  it("returns defaults when no payload present", () => {
    expect(parsePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("not-json")).toEqual(DEFAULT_PREFERENCES);
  });

  it("hydrates valid settings and ignores malformed collapsed entries", () => {
    const raw = JSON.stringify({
      dueFilter: "overdue",
      priorityFilter: "high",
      calendarCursor: "2025-01-01T00:00:00.000Z",
      collapsedColumns: { foo: true, bar: "yes", baz: 0 }
    });
    expect(parsePreferences(raw)).toEqual({
      dueFilter: "overdue",
      priorityFilter: "high",
      calendarCursor: "2025-01-01T00:00:00.000Z",
      collapsedColumns: { foo: true, bar: true, baz: false }
    });
  });

  it("can round-trip through storage", () => {
    const storage = new MemoryStorage();
    const snapshot = {
      dueFilter: "upcoming",
      priorityFilter: "medium",
      calendarCursor: "2025-05-01T00:00:00.000Z",
      collapsedColumns: { col_a: true }
    } as const;
    savePreferences(snapshot, storage);
    expect(storage.getItem(PREFERENCES_STORAGE_KEY)).toBe(JSON.stringify(snapshot));
    expect(loadPreferences(storage)).toEqual(snapshot);
  });
});
