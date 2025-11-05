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
  verifiedAdminId
} from "./sample-data";
import type {
  Artwork,
  Chat,
  ChatMessage,
  Checkin,
  Event,
  Hub,
  MatchSuggestion,
  MessageEvent,
  MessageReaction,
  Order,
  RewardLog,
  User
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
    session: null
  }
};

const randomId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const messageListeners: Record<"firebase" | "supabase", Set<(event: MessageEvent) => void>> = {
  firebase: new Set(),
  supabase: new Set()
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
        return checkin;
      },
      listActive: async () => {
        const nowTs = Date.now();
        store.checkins = store.checkins.filter((chk) => chk.expiresAt > nowTs);
        return [...store.checkins];
      }
    },
    matches: {
      suggest: async ({ userId }) => {
        const user = ensureUser(store, userId);
        return buildMatchSuggestions(user, store.users, store.hubs);
      }
    },
    messages: {
      listChats: async ({ userId }) => store.chats.filter((chat) => chat.memberIds.includes(userId)),
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
          createdAt: Date.now()
        };
        store.chats.push(chat);
        return chat;
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
        const listing: Artwork = {
          ...input,
          artworkId: input.artworkId ?? randomId("art"),
          createdAt: input.createdAt ?? Date.now(),
          isSold: input.isSold ?? false
        };
        store.artworks.push(listing);
        return listing;
      },
      getDashboard: async (userId) => {
        const listings = store.artworks.filter((art) => art.artistId === userId);
        const orders = store.orders.filter((order) => order.sellerId === userId);
        return { listings, orders };
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
            art.artworkId === updated.artworkId ? { ...art, isSold: true } : art
          );
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
    }
  };
};
