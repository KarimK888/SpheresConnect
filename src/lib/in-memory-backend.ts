import type { BackendAdapter, AuthSession, CreateEventInput } from "./backend";
import {
  sampleUsers,
  sampleArtworks,
  sampleHubs,
  sampleCheckins,
  sampleChats,
  sampleMessages,
  sampleOrders,
  sampleEvents,
  sampleRewardLogs,
  sampleMatchActions,
  verifiedAdminId
} from "./sample-data";
import type {
  Artwork,
  Chat,
  ChatMessage,
  Checkin,
  Event,
  Hub,
  MatchAction,
  MatchActionResult,
  MatchSuggestion,
  MessageEvent,
  MessageReaction,
  Order,
  RewardLog,
  User,
  ProfileProject,
  ProfileMedia,
  ProfileSocialLink,
  OrderMilestone,
  Payout,
  NotificationEntry,
  VerificationRequest,
  ModerationQueueItem,
  SupportTicket
} from "./types";

interface InMemoryStore {
  users: User[];
  artworks: Artwork[];
  hubs: Hub[];
  checkins: Checkin[];
  chats: Chat[];
  messages: ChatMessage[];
  orders: Order[];
  events: Event[];
  rewards: RewardLog[];
  matchActions: MatchAction[];
  profileProjects: ProfileProject[];
  profileMedia: ProfileMedia[];
  profileSocials: ProfileSocialLink[];
  orderMilestones: OrderMilestone[];
  payouts: Payout[];
  notifications: NotificationEntry[];
  verificationRequests: VerificationRequest[];
  moderationQueue: ModerationQueueItem[];
  supportTickets: SupportTicket[];
  session: AuthSession | null;
}

const stores: Record<"firebase" | "supabase", InMemoryStore> = {
  firebase: {
    users: structuredClone(sampleUsers),
    artworks: structuredClone(sampleArtworks),
    hubs: structuredClone(sampleHubs),
    checkins: structuredClone(sampleCheckins),
    chats: structuredClone(sampleChats),
    messages: structuredClone(sampleMessages),
    orders: structuredClone(sampleOrders),
    events: structuredClone(sampleEvents),
    rewards: structuredClone(sampleRewardLogs),
    matchActions: structuredClone(sampleMatchActions),
    profileProjects: [],
    profileMedia: [],
    profileSocials: [],
    orderMilestones: [],
    payouts: [],
    notifications: [],
    verificationRequests: [],
    moderationQueue: [],
    supportTickets: [],
    session: null
  },
  supabase: {
    users: structuredClone(sampleUsers),
    artworks: structuredClone(sampleArtworks),
    hubs: structuredClone(sampleHubs),
    checkins: structuredClone(sampleCheckins),
    chats: structuredClone(sampleChats),
    messages: structuredClone(sampleMessages),
    orders: structuredClone(sampleOrders),
    events: structuredClone(sampleEvents),
    rewards: structuredClone(sampleRewardLogs),
    matchActions: structuredClone(sampleMatchActions),
    profileProjects: [],
    profileMedia: [],
    profileSocials: [],
    orderMilestones: [],
    payouts: [],
    notifications: [],
    verificationRequests: [],
    moderationQueue: [],
    supportTickets: [],
    session: null
  }
};

const STORAGE_KEY_PREFIX = "spheraconnect:";
const hydratedProviders = new Set<"firebase" | "supabase">();

const canUseLocalStorage = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const getArtworksKey = (provider: "firebase" | "supabase") =>
  `${STORAGE_KEY_PREFIX}artworks:${provider}`;
const getCheckinsKey = (provider: "firebase" | "supabase") =>
  `${STORAGE_KEY_PREFIX}checkins:${provider}`;

const hydrateArtworksFromStorage = (provider: "firebase" | "supabase") => {
  if (!canUseLocalStorage()) return;
  try {
    const stored = window.localStorage.getItem(getArtworksKey(provider));
    if (!stored) return;
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return;
    const merged = new Map<string, Artwork>();
    stores[provider].artworks.forEach((art) => merged.set(art.artworkId, art));
    (parsed as Artwork[]).forEach((art) => {
      if (art?.artworkId) {
        merged.set(art.artworkId, art);
      }
    });
    stores[provider].artworks = Array.from(merged.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  } catch (error) {
    console.warn("[in-memory-backend] Unable to hydrate artworks:", error);
  }
};

const persistArtworksToStorage = (provider: "firebase" | "supabase") => {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(
      getArtworksKey(provider),
      JSON.stringify(stores[provider].artworks)
    );
  } catch (error) {
    console.warn("[in-memory-backend] Unable to persist artworks:", error);
  }
};

const hydrateCheckinsFromStorage = (provider: "firebase" | "supabase") => {
  if (!canUseLocalStorage()) return;
  try {
    const stored = window.localStorage.getItem(getCheckinsKey(provider));
    if (!stored) return;
    const parsed = JSON.parse(stored) as Checkin[];
    if (!Array.isArray(parsed)) return;
    const now = Date.now();
    stores[provider].checkins = parsed.filter((checkin) => checkin.expiresAt > now);
  } catch (error) {
    console.warn("[in-memory-backend] Unable to hydrate checkins:", error);
  }
};

const persistCheckinsToStorage = (provider: "firebase" | "supabase") => {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(
      getCheckinsKey(provider),
      JSON.stringify(stores[provider].checkins)
    );
  } catch (error) {
    console.warn("[in-memory-backend] Unable to persist checkins:", error);
  }
};

const randomId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const messageListeners: Record<"firebase" | "supabase", Set<(event: MessageEvent) => void>> = {
  firebase: new Set(),
  supabase: new Set()
};

const pushNotification = (
  provider: "firebase" | "supabase",
  input: Omit<NotificationEntry, "notificationId" | "createdAt" | "readAt"> & {
    notificationId?: string;
    createdAt?: number;
    readAt?: number | null;
  }
) => {
  const entry: NotificationEntry = {
    notificationId: input.notificationId ?? randomId("notif"),
    userId: input.userId,
    kind: input.kind ?? "system",
    title: input.title,
    body: input.body ?? undefined,
    link: input.link ?? undefined,
    linkLabel: input.linkLabel ?? undefined,
    secondaryLink: input.secondaryLink ?? undefined,
    secondaryLinkLabel: input.secondaryLinkLabel ?? undefined,
    metadata: input.metadata,
    createdAt: input.createdAt ?? Date.now(),
    readAt: input.readAt ?? null
  };
  stores[provider].notifications = [
    entry,
    ...stores[provider].notifications.filter((item) => item.notificationId !== entry.notificationId)
  ];
  return entry;
};

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

const buildMatchSuggestions = (user: User, candidates: User[], hubs: Hub[]): MatchSuggestion[] => {
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

const ensureUser = (store: InMemoryStore, userId: string) => {
  const user = store.users.find((u) => u.userId === userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }
  return user;
};

export const createInMemoryBackend = (provider: "firebase" | "supabase"): BackendAdapter => {
  const store = stores[provider];
  store.chats = store.chats.map((chat) => ({
    ...chat,
    archivedBy: chat.archivedBy ?? [],
    hiddenBy: chat.hiddenBy ?? []
  }));
  if (!hydratedProviders.has(provider)) {
    hydrateArtworksFromStorage(provider);
    hydrateCheckinsFromStorage(provider);
    hydratedProviders.add(provider);
  }
  const listeners = messageListeners[provider];
  const emit = (event: MessageEvent) => {
    listeners.forEach((listener) => listener(event));
  };

  return {
    provider,
    auth: {
      signup: async ({ email, password }) => {
        if (!email || !password) {
          throw new Error("Email and password required");
        }
        const existing = store.users.find((u) => u.email === email);
        if (existing) {
          throw new Error("User already exists");
        }
        const newUser: User = {
          userId: randomId("usr"),
          email,
          displayName: email.split("@")[0],
          skills: [],
          connections: [],
          isVerified: false,
          language: "en",
          joinedAt: Date.now()
        };
        store.users.push(newUser);
        const session: AuthSession = {
          token: randomId("tok"),
          user: newUser
        };
        store.session = session;
        return session;
      },
      login: async ({ email }) => {
        const user = store.users.find((u) => u.email === email);
        if (!user) {
          throw new Error("Invalid credentials");
        }
        const session: AuthSession = {
          token: randomId("tok"),
          user
        };
        store.session = session;
        return session;
      },
      oauth: async ({ token }) => {
        const user = store.users.find((u) => u.userId === verifiedAdminId);
        if (!token || !user) {
          throw new Error("OAuth failed");
        }
        const session: AuthSession = {
          token: randomId("tok"),
          user
        };
        store.session = session;
        return session;
      },
      getSession: async () => store.session,
      logout: async () => {
        store.session = null;
      }
    },
    users: {
      list: async ({ query }) => {
        if (!query) {
          return [...store.users];
        }
        const term = query.toLowerCase();
        return store.users.filter(
          (user) =>
            user.displayName.toLowerCase().includes(term) ||
            user.skills.some((skill) => skill.toLowerCase().includes(term))
        );
      },
      get: async (id) => store.users.find((user) => user.userId === id) ?? null,
      update: async (id, input) => {
        const user = ensureUser(store, id);
        const updated = { ...user, ...input };
        store.users = store.users.map((u) => (u.userId === id ? updated : u));
        if (store.session?.user.userId === id) {
          store.session = { ...store.session, user: updated };
        }
        return updated;
      },
      requestVerification: async (id) => {
        ensureUser(store, id);
        return { submitted: true };
      },
      verify: async (id) => {
        const user = ensureUser(store, id);
        const updated = { ...user, isVerified: true };
        store.users = store.users.map((u) => (u.userId === id ? updated : u));
        return updated;
      }
    },
    hubs: {
      list: async () => [...store.hubs]
    },
    checkins: {
      create: async ({ userId, hubId, location, status }) => {
        ensureUser(store, userId);
        const checkin: Checkin = {
          checkinId: randomId("chk"),
          userId,
          hubId,
          location,
          status,
          createdAt: Date.now(),
          expiresAt: Date.now() + 1000 * 60 * 60 * 4
        };
        store.checkins = store.checkins.filter((c) => c.userId !== userId);
        store.checkins.push(checkin);
        persistCheckinsToStorage(provider);
        return checkin;
      },
      listActive: async () => {
        const nowTs = Date.now();
        store.checkins = store.checkins.filter((chk) => chk.expiresAt > nowTs);
        persistCheckinsToStorage(provider);
        return [...store.checkins];
      }
    },
    matches: {
      suggest: async ({ userId }) => {
        const user = ensureUser(store, userId);
        const excluded = new Set(
          store.matchActions.filter((entry) => entry.userId === userId).map((entry) => entry.targetId)
        );
        return buildMatchSuggestions(user, store.users, store.hubs).filter(
          (candidate) => !excluded.has(candidate.userId)
        );
      },
      history: async ({ userId }) =>
        store.matchActions
          .filter((entry) => entry.userId === userId)
          .sort((a, b) => b.createdAt - a.createdAt),
      incomingLikes: async ({ userId }) => {
        return store.matchActions
          .filter((entry) => entry.targetId === userId && entry.action === "connected")
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((entry) => {
            const from = ensureUser(store, entry.userId);
            const isMutual = store.matchActions.some(
              (candidate) =>
                candidate.userId === userId &&
                candidate.targetId === entry.userId &&
                candidate.action === "connected"
            );
            let chatId: string | undefined;
            if (isMutual) {
              const existing =
                store.chats.find(
                  (chat) =>
                    !chat.isGroup &&
                    chat.memberIds.includes(entry.userId) &&
                    chat.memberIds.includes(userId)
                ) ?? null;
              if (existing) {
                chatId = existing.chatId;
              } else {
                const chat: Chat = {
                  chatId: randomId("chat"),
                  memberIds: [entry.userId, userId],
                  isGroup: false,
                  title: undefined,
                  createdAt: Date.now(),
                  archivedBy: [],
                  hiddenBy: []
                };
                store.chats.push(chat);
                chatId = chat.chatId;
              }
            }
            return {
              action: entry,
              from,
              isMutual,
              chatId
            };
          });
      },
      recordAction: async ({ userId, targetId, action, createdAt }) => {
        const actorProfile = ensureUser(store, userId);
        const targetProfile = ensureUser(store, targetId);
        const entry: MatchAction = {
          id: randomId("mat"),
          userId,
          targetId,
          action,
          createdAt: createdAt ?? Date.now()
        };
        store.matchActions = [
          entry,
          ...store.matchActions.filter(
            (item) => item.userId !== userId || item.targetId !== targetId
          )
        ];
        let match: MatchActionResult["match"] | undefined;
        if (action === "connected") {
          pushNotification(provider, {
            userId: targetId,
            kind: "system",
            title: `${actorProfile.displayName} liked your profile`,
            body: "Open their profile to connect back.",
            link: `/profile/${actorProfile.userId}`,
            linkLabel: "View profile",
            metadata: { actorId: actorProfile.userId, actionId: entry.id }
          });
          const reciprocal = store.matchActions.find(
            (item) =>
              item.userId === targetId &&
              item.targetId === userId &&
              item.action === "connected"
          );
          if (reciprocal) {
            let chat =
              store.chats.find(
                (thread) =>
                  !thread.isGroup &&
                  thread.memberIds.includes(userId) &&
                  thread.memberIds.includes(targetId)
              ) ?? null;
            if (!chat) {
              chat = {
                chatId: randomId("chat"),
                memberIds: [userId, targetId],
                isGroup: false,
                title: undefined,
                createdAt: Date.now(),
                archivedBy: [],
                hiddenBy: []
              };
              store.chats.push(chat);
            }
            match = {
              chatId: chat.chatId,
              user: targetProfile
            };
            pushNotification(provider, {
              userId,
              kind: "system",
              title: `You matched with ${targetProfile.displayName}`,
              body: "Start a conversation now.",
              link: `/messages?chat=${chat.chatId}`,
              linkLabel: "Open chat",
              secondaryLink: `/profile/${targetProfile.userId}`,
              secondaryLinkLabel: "View profile",
              metadata: { chatId: chat.chatId, otherUserId: targetProfile.userId }
            });
            pushNotification(provider, {
              userId: targetId,
              kind: "system",
              title: `You matched with ${actorProfile.displayName}`,
              body: "Start a conversation now.",
              link: `/messages?chat=${chat.chatId}`,
              linkLabel: "Open chat",
              secondaryLink: `/profile/${actorProfile.userId}`,
              secondaryLinkLabel: "View profile",
              metadata: { chatId: chat.chatId, otherUserId: actorProfile.userId }
            });
          }
        }
        return { action: entry, match };
      }
    },
    messages: {
      listChats: async ({ userId }) =>
        store.chats
          .filter((chat) => chat.memberIds.includes(userId))
          .filter((chat) => !chat.hiddenBy.includes(userId)),
      list: async ({ chatId }) => {
        const nowTs = Date.now();
        return store.messages
          .filter((msg) => msg.chatId === chatId)
          .filter((msg) => !msg.expiresAt || msg.expiresAt > nowTs)
          .sort((a, b) => a.createdAt - b.createdAt);
      },
      send: async ({ chatId, senderId, content, attachments, metadata, isSilent, scheduledFor, expiresAt }) => {
        ensureUser(store, senderId);
        const chat = store.chats.find((c) => c.chatId === chatId);
        if (!chat) {
          throw new Error("Chat not found");
        }
        if (!chat.memberIds.includes(senderId)) {
          throw new Error("Sender not part of the chat");
        }
        const createdAt = Date.now();
        const message: ChatMessage = {
          messageId: randomId("msg"),
          chatId,
          senderId,
          content,
          attachments: attachments ?? [],
          createdAt,
          updatedAt: undefined,
          deletedAt: undefined,
          deliveredTo: [...chat.memberIds],
          readBy: [senderId],
          reactions: [],
          isSilent,
          scheduledFor,
          expiresAt,
          pinned: false,
          metadata: metadata ?? {}
        };
        store.messages.push(message);
        emit({ type: "message:created", chatId, message });
        return message;
      },
      update: async ({ chatId, messageId, userId, content, metadata }) => {
        const message = store.messages.find((msg) => msg.chatId === chatId && msg.messageId === messageId);
        if (!message) {
          throw new Error("Message not found");
        }
        if (message.senderId !== userId) {
          throw new Error("Only the author can edit this message");
        }
        if (Date.now() - message.createdAt > 15 * 60 * 1000) {
          throw new Error("Edit window expired");
        }
        message.content = content;
        if (metadata) {
          message.metadata = { ...message.metadata, ...metadata };
        }
        message.updatedAt = Date.now();
        emit({ type: "message:updated", chatId, message });
        return message;
      },
      remove: async ({ chatId, messageId, userId, hardDelete }) => {
        const messageIndex = store.messages.findIndex((msg) => msg.chatId === chatId && msg.messageId === messageId);
        if (messageIndex < 0) {
          throw new Error("Message not found");
        }
        const message = store.messages[messageIndex];
        if (message.senderId !== userId) {
          throw new Error("Only the author can remove this message");
        }
        const deletedAt = Date.now();
        message.deletedAt = deletedAt;
        message.content = undefined;
        message.attachments = [];
        if (hardDelete) {
          store.messages.splice(messageIndex, 1);
        }
        emit({ type: "message:deleted", chatId, message: { ...message } });
        return message;
      },
      addReaction: async ({ chatId, messageId, userId, emoji }) => {
        ensureUser(store, userId);
        const message = store.messages.find((msg) => msg.chatId === chatId && msg.messageId === messageId);
        if (!message) {
          throw new Error("Message not found");
        }
        const existing = message.reactions.find(
          (reaction) => reaction.userId === userId && reaction.emoji === emoji
        );
        if (!existing) {
          const reaction: MessageReaction = {
            reactionId: randomId("react"),
            emoji,
            userId,
            createdAt: Date.now()
          };
          message.reactions.push(reaction);
          emit({ type: "reaction:added", chatId, messageId, reaction });
        }
        return message;
      },
      removeReaction: async ({ chatId, messageId, userId, emoji }) => {
        const message = store.messages.find((msg) => msg.chatId === chatId && msg.messageId === messageId);
        if (!message) {
          throw new Error("Message not found");
        }
        const initialLength = message.reactions.length;
        message.reactions = message.reactions.filter(
          (reaction) => !(reaction.userId === userId && reaction.emoji === emoji)
        );
        if (message.reactions.length !== initialLength) {
          emit({
            type: "reaction:removed",
            chatId,
            messageId,
            reaction: {
              reactionId: "",
              emoji,
              userId,
              createdAt: Date.now()
            }
          });
        }
        return message;
      },
      pin: async ({ chatId, messageId, pinned }) => {
        const message = store.messages.find((msg) => msg.chatId === chatId && msg.messageId === messageId);
        if (!message) {
          throw new Error("Message not found");
        }
        message.pinned = pinned;
        emit({ type: "message:pinned", chatId, message });
        return message;
      },
      markRead: async ({ chatId, messageId, userId }) => {
        const message = store.messages.find((msg) => msg.chatId === chatId && msg.messageId === messageId);
        if (!message) {
          throw new Error("Message not found");
        }
        if (!message.readBy.includes(userId)) {
          message.readBy.push(userId);
          emit({ type: "read", chatId, messageId, userId, readAt: Date.now() });
        }
      },
      typing: async ({ chatId, userId, isTyping }) => {
        ensureUser(store, userId);
        emit({
          type: "typing",
          chatId,
          userId,
          isTyping,
          expiresAt: Date.now() + 5000
        });
      },
      createChat: async ({ memberIds, isGroup, title }) => {
        memberIds.forEach((id) => ensureUser(store, id));
        const chat: Chat = {
          chatId: randomId("chat"),
          memberIds,
          isGroup,
          title,
          createdAt: Date.now(),
          archivedBy: [],
          hiddenBy: []
        };
        store.chats.push(chat);
        return chat;
      },
      archiveChat: async ({ chatId, userId, archived }) => {
        ensureUser(store, userId);
        const index = store.chats.findIndex((chat) => chat.chatId === chatId);
        if (index < 0) {
          throw new Error("Chat not found");
        }
        const chat = store.chats[index];
        if (!chat.memberIds.includes(userId)) {
          throw new Error("User not part of chat");
        }
        const archiveSet = new Set(chat.archivedBy);
        if (archived) {
          archiveSet.add(userId);
        } else {
          archiveSet.delete(userId);
        }
        const updated: Chat = { ...chat, archivedBy: Array.from(archiveSet) };
        store.chats[index] = updated;
        emit({ type: "chat:updated", chat: updated });
        return updated;
      },
      removeChat: async ({ chatId, userId }) => {
        ensureUser(store, userId);
        const index = store.chats.findIndex((chat) => chat.chatId === chatId);
        if (index < 0) {
          throw new Error("Chat not found");
        }
        const chat = store.chats[index];
        if (!chat.memberIds.includes(userId)) {
          throw new Error("User not part of chat");
        }
        if (chat.hiddenBy.includes(userId)) {
          return;
        }
        const hiddenBy = [...chat.hiddenBy, userId];
        const allHidden = chat.memberIds.every((id) => hiddenBy.includes(id));
        if (allHidden) {
          store.chats.splice(index, 1);
          store.messages = store.messages.filter((message) => message.chatId !== chatId);
          emit({ type: "chat:removed", chatId });
          return;
        }
        const updated: Chat = { ...chat, hiddenBy };
        store.chats[index] = updated;
        emit({ type: "chat:updated", chat: updated });
      },
      subscribe: (handler) => {
        const listeners = messageListeners[provider];
        listeners.add(handler);
        return () => {
          listeners.delete(handler);
        };
      }
    },
    marketplace: {
      list: async ({ tag, priceMin, priceMax }) => {
        return store.artworks.filter((art) => {
          const withinTag = tag ? art.tags.includes(tag) : true;
          const aboveMin = priceMin ? art.price >= priceMin : true;
          const belowMax = priceMax ? art.price <= priceMax : true;
          return withinTag && aboveMin && belowMax;
        });
      },
      createListing: async (input) => {
        const resolvedStatus = input.status ?? (input.isSold ? "sold" : "listed");
        const listing: Artwork = {
          ...input,
          artworkId: input.artworkId ?? randomId("art"),
          createdAt: input.createdAt ?? Date.now(),
          status: resolvedStatus,
          isSold: resolvedStatus === "sold"
        };
        store.artworks.push(listing);
        persistArtworksToStorage(provider);
        return listing;
      },
      getDashboard: async (userId) => {
        const listings = store.artworks.filter((art) => art.artistId === userId);
        const orders = store.orders.filter((order) => order.sellerId === userId);
        return { listings, orders };
      },
      updateStatus: async ({ artworkId, status }) => {
        const nextStatus: Artwork["status"] = status;
        let updated: Artwork | undefined;
        store.artworks = store.artworks.map((art) => {
          if (art.artworkId === artworkId) {
            updated = {
              ...art,
              status: nextStatus,
              isSold: nextStatus === "sold"
            };
            return updated;
          }
          return art;
        });
        if (!updated) {
          throw new Error("Listing not found");
        }
        persistArtworksToStorage(provider);
        return updated;
      },
      removeListing: async ({ artworkId }) => {
        store.artworks = store.artworks.filter((art) => art.artworkId !== artworkId);
        persistArtworksToStorage(provider);
      }
    },
    orders: {
      createPaymentIntent: async ({ artworkId, buyerId }) => {
        const artwork = store.artworks.find((art) => art.artworkId === artworkId);
        if (!artwork) {
          throw new Error("Artwork not found");
        }
        const order: Order = {
          orderId: randomId("ord"),
          artworkId,
          buyerId,
          sellerId: artwork.artistId,
          amount: artwork.price,
          currency: artwork.currency,
          status: "pending",
          stripePaymentIntentId: randomId("pi"),
          createdAt: Date.now()
        };
        store.orders.push(order);
        return {
          clientSecret: `pi_secret_${order.orderId}`,
          order
        };
      },
      confirmPayment: async ({ paymentIntentId, status }) => {
        const order = store.orders.find((o) => o.stripePaymentIntentId === paymentIntentId);
        if (!order) {
          throw new Error("Order not found");
        }
        const updated: Order = { ...order, status };
        store.orders = store.orders.map((o) => (o.orderId === updated.orderId ? updated : o));
        if (status === "paid") {
          store.artworks = store.artworks.map((art) =>
            art.artworkId === updated.artworkId
              ? { ...art, isSold: true, status: "sold" }
              : art
          );
          persistArtworksToStorage(provider);
        }
        return updated;
      }
    },
    events: {
      list: async () => [...store.events].sort((a, b) => a.startsAt - b.startsAt),
      create: async (input: CreateEventInput) => {
        const event: Event = {
          eventId: input.eventId ?? randomId("evt"),
          title: input.title,
          description: input.description,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          location: input.location,
          hostUserId: input.hostUserId,
          attendees: input.attendees ?? [],
          createdAt: input.createdAt ?? Date.now()
        };
        store.events.push(event);
        return event;
      },
      update: async ({ eventId, data }) => {
        const existing = store.events.find((event) => event.eventId === eventId);
        if (!existing) {
          throw new Error("Event not found");
        }
        const updated: Event = {
          ...existing,
          title: data.title ?? existing.title,
          description: data.description !== undefined ? data.description ?? undefined : existing.description,
          startsAt: data.startsAt ?? existing.startsAt,
          endsAt: data.endsAt !== undefined ? data.endsAt ?? undefined : existing.endsAt,
          location: data.location !== undefined ? (data.location ?? undefined) : existing.location,
          hostUserId: data.hostUserId ?? existing.hostUserId,
          attendees: data.attendees ?? existing.attendees
        };
        store.events = store.events.map((event) => (event.eventId === eventId ? updated : event));
        return updated;
      },
      remove: async ({ eventId }) => {
        store.events = store.events.filter((event) => event.eventId !== eventId);
      },
      rsvp: async ({ eventId, userId }) => {
        const event = store.events.find((evt) => evt.eventId === eventId);
        if (!event) {
          throw new Error("Event not found");
        }
        ensureUser(store, userId);
        const attendees = new Set(event.attendees);
        attendees.add(userId);
        const updated = { ...event, attendees: Array.from(attendees) };
        store.events = store.events.map((evt) => (evt.eventId === eventId ? updated : evt));
        return updated;
      }
    },
    rewards: {
      summary: async ({ userId }) => {
        const logs = store.rewards.filter((log) => log.userId === userId);
        const total = logs.reduce((acc, log) => acc + log.points, 0);
        return { total, logs };
      },
      log: async (input) => {
        const log: RewardLog = {
          ...input,
          id: input.id ?? randomId("rew"),
          createdAt: input.createdAt ?? Date.now()
        };
        store.rewards.push(log);
        return log;
      }
    },
    uploads: {
      createSignedUrl: async ({ extension }) => {
        const id = randomId("file");
        return {
          uploadUrl: `https://uploads.spheraconnect.dev/${id}.${extension}`,
          fileUrl: `https://cdn.spheraconnect.dev/${id}.${extension}`
        };
      }
    },
    profilePortfolio: {
      projects: {
        list: async (userId: string) =>
          [...store.profileProjects.filter((project) => project.userId === userId)].sort(
            (a, b) => b.createdAt - a.createdAt
          ),
        create: async (input) => {
          const project: ProfileProject = {
            projectId: input.projectId ?? randomId("proj"),
            userId: input.userId,
            title: input.title,
            summary: input.summary,
            link: input.link,
            status: input.status,
            tags: input.tags ?? [],
            year: input.year,
            createdAt: Date.now()
          };
          store.profileProjects = [project, ...store.profileProjects.filter((entry) => entry.projectId !== project.projectId)];
          return project;
        },
        update: async (projectId, data) => {
          let updated: ProfileProject | undefined;
          store.profileProjects = store.profileProjects.map((project) => {
            if (project.projectId === projectId) {
              updated = {
                ...project,
                ...data,
                summary: data.summary !== undefined ? data.summary ?? undefined : project.summary,
                link: data.link !== undefined ? data.link ?? undefined : project.link,
                status: data.status ?? project.status,
                tags: data.tags ?? project.tags,
                year: data.year ?? project.year
              };
              return updated;
            }
            return project;
          });
          if (!updated) {
            throw new Error("Project not found");
          }
          return updated;
        },
        remove: async (projectId) => {
          store.profileProjects = store.profileProjects.filter((project) => project.projectId !== projectId);
          store.profileMedia = store.profileMedia.filter((media) => media.projectId !== projectId);
        }
      },
      media: {
        list: async (userId: string) =>
          [...store.profileMedia.filter((media) => media.userId === userId)].sort((a, b) => b.createdAt - a.createdAt),
        create: async (input) => {
          const media: ProfileMedia = {
            mediaId: input.mediaId ?? randomId("media"),
            userId: input.userId,
            projectId: input.projectId ?? undefined,
            type: input.type,
            title: input.title,
            description: input.description,
            url: input.url,
            thumbnailUrl: input.thumbnailUrl,
            tags: input.tags ?? [],
            createdAt: Date.now()
          };
          store.profileMedia = [media, ...store.profileMedia.filter((entry) => entry.mediaId !== media.mediaId)];
          return media;
        },
        update: async (mediaId, data) => {
          let updated: ProfileMedia | undefined;
          store.profileMedia = store.profileMedia.map((media) => {
            if (media.mediaId === mediaId) {
              updated = {
                ...media,
                ...data,
                projectId: data.projectId !== undefined ? data.projectId ?? undefined : media.projectId,
                title: data.title !== undefined ? data.title ?? undefined : media.title,
                description: data.description !== undefined ? data.description ?? undefined : media.description,
                thumbnailUrl: data.thumbnailUrl !== undefined ? data.thumbnailUrl ?? undefined : media.thumbnailUrl,
                tags: data.tags ?? media.tags
              };
              return updated;
            }
            return media;
          });
          if (!updated) {
            throw new Error("Media not found");
          }
          return updated;
        },
        remove: async (mediaId) => {
          store.profileMedia = store.profileMedia.filter((media) => media.mediaId !== mediaId);
        }
      },
      socials: {
        list: async (userId: string) =>
          [...store.profileSocials.filter((social) => social.userId === userId)].sort(
            (a, b) => b.createdAt - a.createdAt
          ),
        create: async (input) => {
          const social: ProfileSocialLink = {
            socialId: input.socialId ?? randomId("social"),
            userId: input.userId,
            platform: input.platform,
            handle: input.handle,
            url: input.url,
            createdAt: Date.now()
          };
          store.profileSocials = [social, ...store.profileSocials.filter((entry) => entry.socialId !== social.socialId)];
          return social;
        },
        update: async (socialId, data) => {
          let updated: ProfileSocialLink | undefined;
          store.profileSocials = store.profileSocials.map((social) => {
            if (social.socialId === socialId) {
              updated = {
                ...social,
                ...data,
                handle: data.handle !== undefined ? data.handle ?? undefined : social.handle,
                url: data.url !== undefined ? data.url ?? undefined : social.url
              };
              return updated;
            }
            return social;
          });
          if (!updated) {
            throw new Error("Social link not found");
          }
          return updated;
        },
        remove: async (socialId) => {
          store.profileSocials = store.profileSocials.filter((social) => social.socialId !== socialId);
        }
      }
    },
    orderMilestones: {
      milestones: {
        list: async (orderId: string) =>
          store.orderMilestones.filter((milestone) => milestone.orderId === orderId).sort((a, b) => a.createdAt - b.createdAt),
        create: async (input) => {
          const milestone: OrderMilestone = {
            milestoneId: input.milestoneId ?? randomId("milestone"),
            orderId: input.orderId,
            title: input.title,
            amount: input.amount,
            dueDate: input.dueDate,
            status: input.status ?? "pending",
            createdAt: Date.now(),
            updatedAt: undefined
          };
          store.orderMilestones = [milestone, ...store.orderMilestones.filter((entry) => entry.milestoneId !== milestone.milestoneId)];
          return milestone;
        },
        update: async (milestoneId, data) => {
          let updated: OrderMilestone | undefined;
          store.orderMilestones = store.orderMilestones.map((milestone) => {
            if (milestone.milestoneId === milestoneId) {
              updated = {
                ...milestone,
                ...data,
                dueDate: data.dueDate !== undefined ? data.dueDate ?? undefined : milestone.dueDate,
                updatedAt: Date.now()
              };
              return updated;
            }
            return milestone;
          });
          if (!updated) {
            throw new Error("Milestone not found");
          }
          return updated;
        }
      },
      payouts: {
        list: async (orderId: string) =>
          store.payouts.filter((payout) => payout.orderId === orderId).sort((a, b) => b.createdAt - a.createdAt),
        create: async (input) => {
          const payout: Payout = {
            payoutId: input.payoutId ?? randomId("payout"),
            orderId: input.orderId,
            milestoneId: input.milestoneId ?? undefined,
            payeeId: input.payeeId,
            amount: input.amount,
            currency: input.currency ?? "usd",
            status: input.status ?? "initiated",
            metadata: input.metadata,
            createdAt: Date.now()
          };
          store.payouts = [payout, ...store.payouts.filter((entry) => entry.payoutId !== payout.payoutId)];
          return payout;
        },
        update: async (payoutId, data) => {
          let updated: Payout | undefined;
          store.payouts = store.payouts.map((payout) => {
            if (payout.payoutId === payoutId) {
              updated = {
                ...payout,
                ...data,
                milestoneId: data.milestoneId !== undefined ? data.milestoneId ?? undefined : payout.milestoneId,
                metadata: data.metadata !== undefined ? data.metadata ?? undefined : payout.metadata
              };
              return updated;
            }
            return payout;
          });
          if (!updated) {
            throw new Error("Payout not found");
          }
          return updated;
        }
      }
    },
    notifications: {
      list: async ({ userId, since, limit = 50 }) =>
        [...store.notifications.filter((entry) => entry.userId === userId)]
          .filter((entry) => (since ? entry.createdAt >= since : true))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, limit),
      create: async (entry) => {
        const notification: NotificationEntry = {
          notificationId: entry.notificationId ?? randomId("notif"),
          userId: entry.userId,
          kind: entry.kind ?? "system",
          title: entry.title,
          body: entry.body,
          link: entry.link,
          linkLabel: entry.linkLabel,
          secondaryLink: entry.secondaryLink,
          secondaryLinkLabel: entry.secondaryLinkLabel,
          metadata: entry.metadata,
          createdAt: entry.createdAt ?? Date.now(),
          readAt: entry.readAt ?? undefined
        };
        store.notifications = [notification, ...store.notifications.filter((item) => item.notificationId !== notification.notificationId)];
        return notification;
      },
      markRead: async ({ userId, ids, read }) => {
        store.notifications = store.notifications.map((entry) => {
          if (entry.userId !== userId) return entry;
          if (ids?.length && !ids.includes(entry.notificationId)) return entry;
          return {
            ...entry,
            readAt: read ? Date.now() : undefined
          };
        });
      }
    },
    adminQueues: {
      verification: {
        submit: async (input) => {
          const request: VerificationRequest = {
            requestId: input.requestId ?? randomId("verify"),
            userId: input.userId,
            portfolioUrl: input.portfolioUrl,
            statement: input.statement,
            status: "pending",
            reviewerId: undefined,
            reviewedAt: undefined,
            notes: undefined,
            createdAt: Date.now()
          };
          store.verificationRequests = [request, ...store.verificationRequests.filter((entry) => entry.requestId !== request.requestId)];
          return request;
        },
        list: async (input) =>
          store.verificationRequests
            .filter((entry) => (input?.status ? entry.status === input.status : true))
            .sort((a, b) => b.createdAt - a.createdAt),
        update: async (requestId, data) => {
          let updated: VerificationRequest | undefined;
          store.verificationRequests = store.verificationRequests.map((entry) => {
            if (entry.requestId === requestId) {
              updated = {
                ...entry,
                ...data,
                portfolioUrl: data.portfolioUrl !== undefined ? data.portfolioUrl ?? undefined : entry.portfolioUrl,
                statement: data.statement !== undefined ? data.statement ?? undefined : entry.statement,
                reviewerId: data.reviewerId !== undefined ? data.reviewerId ?? undefined : entry.reviewerId,
                reviewedAt: data.reviewedAt ?? entry.reviewedAt,
                notes: data.notes !== undefined ? data.notes ?? undefined : entry.notes,
                status: data.status ?? entry.status
              };
              return updated;
            }
            return entry;
          });
          if (!updated) {
            throw new Error("Verification request not found");
          }
          return updated;
        }
      },
      moderation: {
        report: async (input) => {
          const report: ModerationQueueItem = {
            queueId: input.queueId ?? randomId("moderation"),
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            reportedBy: input.reportedBy,
            reason: input.reason,
            status: "open",
            reviewerId: undefined,
            reviewedAt: undefined,
            resolution: undefined,
            createdAt: Date.now()
          };
          store.moderationQueue = [report, ...store.moderationQueue.filter((entry) => entry.queueId !== report.queueId)];
          return report;
        },
        list: async (input) =>
          store.moderationQueue
            .filter((entry) => (input?.status ? entry.status === input.status : true))
            .sort((a, b) => b.createdAt - a.createdAt),
        resolve: async (queueId, data) => {
          let updated: ModerationQueueItem | undefined;
          store.moderationQueue = store.moderationQueue.map((entry) => {
            if (entry.queueId === queueId) {
              updated = {
                ...entry,
                ...data,
                reviewerId: data.reviewerId !== undefined ? data.reviewerId ?? undefined : entry.reviewerId,
                reviewedAt: data.reviewedAt ?? entry.reviewedAt,
                resolution: data.resolution !== undefined ? data.resolution ?? undefined : entry.resolution,
                status: data.status ?? entry.status
              };
              return updated;
            }
            return entry;
          });
          if (!updated) {
            throw new Error("Moderation record not found");
          }
          return updated;
        }
      },
      support: {
        submit: async (input) => {
          const ticket: SupportTicket = {
            ticketId: input.ticketId ?? randomId("ticket"),
            userId: input.userId,
            subject: input.subject,
            body: input.body,
            status: "open",
            assignedTo: undefined,
            createdAt: Date.now(),
            updatedAt: undefined
          };
          store.supportTickets = [ticket, ...store.supportTickets.filter((entry) => entry.ticketId !== ticket.ticketId)];
          return ticket;
        },
        list: async (input) =>
          store.supportTickets
            .filter((entry) => (input?.status ? entry.status === input.status : true))
            .sort((a, b) => b.createdAt - a.createdAt),
        update: async (ticketId, data) => {
          let updated: SupportTicket | undefined;
          store.supportTickets = store.supportTickets.map((entry) => {
            if (entry.ticketId === ticketId) {
              updated = {
                ...entry,
                ...data,
                body: data.body !== undefined ? data.body ?? undefined : entry.body,
                assignedTo: data.assignedTo !== undefined ? data.assignedTo ?? undefined : entry.assignedTo,
                status: data.status ?? entry.status,
                updatedAt: Date.now()
              };
              return updated;
            }
            return entry;
          });
          if (!updated) {
            throw new Error("Support ticket not found");
          }
          return updated;
        }
      }
    }
  };
};
