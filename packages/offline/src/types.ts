import type { Checkin, Event, Hub, User } from "@spheresconnect/types";

export type SyncState = "pending" | "synced" | "failed";

export type StoredCheckin = Checkin & {
  syncState?: SyncState;
};

export interface RewardSnapshot {
  userId: string;
  total: number;
  updatedAt: number;
}

export type CacheBucketMap = {
  checkins: StoredCheckin[];
  events: Event[];
  hubs: Hub[];
  rewards: RewardSnapshot[];
  profiles: User[];
};

export type CacheBucket = keyof CacheBucketMap;

export interface MutationJobRecord {
  id: string;
  endpoint: string;
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
  attempts: number;
  createdAt: number;
  lastError?: string;
}
