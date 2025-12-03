import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { CacheBucketMap, MutationJobRecord, RewardSnapshot, StoredCheckin } from "./types";
import type { Event, Hub, User } from "@spheresconnect/types";

interface OfflineDB extends DBSchema {
  checkins: {
    key: string;
    value: StoredCheckin;
  };
  profiles: {
    key: string;
    value: User;
  };
  events: {
    key: string;
    value: Event;
  };
  hubs: {
    key: string;
    value: Hub;
  };
  rewards: {
    key: string;
    value: RewardSnapshot;
  };
  mutations: {
    key: string;
    value: MutationJobRecord;
  };
}

const DB_NAME = "spheresconnect-offline";
const DB_VERSION = 1;

const memoryState: CacheBucketMap & { mutations: MutationJobRecord[] } = {
  checkins: [],
  events: [],
  hubs: [],
  rewards: [],
  profiles: [],
  mutations: []
};

const hasIndexedDb = typeof indexedDB !== "undefined" || (typeof globalThis !== "undefined" && "indexedDB" in globalThis);

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

type StoreName = "checkins" | "events" | "hubs" | "rewards" | "profiles" | "mutations";

const ensureStore = (db: IDBPDatabase<OfflineDB>, name: StoreName, keyPath: string) => {
  if (db.objectStoreNames.contains(name)) return;
  db.createObjectStore(name, { keyPath });
};

export const getDatabase = async () => {
  if (!hasIndexedDb) return null;
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        ensureStore(db, "checkins", "checkinId");
        ensureStore(db, "events", "eventId");
        ensureStore(db, "hubs", "hubId");
        ensureStore(db, "rewards", "userId");
        ensureStore(db, "profiles", "userId");
        ensureStore(db, "mutations", "id");
      }
    });
  }
  return dbPromise;
};

export const getMemoryState = () => memoryState;
export const isIndexedDbAvailable = () => hasIndexedDb;
