import { getDatabase, getMemoryState, isIndexedDbAvailable } from "./db";
import type { CacheBucket, CacheBucketMap } from "./types";

type BucketItem<K extends CacheBucket> = CacheBucketMap[K][number];

const bucketKeyMap: Record<CacheBucket, string> = {
  checkins: "checkinId",
  events: "eventId",
  hubs: "hubId",
  rewards: "userId",
  profiles: "userId"
};

const clone = <T>(value: T): T =>
  typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));

export const readCache = async <K extends CacheBucket>(bucket: K): Promise<CacheBucketMap[K]> => {
  const db = await getDatabase();
  if (!db) {
    const snapshot = getMemoryState()[bucket];
    return clone(snapshot) as CacheBucketMap[K];
  }
  const records = await db.getAll(bucket);
  return records as CacheBucketMap[K];
};

export const writeCache = async <K extends CacheBucket>(bucket: K, items: CacheBucketMap[K]) => {
  const db = await getDatabase();
  if (!db) {
    const memory = getMemoryState() as CacheBucketMap;
    memory[bucket] = clone(items) as CacheBucketMap[K];
    return;
  }
  const tx = db.transaction(bucket, "readwrite");
  await tx.store.clear();
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
};

export const upsertCacheItem = async <K extends CacheBucket>(bucket: K, item: BucketItem<K>) => {
  const keyPath = bucketKeyMap[bucket];
  const record = item as unknown as Record<string, unknown>;
  const keyValue = record[keyPath];
  if (keyValue === undefined) {
    throw new Error(`Cannot upsert item for ${bucket} without key "${keyPath}".`);
  }
  const db = await getDatabase();
  if (!db) {
    const bucketRef = getMemoryState()[bucket] as BucketItem<K>[];
    const index = bucketRef.findIndex((entry) => {
      const entryRecord = entry as unknown as Record<string, unknown>;
      return entryRecord[keyPath] === keyValue;
    });
    if (index >= 0) {
      bucketRef[index] = clone(item);
    } else {
      bucketRef.push(clone(item));
    }
    return;
  }
  const tx = db.transaction(bucket, "readwrite");
  await tx.store.put(item);
  await tx.done;
};

export const clearBucket = async <K extends CacheBucket>(bucket: K) => {
  const db = await getDatabase();
  if (!db) {
    const memory = getMemoryState() as CacheBucketMap;
    memory[bucket] = [] as CacheBucketMap[K];
    return;
  }
  const tx = db.transaction(bucket, "readwrite");
  await tx.store.clear();
  await tx.done;
};

export const offlineRuntimeInfo = () => ({
  indexedDb: isIndexedDbAvailable()
});
