"use client";

export type DueFilter = "all" | "upcoming" | "overdue" | "no-date";
export type PriorityFilter = "all" | "low" | "medium" | "high";

export interface ProductivityPreferences {
  dueFilter: DueFilter;
  priorityFilter: PriorityFilter;
  calendarCursor: string | null;
  collapsedColumns: Record<string, boolean>;
}

export const PREFERENCES_STORAGE_KEY = "productivity:prefs:v1";

export const DEFAULT_PREFERENCES: ProductivityPreferences = {
  dueFilter: "all",
  priorityFilter: "all",
  calendarCursor: null,
  collapsedColumns: {}
};

const deepMergeColumns = (value: unknown): Record<string, boolean> => {
  if (!value || typeof value !== "object") {
    return {};
  }
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, boolean>>((acc, [key, val]) => {
    acc[key] = Boolean(val);
    return acc;
  }, {});
};

export const parsePreferences = (raw: string | null | undefined): ProductivityPreferences => {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const data = JSON.parse(raw) as Partial<ProductivityPreferences>;
    const dueFilter: DueFilter = data.dueFilter ?? DEFAULT_PREFERENCES.dueFilter;
    const priorityFilter: PriorityFilter = data.priorityFilter ?? DEFAULT_PREFERENCES.priorityFilter;
    const calendarCursor = typeof data.calendarCursor === "string" ? data.calendarCursor : null;
    const collapsedColumns = deepMergeColumns(data.collapsedColumns);
    return {
      dueFilter,
      priorityFilter,
      calendarCursor,
      collapsedColumns
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

type ReadableStorage = Pick<Storage, "getItem"> | null | undefined;
type WritableStorage = Pick<Storage, "setItem"> | null | undefined;

const resolveStorage = (storage?: Storage | null): Storage | null => {
  if (storage) return storage;
  if (typeof window !== "undefined") {
    return window.localStorage;
  }
  return null;
};

export const loadPreferences = (storage?: ReadableStorage): ProductivityPreferences => {
  const source = resolveStorage(storage as Storage | null);
  if (!source) return DEFAULT_PREFERENCES;
  return parsePreferences(source.getItem(PREFERENCES_STORAGE_KEY));
};

export const savePreferences = (preferences: ProductivityPreferences, storage?: WritableStorage) => {
  const target = resolveStorage(storage as Storage | null);
  if (!target) return;
  target.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
};
