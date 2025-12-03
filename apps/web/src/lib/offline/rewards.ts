import { readCache, upsertCacheItem } from "@spheresconnect/offline";

export const adjustCachedRewardTotal = async (userId: string, delta: number) => {
  if (typeof window === "undefined") return;
  try {
    const snapshots = await readCache("rewards");
    const current = snapshots.find((entry) => entry.userId === userId);
    const updated = {
      userId,
      total: Math.max(0, (current?.total ?? 0) + delta),
      updatedAt: Date.now()
    };
    await upsertCacheItem("rewards", updated);
  } catch (error) {
    console.warn("[offline-rewards] unable to adjust cache", error);
  }
};
