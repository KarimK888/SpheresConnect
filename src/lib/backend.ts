import { createFirebaseBackend } from "./firebase";
import { createSupabaseBackend } from "./supabase";
import type {
  Artwork,
  Chat,
  ChatMessage,
  Checkin,
  Event,
  Hub,
  MatchAction,
  MatchActionResult,
  MatchLikeAlert,
  MatchSuggestion,
  MessageEvent,
  Order,
  OrderMilestone,
  Payout,
  ProfileMedia,
  ProfileProject,
  ProfileSocialLink,
  RewardLog,
  NotificationEntry,
  VerificationRequest,
  ModerationQueueItem,
  SupportTicket,
  User
} from "./types";

export interface AuthSession {
  token: string;
  user: User;
}

export interface BackendAuth {
  signup: (input: { email: string; password: string }) => Promise<AuthSession>;
  login: (input: { email: string; password: string }) => Promise<AuthSession>;
  oauth: (input: { provider: "google" | "apple" | "linkedin"; token: string }) => Promise<AuthSession>;
  getSession: () => Promise<AuthSession | null>;
  logout: () => Promise<void>;
}

export interface BackendUsers {
  list: (input: { query?: string }) => Promise<User[]>;
  get: (id: string) => Promise<User | null>;
  update: (id: string, input: Partial<User>) => Promise<User>;
  requestVerification: (id: string) => Promise<{ submitted: boolean }>;
  verify: (id: string) => Promise<User>;
}

export interface BackendHubs {
  list: () => Promise<Hub[]>;
}

export interface BackendCheckins {
  create: (input: { userId: string; hubId?: string; location: { lat: number; lng: number }; status: "online" | "offline" }) => Promise<Checkin>;
  listActive: (input: { near?: { lat: number; lng: number } }) => Promise<Checkin[]>;
}

export interface BackendMatches {
  suggest: (input: { userId: string }) => Promise<MatchSuggestion[]>;
  history: (input: { userId: string }) => Promise<MatchAction[]>;
  incomingLikes: (input: { userId: string }) => Promise<MatchLikeAlert[]>;
  recordAction: (input: {
    userId: string;
    targetId: string;
    action: MatchAction["action"];
    createdAt?: number;
  }) => Promise<MatchActionResult>;
}

export interface BackendMessages {
  listChats: (input: { userId: string }) => Promise<Chat[]>;
  list: (input: { chatId: string }) => Promise<ChatMessage[]>;
  send: (input: {
    chatId: string;
    senderId: string;
    content?: string;
    attachments?: ChatMessage["attachments"];
    metadata?: ChatMessage["metadata"];
    isSilent?: boolean;
    scheduledFor?: number;
    expiresAt?: number;
  }) => Promise<ChatMessage>;
  update: (input: {
    chatId: string;
    messageId: string;
    userId: string;
    content?: string;
    metadata?: ChatMessage["metadata"];
  }) => Promise<ChatMessage>;
  remove: (input: { chatId: string; messageId: string; userId: string; hardDelete?: boolean }) => Promise<ChatMessage>;
  addReaction: (input: { chatId: string; messageId: string; userId: string; emoji: string }) => Promise<ChatMessage>;
  removeReaction: (input: { chatId: string; messageId: string; userId: string; emoji: string }) => Promise<ChatMessage>;
  pin: (input: { chatId: string; messageId: string; pinned: boolean; userId: string }) => Promise<ChatMessage>;
  markRead: (input: { chatId: string; messageId: string; userId: string }) => Promise<void>;
  typing: (input: { chatId: string; userId: string; isTyping: boolean }) => Promise<void>;
  createChat: (input: { memberIds: string[]; isGroup: boolean; title?: string }) => Promise<Chat>;
  archiveChat: (input: { chatId: string; userId: string; archived: boolean }) => Promise<Chat>;
  removeChat: (input: { chatId: string; userId: string }) => Promise<void>;
  subscribe: (handler: (event: MessageEvent) => void) => () => void;
}

export interface BackendMarketplace {
  list: (input: { tag?: string; priceMin?: number; priceMax?: number }) => Promise<Artwork[]>;
  createListing: (input: Artwork) => Promise<Artwork>;
  getDashboard: (userId: string) => Promise<{ listings: Artwork[]; orders: Order[] }>;
  updateStatus: (input: { artworkId: string; status: Artwork["status"] }) => Promise<Artwork>;
  removeListing: (input: { artworkId: string }) => Promise<void>;
}

export interface BackendOrders {
  createPaymentIntent: (input: { artworkId: string; buyerId: string }) => Promise<{ clientSecret: string; order: Order }>;
  confirmPayment: (input: { paymentIntentId: string; status: Order["status"] }) => Promise<Order>;
}

export type CreateEventInput = {
  eventId?: string;
  title: string;
  description?: string;
  startsAt: number;
  endsAt?: number;
  location?: Event["location"];
  hostUserId: string;
  attendees?: string[];
  createdAt?: number;
};

export interface BackendEvents {
  list: () => Promise<Event[]>;
  create: (input: CreateEventInput) => Promise<Event>;
  update: (input: { eventId: string; data: Partial<Omit<CreateEventInput, "eventId" | "hostUserId">> & { hostUserId?: string } }) => Promise<Event>;
  remove: (input: { eventId: string }) => Promise<void>;
  rsvp: (input: { eventId: string; userId: string }) => Promise<Event>;
}

export interface BackendRewards {
  summary: (input: { userId: string }) => Promise<{ total: number; logs: RewardLog[] }>;
  log: (input: RewardLog) => Promise<RewardLog>;
}

export interface BackendProfilePortfolio {
  projects: {
    list: (userId: string) => Promise<ProfileProject[]>;
    create: (input: Omit<ProfileProject, "projectId" | "createdAt"> & { projectId?: string }) => Promise<ProfileProject>;
    update: (projectId: string, data: Partial<Omit<ProfileProject, "projectId" | "userId" | "createdAt">>) => Promise<ProfileProject>;
    remove: (projectId: string) => Promise<void>;
  };
  media: {
    list: (userId: string) => Promise<ProfileMedia[]>;
    create: (input: Omit<ProfileMedia, "mediaId" | "createdAt"> & { mediaId?: string }) => Promise<ProfileMedia>;
    update: (mediaId: string, data: Partial<Omit<ProfileMedia, "mediaId" | "userId" | "createdAt">>) => Promise<ProfileMedia>;
    remove: (mediaId: string) => Promise<void>;
  };
  socials: {
    list: (userId: string) => Promise<ProfileSocialLink[]>;
    create: (input: Omit<ProfileSocialLink, "socialId" | "createdAt"> & { socialId?: string }) => Promise<ProfileSocialLink>;
    update: (socialId: string, data: Partial<Omit<ProfileSocialLink, "socialId" | "userId" | "createdAt">>) => Promise<ProfileSocialLink>;
    remove: (socialId: string) => Promise<void>;
  };
}

export interface BackendOrderMilestones {
  milestones: {
    list: (orderId: string) => Promise<OrderMilestone[]>;
    create: (input: Omit<OrderMilestone, "milestoneId" | "createdAt" | "updatedAt"> & { milestoneId?: string }) => Promise<OrderMilestone>;
    update: (milestoneId: string, data: Partial<Omit<OrderMilestone, "milestoneId" | "orderId">>) => Promise<OrderMilestone>;
  };
  payouts: {
    list: (orderId: string) => Promise<Payout[]>;
    create: (input: Omit<Payout, "payoutId" | "createdAt"> & { payoutId?: string }) => Promise<Payout>;
    update: (payoutId: string, data: Partial<Omit<Payout, "payoutId" | "createdAt">>) => Promise<Payout>;
  };
}

export interface BackendNotifications {
  list: (input: { userId: string; since?: number; limit?: number }) => Promise<NotificationEntry[]>;
  create: (entry: Omit<NotificationEntry, "notificationId" | "createdAt" | "readAt"> & { notificationId?: string; createdAt?: number }) => Promise<NotificationEntry>;
  markRead: (input: { userId: string; ids?: string[]; read: boolean }) => Promise<void>;
}

export interface BackendAdminQueues {
  verification: {
    submit: (input: Omit<VerificationRequest, "requestId" | "status" | "reviewerId" | "reviewedAt" | "createdAt"> & { requestId?: string }) => Promise<VerificationRequest>;
    list: (input?: { status?: VerificationRequest["status"] }) => Promise<VerificationRequest[]>;
    update: (requestId: string, data: Partial<Omit<VerificationRequest, "requestId" | "userId" | "createdAt">>) => Promise<VerificationRequest>;
  };
  moderation: {
    report: (input: Omit<ModerationQueueItem, "queueId" | "status" | "reviewerId" | "reviewedAt" | "resolution" | "createdAt"> & { queueId?: string }) => Promise<ModerationQueueItem>;
    list: (input?: { status?: ModerationQueueItem["status"] }) => Promise<ModerationQueueItem[]>;
    resolve: (queueId: string, data: Partial<Omit<ModerationQueueItem, "queueId" | "createdAt" | "resourceType" | "resourceId">>) => Promise<ModerationQueueItem>;
  };
  support: {
    submit: (input: Omit<SupportTicket, "ticketId" | "status" | "assignedTo" | "createdAt" | "updatedAt"> & { ticketId?: string }) => Promise<SupportTicket>;
    list: (input?: { status?: SupportTicket["status"] }) => Promise<SupportTicket[]>;
    update: (ticketId: string, data: Partial<Omit<SupportTicket, "ticketId" | "userId" | "createdAt">>) => Promise<SupportTicket>;
  };
}

export type SignedUploadTarget = {
  uploadUrl: string;
  fileUrl: string;
  method?: "PUT" | "POST";
  headers?: Record<string, string>;
  formFields?: Record<string, string>;
  fileField?: string;
};

export interface BackendUploads {
  createSignedUrl: (input: { mimeType: string; extension: string }) => Promise<SignedUploadTarget>;
}

export interface BackendAdapter {
  auth: BackendAuth;
  users: BackendUsers;
  hubs: BackendHubs;
  checkins: BackendCheckins;
  matches: BackendMatches;
  messages: BackendMessages;
  marketplace: BackendMarketplace;
  orders: BackendOrders;
  events: BackendEvents;
  rewards: BackendRewards;
  uploads: BackendUploads;
  profilePortfolio: BackendProfilePortfolio;
  orderMilestones: BackendOrderMilestones;
  notifications: BackendNotifications;
  adminQueues: BackendAdminQueues;
  provider: "firebase" | "supabase";
}

let cachedBackend: BackendAdapter | null = null;

const createBackend = (): BackendAdapter => {
  const provider = (process.env.NEXT_PUBLIC_BACKEND ?? "fire").toLowerCase();
  if (provider === "supabase") {
    return createSupabaseBackend();
  }
  return createFirebaseBackend();
};

export const getBackend = (): BackendAdapter => {
  if (!cachedBackend) {
    cachedBackend = createBackend();
  }
  return cachedBackend;
};

export const resetBackend = () => {
  cachedBackend = null;
};
