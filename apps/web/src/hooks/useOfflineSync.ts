"use client";

import { useCallback, useEffect, useRef } from "react";
import { listMutations, removeMutation, touchMutation } from "@spheresconnect/offline";

export const OFFLINE_SYNC_EVENT = "spheresconnect:sync-complete";

const emitSyncEvent = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_EVENT));
};

export const useOfflineSync = () => {
  const syncingRef = useRef(false);

  const flush = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const jobs = await listMutations(20);
      if (!jobs.length) return;
      for (const job of jobs) {
        try {
          const response = await fetch(job.endpoint, {
            method: job.method,
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              ...(job.headers ?? {})
            },
            body: job.body ? JSON.stringify(job.body) : undefined
          });
          if (!response.ok) {
            throw new Error(`Sync failed with status ${response.status}`);
          }
          await removeMutation(job.id);
        } catch (error) {
          await touchMutation(job.id, {
            attempts: job.attempts + 1,
            lastError: error instanceof Error ? error.message : "sync_error"
          });
        }
      }
      emitSyncEvent();
    } finally {
      syncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    flush();
    const handleOnline = () => {
      void flush();
    };
    window.addEventListener("online", handleOnline);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void flush();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [flush]);

  return { flush, syncEvent: OFFLINE_SYNC_EVENT };
};
