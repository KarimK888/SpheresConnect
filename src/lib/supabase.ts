import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";
import type { BackendAdapter, AuthSession, CreateEventInput } from "./backend";
import type { Database, ChatAttachmentPayload } from "./supabase-database";
import type {
  Chat,
  Hub,
  ChatMessage,
  MatchSuggestion,
  MessageEvent,
  MessageReaction,
  User,
  Artwork,
  Order,
  Event,
  Checkin
} from "./types";
import {
  sampleHubs,
  sampleArtworks,
  sampleOrders,
  sampleEvents,
  sampleUsers,
  sampleCheckins
} from "./sample-data";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Falling back to in-memory adapter."
  );
}

const generateId = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `local_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

const ensureSupabaseClients = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const authOptions = {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  } as const;

  const anon = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: authOptions
  });
  const admin = SUPABASE_SERVICE_ROLE_KEY
    ? createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: authOptions
      })
    : anon;
  return { anon, admin };
};

const clients = ensureSupabaseClients();

const listeners = new Set<(event: MessageEvent) => void>();
let realtimeChannel: RealtimeChannel | null = null;
let currentSession: AuthSession | null = null;
let fallbackEvents = [...sampleEvents];
let fallbackCheckins = [...sampleCheckins];

const CHECKIN_TTL_MS = 1000 * 60 * 60 * 4;

const cleanupFallbackCheckins = () => {
  const now = Date.now();
  fallbackCheckins = fallbackCheckins.filter((checkin) => checkin.expiresAt > now);
};

const createFallbackCheckin = (input: {
  userId: string;
  hubId?: string;
  location: { lat: number; lng: number };
  status: "online" | "offline";
}): Checkin => {
  const now = Date.now();
  const checkin: Checkin = {
    checkinId: generateId(),
    userId: input.userId,
    hubId: input.hubId,
    location: input.location,
    status: input.status,
    createdAt: now,
    expiresAt: now + CHECKIN_TTL_MS
  };
  cleanupFallbackCheckins();
  fallbackCheckins = [...fallbackCheckins.filter((item) => item.userId !== input.userId), checkin];
  return checkin;
};

const sortByNearIfNeeded = <T extends { location: { lat: number; lng: number } }>(
  list: T[],
  near?: { lat: number; lng: number }
) => {
  if (!near) return list;
  return [...list].sort((a, b) => {
    const distA = distanceKm(near, a.location) ?? Number.POSITIVE_INFINITY;
    const distB = distanceKm(near, b.location) ?? Number.POSITIVE_INFINITY;
    return distA - distB;
  });
};

const mapUserRow = (row: Database["public"]["Tables"]["users"]["Row"]): User => ({
  userId: row.user_id,
  email: row.email,
  displayName: row.display_name ?? row.email.split("@")[0],
  bio: row.bio ?? undefined,
  skills: row.skills ?? [],
  profilePictureUrl: row.profile_picture_url ?? undefined,
  connections: row.connections ?? [],
  isVerified: Boolean(row.is_verified),
  language: (row.language ?? "en") as User["language"],
  location: row.location ?? undefined,
  joinedAt: new Date(row.joined_at).getTime(),
  profile: (row.profile ?? undefined) as User["profile"]
});

const mapMessageRow = (row: Database["public"]["Tables"]["messages"]["Row"]): ChatMessage => ({
  messageId: row.message_id,
  chatId: row.chat_id,
  senderId: row.sender_id,
  content: row.content ?? undefined,
  attachments: (row.attachments ?? []) as ChatMessage["attachments"],
  isSilent: Boolean(row.is_silent ?? false),
  scheduledFor: row.scheduled_for ? new Date(row.scheduled_for).getTime() : undefined,
  expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
  deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : undefined,
  deliveredTo: row.delivered_to ?? [],
  readBy: row.read_by ?? [],
  reactions: [],
  pinned: Boolean(row.pinned ?? false),
  metadata: row.metadata ?? undefined
});

const mapChatRow = (row: Database["public"]["Tables"]["chats"]["Row"]): Chat => ({
  chatId: row.chat_id,
  memberIds: row.member_ids,
  isGroup: row.is_group,
  title: row.title ?? undefined,
  createdAt: new Date(row.created_at).getTime()
});

const mapHubRow = (row: Database["public"]["Tables"]["hubs"]["Row"]): Hub => ({
  hubId: row.hub_id,
  name: row.name,
  location: row.location,
  activeUsers: row.active_users ?? []
});

const mapCheckinRow = (row: Database["public"]["Tables"]["checkins"]["Row"]): Checkin => ({
  checkinId: row.checkin_id,
  userId: row.user_id,
  hubId: row.hub_id ?? undefined,
  location: row.location ?? { lat: 0, lng: 0 },
  status: row.status ?? "online",
  expiresAt: new Date(row.expires_at).getTime(),
  createdAt: new Date(row.created_at).getTime()
});

const mapArtworkRow = (row: Database["public"]["Tables"]["artworks"]["Row"]): Artwork => ({
  artworkId: row.artwork_id,
  artistId: row.artist_id,
  title: row.title,
  description: row.description ?? undefined,
  mediaUrls: row.media_urls,
  price: row.price,
  currency: row.currency,
  isSold: row.is_sold,
  tags: row.tags,
  createdAt: new Date(row.created_at).getTime()
});

const mapOrderRow = (row: Database["public"]["Tables"]["orders"]["Row"]): Order => ({
  orderId: row.order_id,
  artworkId: row.artwork_id,
  buyerId: row.buyer_id,
  sellerId: row.seller_id,
  amount: row.amount,
  currency: row.currency,
  status: row.status,
  stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
  createdAt: new Date(row.created_at).getTime()
});

const mapEventRow = (row: Database["public"]["Tables"]["events"]["Row"]): Event => ({
  eventId: row.event_id,
  title: row.title,
  description: row.description ?? undefined,
  startsAt: new Date(row.starts_at).getTime(),
  endsAt: row.ends_at ? new Date(row.ends_at).getTime() : undefined,
  location: row.location ?? undefined,
  hostUserId: row.host_user_id,
  attendees: row.attendees ?? [],
  createdAt: new Date(row.created_at).getTime()
});

const EARTH_RADIUS_KM = 6371;
const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceKm = (
  origin?: { lat: number; lng: number },
  target?: { lat: number; lng: number }
): number | undefined => {
  if (!origin || !target) return undefined;
  const dLat = toRadians(target.lat - origin.lat);
  const dLng = toRadians(target.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(target.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = EARTH_RADIUS_KM * c;
  if (Number.isNaN(km) || !Number.isFinite(km)) return undefined;
  return Math.round(km * 10) / 10;
};

const computeMatchSuggestionsForUser = (user: User, candidates: User[], hubs: Hub[]): MatchSuggestion[] => {
  const hubByUser = new Map<string, Hub>();
  hubs.forEach((hub) => {
    hub.activeUsers.forEach((uid) => hubByUser.set(uid, hub));
  });

  const currentHub = hubByUser.get(user.userId);
  const originLocation = currentHub?.location ?? user.location;

  return candidates
    .filter((candidate) => candidate.userId !== user.userId)
    .filter((candidate) => !user.connections.includes(candidate.userId))
    .map<MatchSuggestion>((candidate) => {
      const candidateHub = hubByUser.get(candidate.userId);
      const candidateLocation = candidateHub?.location ?? candidate.location;
      const sharedHub = Boolean(currentHub && candidateHub && candidateHub.hubId === currentHub.hubId);
      const km = distanceKm(originLocation, candidateLocation);
      const sharedSkills = candidate.skills.filter((skill) => user.skills.includes(skill));
      const score =
        (sharedHub ? 2000 : 0) +
        sharedSkills.length * 100 -
        (km ?? 5000);
      return {
        ...candidate,
        hubId: candidateHub?.hubId,
        hubName: candidateHub?.name,
        sharedHub,
        distanceKm: km,
        score: Number.isFinite(score) ? Number(score) : undefined
      };
    })
    .sort((a, b) => {
      if (a.sharedHub !== b.sharedHub) return a.sharedHub ? -1 : 1;
      const distA = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const distB = b.distanceKm ?? Number.POSITIVE_INFINITY;
      if (distA !== distB) return distA - distB;
      return (b.score ?? 0) - (a.score ?? 0);
    })
    .slice(0, 30);
};

const buildMatchSuggestions = (userId: string, users: User[], hubs: Hub[]): MatchSuggestion[] => {
  const user = users.find((candidate) => candidate.userId === userId);
  if (!user) return [];
  return computeMatchSuggestionsForUser(user, users, hubs);
};

const emitEvent = (event: MessageEvent) => {
  listeners.forEach((listener) => listener(event));
};

const ensureRealtimeChannel = (client: SupabaseClient<Database>) => {
  if (realtimeChannel) return realtimeChannel;
  realtimeChannel = client.channel("spheraconnect-messaging");

  realtimeChannel
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const row = payload.new as Database["public"]["Tables"]["messages"]["Row"];
        emitEvent({ type: "message:created", chatId: row.chat_id, message: mapMessageRow(row) });
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages" },
      (payload) => {
        const row = payload.new as Database["public"]["Tables"]["messages"]["Row"];
        emitEvent({
          type: row.deleted_at ? "message:deleted" : "message:updated",
          chatId: row.chat_id,
          message: mapMessageRow(row)
        });
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "message_reactions" },
      (payload) => {
        const row = payload.new as Database["public"]["Tables"]["message_reactions"]["Row"];
        const reaction: MessageReaction = {
          reactionId: row.reaction_id,
          emoji: row.emoji,
          userId: row.user_id,
          createdAt: new Date(row.created_at).getTime()
        };
        emitEvent({ type: "reaction:added", chatId: row.chat_id, messageId: row.message_id, reaction });
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "message_reactions" },
      (payload) => {
        const row = payload.old as Database["public"]["Tables"]["message_reactions"]["Row"];
        const reaction: MessageReaction = {
          reactionId: row.reaction_id,
          emoji: row.emoji,
          userId: row.user_id,
          createdAt: new Date(row.created_at).getTime()
        };
        emitEvent({ type: "reaction:removed", chatId: row.chat_id, messageId: row.message_id, reaction });
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "message_reads" },
      (payload) => {
        const row = payload.new as Database["public"]["Tables"]["message_reads"]["Row"];
        emitEvent({
          type: "read",
          chatId: row.chat_id,
          messageId: row.message_id,
          userId: row.user_id,
          readAt: new Date(row.read_at).getTime()
        });
      }
    )
    .on("broadcast", { event: "typing" }, (payload) => {
      const data = payload.payload as {
        chatId: string;
        userId: string;
        isTyping: boolean;
        expiresAt: number;
      };
      emitEvent({
        type: "typing",
        chatId: data.chatId,
        userId: data.userId,
        isTyping: data.isTyping,
        expiresAt: data.expiresAt
      });
    })
    .subscribe();

  return realtimeChannel;
};

export const createSupabaseBackend = (): BackendAdapter => {
  if (!clients) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const { anon, admin } = clients;
  ensureRealtimeChannel(admin);

  const mapMessageWithReactions = async (rows: Database["public"]["Tables"]["messages"]["Row"][]) => {
    const messageIds = rows.map((row) => row.message_id);
    if (!messageIds.length) return rows.map(mapMessageRow);

    const { data: reactionRows } = await admin
      .from("message_reactions")
      .select("*")
      .in("message_id", messageIds);

    const grouped = new Map<string, MessageReaction[]>();
    (reactionRows ?? []).forEach((row) => {
      const existing = grouped.get(row.message_id) ?? [];
      existing.push({
        reactionId: row.reaction_id,
        emoji: row.emoji,
        userId: row.user_id,
        createdAt: new Date(row.created_at).getTime()
      });
      grouped.set(row.message_id, existing);
    });

    return rows.map((row) => ({
      ...mapMessageRow(row),
      reactions: grouped.get(row.message_id) ?? []
    }));
  };

  return {
    provider: "supabase",
    auth: {
      signup: async ({ email, password }) => {
        const result = await anon.auth.signUp({ email, password });
        if (result.error || !result.data.user) {
          throw result.error ?? new Error("Unable to sign up");
        }
        const authUser = result.data.user;
        const profile = {
          user_id: authUser.id,
          email,
          display_name: email.split("@")[0],
          skills: [],
          connections: [],
          is_verified: false,
          language: "en" as const,
          joined_at: authUser.created_at ?? new Date().toISOString()
        };
        await admin.from("users").upsert(profile, { onConflict: "user_id" });
        const user = mapUserRow(profile as Database["public"]["Tables"]["users"]["Row"]);
        const token = result.data.session?.access_token ?? "";
        currentSession = { token, user };
        return currentSession;
      },
      login: async ({ email, password }) => {
        const result = await anon.auth.signInWithPassword({ email, password });
        if (result.error || !result.data.user || !result.data.session) {
          throw result.error ?? new Error("Unable to login");
        }
        const { data: row } = await admin.from("users").select("*").eq("user_id", result.data.user.id).single();
        if (!row) {
          throw new Error("Profile missing for this account");
        }
        const user = mapUserRow(row);
        currentSession = { token: result.data.session.access_token, user };
        return currentSession;
      },
      oauth: async () => {
        throw new Error("OAuth flow must be handled client-side.");
      },
      getSession: async () => currentSession,
      logout: async () => {
        await anon.auth.signOut();
        currentSession = null;
      }
    },
    users: {
      list: async ({ query }) => {
        const builder = admin.from("users").select("*");
        if (query) {
          builder.or(
            `display_name.ilike.%${query}%,skills.cs.{${query.toLowerCase()}}`
          );
        }
        const { data, error } = await builder;
        if (error) {
          console.warn("[supabase] users.list falling back to sample data:", error.message);
          return sampleUsers;
        }
        if (!data || data.length === 0) {
          return sampleUsers.filter((user) =>
            query
              ? user.displayName.toLowerCase().includes(query.toLowerCase()) ||
                user.skills.some((skill) => skill.toLowerCase().includes(query.toLowerCase()))
              : true
          );
        }
        return data.map(mapUserRow);
      },
      get: async (id) => {
        const { data, error } = await admin.from("users").select("*").eq("user_id", id).single();
        if (error && error.code !== "PGRST116") {
          console.warn("[supabase] users.get fallback:", error.message);
        }
        if (data) {
          return mapUserRow(data);
        }
        const fallback = sampleUsers.find((user) => user.userId === id);
        return fallback ?? null;
      },
      update: async (id, input) => {
        const updatePayload: Database["public"]["Tables"]["users"]["Update"] = {
          display_name: input.displayName,
          bio: input.bio,
          skills: input.skills,
          profile_picture_url: input.profilePictureUrl,
          connections: input.connections,
          is_verified: input.isVerified,
          language: input.language,
          location: input.location ?? null,
          profile: (input.profile ?? null) as Database["public"]["Tables"]["users"]["Update"]["profile"]
        };
        const { data, error } = await admin
          .from("users")
          .update(updatePayload)
          .eq("user_id", id)
          .select("*")
          .single();
        if (error) throw error;
        if (currentSession?.user.userId === id) {
          currentSession = { ...currentSession, user: mapUserRow(data) };
        }
        return mapUserRow(data);
      },
      requestVerification: async () => ({ submitted: true }),
      verify: async (id) => {
        const { data, error } = await admin
          .from("users")
          .update({ is_verified: true })
          .eq("user_id", id)
          .select("*")
          .single();
        if (error) throw error;
        return mapUserRow(data);
      }
    },
    hubs: {
      list: async () => {
        const { data, error } = await admin.from("hubs").select("*");
        if (error || !data) {
          if (error) {
            console.warn("[supabase] hubs.list falling back to sample data:", error.message);
          }
          return sampleHubs;
        }
        if (!data.length) {
          return sampleHubs;
        }
        return data.map(mapHubRow);
      }
    },
    checkins: {
      create: async ({ userId, hubId, location, status }) => {
        const expiresAt = Date.now() + CHECKIN_TTL_MS;
        if (!clients) {
          return createFallbackCheckin({ userId, hubId, location, status });
        }
        try {
          const { admin } = clients;
          await admin.from("checkins").delete().eq("user_id", userId);
          const { data, error } = await admin
            .from("checkins")
            .insert({
              checkin_id: generateId(),
              user_id: userId,
              hub_id: hubId ?? null,
              location,
              status,
              expires_at: new Date(expiresAt).toISOString(),
              created_at: new Date().toISOString()
            })
            .select("*")
            .single();
          if (error) throw error;
          const mapped = mapCheckinRow(data);
          fallbackCheckins = [
            ...fallbackCheckins.filter((checkin) => checkin.userId !== userId),
            mapped
          ];
          return mapped;
        } catch (error) {
          console.warn("[supabase] checkins.create fallback:", error instanceof Error ? error.message : error);
          return createFallbackCheckin({ userId, hubId, location, status });
        }
      },
      listActive: async ({ near }: { near?: { lat: number; lng: number } } = {}) => {
        if (!clients) {
          cleanupFallbackCheckins();
          return sortByNearIfNeeded([...fallbackCheckins], near);
        }
        try {
          const { admin } = clients;
          const { data, error } = await admin
            .from("checkins")
            .select("*")
            .gt("expires_at", new Date().toISOString());
          if (error) throw error;
          const mapped = (data ?? []).map(mapCheckinRow);
          cleanupFallbackCheckins();
          fallbackCheckins = [
            ...fallbackCheckins.filter((fallback) => !mapped.some((item) => item.userId === fallback.userId)),
            ...mapped
          ];
          return sortByNearIfNeeded(mapped, near);
        } catch (error) {
          console.warn("[supabase] checkins.listActive fallback:", error instanceof Error ? error.message : error);
          cleanupFallbackCheckins();
          return sortByNearIfNeeded([...fallbackCheckins], near);
        }
      }
    },
    matches: {
      suggest: async ({ userId }) => {
        const { data: userRows, error: userError } = await admin.from("users").select("*");
        const { data: hubRows, error: hubError } = await admin.from("hubs").select("*");

        if (userError || !userRows || userRows.length === 0) {
          if (userError) {
            console.warn("[supabase] matches.suggest falling back to sample users:", userError.message);
          }
          return buildMatchSuggestions(userId, sampleUsers, sampleHubs);
        }

        const users = userRows.map(mapUserRow);
        const hubs = hubRows?.map(mapHubRow) ?? [];

        if (hubError) {
          console.warn("[supabase] matches.suggest hub fallback:", hubError.message);
        }
        const userRecord = users.find((candidate) => candidate.userId === userId);

        const mergeUsers = [
          ...users,
          ...sampleUsers.filter((candidate) => !users.some((existing) => existing.userId === candidate.userId))
        ];
        const mergeHubs = [
          ...hubs,
          ...sampleHubs.filter((hub) => !hubs.some((existing) => existing.hubId === hub.hubId))
        ];

        if (!userRecord) {
          const fallback = buildMatchSuggestions(userId, mergeUsers, mergeHubs);
          return fallback.length ? fallback : buildMatchSuggestions(userId, sampleUsers, sampleHubs);
        }

        let suggestions = computeMatchSuggestionsForUser(userRecord, users, hubs);
        if (!suggestions.length) {
          suggestions = computeMatchSuggestionsForUser(userRecord, mergeUsers, mergeHubs);
        }
        if (!suggestions.length) {
          suggestions = buildMatchSuggestions(userId, sampleUsers, sampleHubs);
        }
        return suggestions;
      }
    },
    messages: {
      listChats: async ({ userId }) => {
        const { data, error } = await admin
          .from("chats")
          .select("*")
          .contains("member_ids", [userId]);
        if (error) throw error;
        return (data ?? []).map(mapChatRow);
      },
      list: async ({ chatId }) => {
        const { data, error } = await admin
          .from("messages")
          .select("*")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return mapMessageWithReactions(data ?? []);
      },
      send: async ({ chatId, senderId, content, attachments, metadata, isSilent, scheduledFor, expiresAt }) => {
        const messageId = generateId();
        const createdAt = new Date().toISOString();
        const payload: Database["public"]["Tables"]["messages"]["Insert"] = {
          message_id: messageId,
          chat_id: chatId,
          sender_id: senderId,
          content: content ?? null,
          attachments: (attachments ?? []) as ChatAttachmentPayload[],
          metadata: metadata ?? null,
          is_silent: isSilent ?? false,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          created_at: createdAt,
          delivered_to: null,
          read_by: [senderId],
          pinned: false
        };
        const { data, error } = await admin.from("messages").insert(payload).select("*").single();
        if (error) throw error;
        return mapMessageWithReactions([data]).then((mapped) => mapped[0]);
      },
      update: async ({ chatId, messageId, userId, content, metadata }) => {
        const { data: existing, error: fetchError } = await admin
          .from("messages")
          .select("*")
          .eq("chat_id", chatId)
          .eq("message_id", messageId)
          .single();
        if (fetchError) throw fetchError;
        if (!existing) throw new Error("Message not found");
        if (existing.sender_id !== userId) throw new Error("Only the author may edit this message");
        if (Date.now() - new Date(existing.created_at).getTime() > 15 * 60 * 1000) {
          throw new Error("Edit window expired");
        }
        const updatePayload: Database["public"]["Tables"]["messages"]["Update"] = {
          content: content ?? null,
          metadata: metadata ?? existing.metadata ?? null,
          updated_at: new Date().toISOString()
        };
        const { data, error } = await admin
          .from("messages")
          .update(updatePayload)
          .eq("chat_id", chatId)
          .eq("message_id", messageId)
          .select("*")
          .single();
        if (error) throw error;
        return mapMessageWithReactions([data]).then((mapped) => mapped[0]);
      },
      remove: async ({ chatId, messageId, userId, hardDelete }) => {
        if (hardDelete) {
          const { data, error } = await admin
            .from("messages")
            .delete()
            .eq("chat_id", chatId)
            .eq("message_id", messageId)
            .select("*")
            .single();
          if (error) throw error;
          return mapMessageRow(data);
        }
        const { data, error } = await admin
          .from("messages")
          .update({
            content: null,
            attachments: [],
            deleted_at: new Date().toISOString()
          })
          .eq("chat_id", chatId)
          .eq("message_id", messageId)
          .eq("sender_id", userId)
          .select("*")
          .single();
        if (error) throw error;
        return mapMessageRow(data);
      },
      addReaction: async ({ chatId, messageId, userId, emoji }) => {
          const { error } = await admin.from("message_reactions").upsert(
            {
              chat_id: chatId,
              message_id: messageId,
              user_id: userId,
              emoji,
              reaction_id: generateId(),
              created_at: new Date().toISOString()
            },
            { onConflict: "message_id,user_id,emoji" }
          );
        if (error) throw error;
        const { data } = await admin
          .from("messages")
          .select("*")
          .eq("chat_id", chatId)
          .eq("message_id", messageId)
          .single();
        return mapMessageWithReactions(data ? [data] : []).then((mapped) => mapped[0]);
      },
      removeReaction: async ({ chatId, messageId, userId, emoji }) => {
        const { error } = await admin
          .from("message_reactions")
          .delete()
          .match({ chat_id: chatId, message_id: messageId, user_id: userId, emoji });
        if (error) throw error;
        const { data } = await admin
          .from("messages")
          .select("*")
          .eq("chat_id", chatId)
          .eq("message_id", messageId)
          .single();
        return mapMessageWithReactions(data ? [data] : []).then((mapped) => mapped[0]);
      },
      pin: async ({ chatId, messageId, pinned }) => {
        const { data, error } = await admin
          .from("messages")
          .update({ pinned })
          .eq("chat_id", chatId)
          .eq("message_id", messageId)
          .select("*")
          .single();
        if (error) throw error;
        return mapMessageWithReactions([data]).then((mapped) => mapped[0]);
      },
      markRead: async ({ chatId, messageId, userId }) => {
        const { data: existing } = await admin
          .from("message_reads")
          .select("*")
          .match({ chat_id: chatId, message_id: messageId, user_id: userId })
          .maybeSingle();
        if (!existing) {
          await admin.from("message_reads").insert({
            chat_id: chatId,
            message_id: messageId,
            user_id: userId,
            read_at: new Date().toISOString()
          });
        }
        const { data } = await admin
          .from("messages")
          .select("*")
          .eq("chat_id", chatId)
          .eq("message_id", messageId)
          .single();
        if (data) {
          const readBy = new Set(data.read_by ?? []);
          readBy.add(userId);
          await admin
            .from("messages")
            .update({ read_by: Array.from(readBy) })
            .eq("chat_id", chatId)
            .eq("message_id", messageId);
        }
      },
      typing: async ({ chatId, userId, isTyping }) => {
        const channel = ensureRealtimeChannel(admin);
        channel?.send({
          type: "broadcast",
          event: "typing",
          payload: {
            chatId,
            userId,
            isTyping,
            expiresAt: Date.now() + 5000
          }
        });
      },
      createChat: async ({ memberIds, isGroup, title }) => {
        const chat: Database["public"]["Tables"]["chats"]["Insert"] = {
          chat_id: generateId(),
          member_ids: memberIds,
          is_group: isGroup,
          title: title ?? null,
          created_at: new Date().toISOString()
        };
        const { data, error } = await admin.from("chats").insert(chat).select("*").single();
        if (error) throw error;
        return mapChatRow(data);
      },
      subscribe: (handler) => {
        listeners.add(handler);
        return () => listeners.delete(handler);
      }
    },
    marketplace: {
      list: async ({ tag, priceMin, priceMax }) => {
        const builder = admin.from("artworks").select("*").order("created_at", { ascending: false });
        if (tag) builder.contains("tags", [tag]);
        if (typeof priceMin === "number") builder.gte("price", priceMin);
        if (typeof priceMax === "number") builder.lte("price", priceMax);
        const { data, error } = await builder;
        if (error || !data || data.length === 0) {
          if (error) {
            console.warn("[supabase] artworks.list falling back to sample data:", error.message);
          }
          return sampleArtworks.filter((artwork) => {
            const withinTag = tag ? artwork.tags.includes(tag) : true;
            const aboveMin = typeof priceMin === "number" ? artwork.price >= priceMin : true;
            const belowMax = typeof priceMax === "number" ? artwork.price <= priceMax : true;
            return withinTag && aboveMin && belowMax;
          });
        }
        return data.map(mapArtworkRow);
      },
      createListing: async (input) => {
        const entry: Database["public"]["Tables"]["artworks"]["Insert"] = {
          artwork_id: input.artworkId ?? generateId(),
          artist_id: input.artistId,
          title: input.title,
          description: input.description ?? null,
          media_urls: input.mediaUrls,
          price: input.price,
          currency: input.currency,
          is_sold: input.isSold,
          tags: input.tags,
          created_at: new Date(input.createdAt ?? Date.now()).toISOString()
        };
        const { data, error } = await admin
          .from("artworks")
          .upsert(entry, { onConflict: "artwork_id" })
          .select("*")
          .single();
        if (error || !data) {
          throw error ?? new Error("Unable to create listing");
        }
        return mapArtworkRow(data);
      },
      getDashboard: async (userId) => {
        const { data: listingRows, error: listingError } = await admin
          .from("artworks")
          .select("*")
          .eq("artist_id", userId)
          .order("created_at", { ascending: false });
        const { data: orderRows, error: orderError } = await admin
          .from("orders")
          .select("*")
          .eq("seller_id", userId)
          .order("created_at", { ascending: false });

        const listings =
          listingError || !listingRows || listingRows.length === 0
            ? sampleArtworks.filter((artwork) => artwork.artistId === userId)
            : listingRows.map(mapArtworkRow);
        const orders =
          orderError || !orderRows || orderRows.length === 0
            ? sampleOrders.filter((order) => order.sellerId === userId)
            : orderRows.map(mapOrderRow);
        return { listings, orders };
      }
    },
    orders: {
      createPaymentIntent: async () => {
        throw new Error("Orders not yet implemented for Supabase backend.");
      },
      confirmPayment: async () => {
        throw new Error("Orders not yet implemented for Supabase backend.");
      }
    },
    events: {
      list: async () => {
        const { data, error } = await admin.from("events").select("*").order("starts_at", { ascending: true });
        if (error || !data || data.length === 0) {
          if (error) {
            console.warn("[supabase] events.list falling back to sample data:", error.message);
          }
          return fallbackEvents;
        }
        const mapped = data.map(mapEventRow);
        fallbackEvents = mapped;
        return mapped;
      },
      create: async (input: CreateEventInput) => {
        const payload: Database["public"]["Tables"]["events"]["Insert"] = {
          event_id: input.eventId,
          title: input.title,
          description: input.description ?? null,
          starts_at: new Date(input.startsAt).toISOString(),
          ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
          location: input.location ?? null,
          host_user_id: input.hostUserId,
          attendees: input.attendees ?? [],
          created_at: new Date(input.createdAt ?? Date.now()).toISOString()
        };
        const { data, error } = await admin.from("events").insert(payload).select("*").single();
        if (error || !data) {
          console.warn("[supabase] events.create falling back:", error?.message ?? "Unknown error");
          const fallback: Event = {
            eventId: payload.event_id ?? generateId(),
            title: payload.title,
            description: payload.description ?? undefined,
            startsAt: new Date(payload.starts_at).getTime(),
            endsAt: payload.ends_at ? new Date(payload.ends_at).getTime() : undefined,
            location: payload.location ?? undefined,
            hostUserId: payload.host_user_id,
            attendees: payload.attendees ?? [],
            createdAt: payload.created_at ? new Date(payload.created_at).getTime() : Date.now()
          };
          fallbackEvents = [...fallbackEvents.filter((event) => event.eventId !== fallback.eventId), fallback];
          return fallback;
        }
        const event = mapEventRow(data);
        fallbackEvents = [...fallbackEvents.filter((evt) => evt.eventId !== event.eventId), event];
        return event;
      },
      update: async ({ eventId, data }) => {
        const updates: Database["public"]["Tables"]["events"]["Update"] = {};
        if (Object.prototype.hasOwnProperty.call(data, "title")) {
          updates.title = data.title ?? null;
        }
        if (Object.prototype.hasOwnProperty.call(data, "description")) {
          updates.description = data.description ?? null;
        }
        if (Object.prototype.hasOwnProperty.call(data, "startsAt") && data.startsAt) {
          updates.starts_at = new Date(data.startsAt).toISOString();
        }
        if (Object.prototype.hasOwnProperty.call(data, "endsAt")) {
          updates.ends_at = data.endsAt ? new Date(data.endsAt).toISOString() : null;
        }
        if (Object.prototype.hasOwnProperty.call(data, "location")) {
          updates.location = data.location ?? null;
        }
        if (Object.prototype.hasOwnProperty.call(data, "attendees")) {
          updates.attendees = data.attendees ?? [];
        }
        if (Object.prototype.hasOwnProperty.call(data, "hostUserId") && data.hostUserId) {
          updates.host_user_id = data.hostUserId;
        }
        const { data: updatedRow, error } = await admin
          .from("events")
          .update(updates)
          .eq("event_id", eventId)
          .select("*")
          .single();
        if (error || !updatedRow) {
          console.warn("[supabase] events.update falling back:", error?.message ?? "Unknown error");
          const fallback = fallbackEvents.find((event) => event.eventId === eventId);
          if (!fallback) {
            throw error ?? new Error("Event not found");
          }
          const updatedFallback: Event = {
            ...fallback,
            ...(Object.prototype.hasOwnProperty.call(data, "title")
              ? { title: data.title ?? fallback.title }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(data, "description")
              ? {
                  description:
                    data.description === undefined ? fallback.description : data.description ?? undefined
                }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(data, "startsAt")
              ? { startsAt: data.startsAt ?? fallback.startsAt }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(data, "endsAt")
              ? { endsAt: data.endsAt === undefined ? fallback.endsAt : data.endsAt ?? undefined }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(data, "location")
              ? { location: data.location === undefined ? fallback.location : data.location ?? undefined }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(data, "attendees")
              ? { attendees: data.attendees ?? [] }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(data, "hostUserId")
              ? { hostUserId: data.hostUserId ?? fallback.hostUserId }
              : {})
          };
          fallbackEvents = fallbackEvents.map((event) => (event.eventId === eventId ? updatedFallback : event));
          return updatedFallback;
        }
        const updated = mapEventRow(updatedRow);
        fallbackEvents = fallbackEvents.map((event) => (event.eventId === updated.eventId ? updated : event));
        return updated;
      },
      remove: async ({ eventId }) => {
        const { error } = await admin.from("events").delete().eq("event_id", eventId);
        if (error) {
          console.warn("[supabase] events.remove falling back:", error.message);
        }
        fallbackEvents = fallbackEvents.filter((event) => event.eventId !== eventId);
      },
      rsvp: async ({ eventId, userId }) => {
        const { data: row, error } = await admin
          .from("events")
          .select("*")
          .eq("event_id", eventId)
          .single();
        if (error || !row) {
          console.warn("[supabase] events.rsvp falling back:", error?.message ?? "Event missing");
          const fallback = fallbackEvents.find((event) => event.eventId === eventId);
          if (!fallback) {
            throw error ?? new Error("Event not found");
          }
          const attendees = new Set(fallback.attendees);
          attendees.add(userId);
          const updated = { ...fallback, attendees: Array.from(attendees) };
          fallbackEvents = fallbackEvents.map((event) => (event.eventId === eventId ? updated : event));
          return updated;
        }
        const attendees = new Set(row.attendees ?? []);
        attendees.add(userId);
        const { data: updatedRow, error: updateError } = await admin
          .from("events")
          .update({ attendees: Array.from(attendees) })
          .eq("event_id", eventId)
          .select("*")
          .single();
        if (updateError || !updatedRow) {
          throw updateError ?? new Error("Unable to update RSVP");
        }
        const updated = mapEventRow(updatedRow);
        fallbackEvents = fallbackEvents.map((event) => (event.eventId === updated.eventId ? updated : event));
        return updated;
      }
    },
    rewards: {
      summary: async () => ({ total: 0, logs: [] }),
      log: async () => {
        throw new Error("Rewards not yet implemented for Supabase backend.");
      }
    },
    uploads: {
      createSignedUrl: async ({ extension }) => {
        const assetId = generateId();
        return {
          uploadUrl: `https://uploads.spheraconnect.dev/${assetId}.${extension}`,
          fileUrl: `https://cdn.spheraconnect.dev/${assetId}.${extension}`
        };
      }
    }
  };
};


