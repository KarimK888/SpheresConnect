import { getDatabase, getMemoryState } from "./db";
import type { MutationJobRecord } from "./types";

const clone = <T>(value: T): T =>
  typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

export const enqueueMutation = async (
  payload: Omit<MutationJobRecord, "id" | "attempts" | "createdAt"> & { id?: string }
) => {
  const record: MutationJobRecord = {
    id: payload.id ?? generateId(),
    endpoint: payload.endpoint,
    method: payload.method,
    body: payload.body,
    headers: payload.headers,
    attempts: 0,
    createdAt: Date.now()
  };
  const db = await getDatabase();
  if (!db) {
    getMemoryState().mutations.push(clone(record));
    return record;
  }
  const tx = db.transaction("mutations", "readwrite");
  await tx.store.put(record);
  await tx.done;
  return record;
};

export const listMutations = async (limit = 25): Promise<MutationJobRecord[]> => {
  const db = await getDatabase();
  if (!db) {
    return clone(getMemoryState().mutations).slice(0, limit);
  }
  const tx = db.transaction("mutations", "readonly");
  const all = await tx.store.getAll();
  await tx.done;
  return all.sort((a, b) => a.createdAt - b.createdAt).slice(0, limit);
};

export const removeMutation = async (id: string) => {
  const db = await getDatabase();
  if (!db) {
    const bucket = getMemoryState().mutations;
    const index = bucket.findIndex((entry) => entry.id === id);
    if (index >= 0) bucket.splice(index, 1);
    return;
  }
  const tx = db.transaction("mutations", "readwrite");
  await tx.store.delete(id);
  await tx.done;
};

export const touchMutation = async (id: string, updates: Partial<Pick<MutationJobRecord, "attempts" | "lastError">>) => {
  const db = await getDatabase();
  if (!db) {
    const bucket = getMemoryState().mutations;
    const match = bucket.find((entry) => entry.id === id);
    if (match) {
      Object.assign(match, updates);
    }
    return;
  }
  const tx = db.transaction("mutations", "readwrite");
  const existing = await tx.store.get(id);
  if (existing) {
    await tx.store.put({ ...existing, ...updates });
  }
  await tx.done;
};
