import { createInMemoryBackend } from "./in-memory-backend";

export const createFirebaseBackend = () => createInMemoryBackend("firebase");
