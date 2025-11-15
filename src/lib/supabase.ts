import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";
import type { BackendAdapter, AuthSession, CreateEventInput } from "./backend";
import type { Database, ChatAttachmentPayload } from "./supabase-database";
import { sendHubPresenceEmail, sendOrderReceiptEmail } from "./mail";
import { sendTransactionalSms } from "./sms";
import type {
  Chat,
  Hub,
  ChatMessage,
  MatchAction,
  MatchActionResult,
  MatchLikeAlert,
  MatchSuggestion,
  MessageEvent,
  MessageReaction,
  User,
  Artwork,
  Order,
  Event,
  Checkin,
  RewardLog,
  ProfileProject,
  ProfileMedia,
  ProfileSocialLink,
  OrderMilestone,
  Payout,
  NotificationEntry,
  VerificationRequest,
  ModerationQueueItem,
  SupportTicket,
  HelpUser,
  HelpRequest,
  HelpOffer,
  HelpChat,
  HelpMessage,
  HelpRating,
  HelpVerificationRecord,
  HelpModerationLog,
  ProductivityBoard,
  ProductivityColumn,
  ProductivityCard,
  ProductivityTodo,
  ProductivityCalendarEvent,
  ProductivityComment
} from "./types";
import {
  sampleHubs,
  sampleArtworks,
  sampleOrders,
  sampleEvents,
  sampleUsers,
  sampleCheckins,
  sampleRewardLogs,
  sampleMatchActions,
  sampleHelpUsers,
  sampleHelpRequests,
  sampleHelpOffers,
  sampleHelpChats,
  sampleHelpMessages,
  sampleHelpRatings,
  sampleHelpVerifications,
  sampleHelpModerationLogs,
  sampleProductivityBoards,
  sampleProductivityColumns,
  sampleProductivityCards,
  sampleProductivityTodos,
  sampleProductivityEvents,
  sampleProductivityComments
} from "./sample-data";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isServerRuntime = typeof window === "undefined";
const isClientRuntime = !isServerRuntime;
const SUPABASE_SERVICE_ROLE_KEY: string | null = isServerRuntime
  ? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? null
  : null;
const SUPABASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? "artwork-media";
const SITE_BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
const HUB_PRESENCE_THRESHOLD =
  Number(process.env.HUB_PRESENCE_THRESHOLD ?? process.env.NEXT_PUBLIC_HUB_PRESENCE_THRESHOLD ?? "8") || 0;
const HUB_PRESENCE_ALERT_COOLDOWN_MS =
  Number(process.env.HUB_PRESENCE_ALERT_COOLDOWN_MS ?? 15 * 60 * 1000) || 15 * 60 * 1000;
const HUB_PRESENCE_ALERT_MAX_RECIPIENTS =
  Number(process.env.HUB_PRESENCE_ALERT_MAX_RECIPIENTS ?? 25) || 25;
const hubPresenceAlertState = new Map<string, { timestamp: number; count: number }>();

const buildQueryString = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

const buildAbsoluteUrl = (path: string) => {
  if (!SITE_BASE_URL) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_BASE_URL}${normalizedPath}`;
};

const fetchFromApi = async <T>(path: string, init?: RequestInit) => {
  if (!isClientRuntime) {
    throw new Error("fetchFromApi is only available in the browser runtime.");
  }
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
};

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

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: authOptions
  });
  const admin =
    SUPABASE_SERVICE_ROLE_KEY && isServerRuntime
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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
let fallbackArtworks = [...sampleArtworks];
let fallbackOrders = [...sampleOrders];
let fallbackRewards = [...sampleRewardLogs];
let fallbackMatchActions = [...sampleMatchActions];
let fallbackProfileProjects: ProfileProject[] = [];
let fallbackProfileMedia: ProfileMedia[] = [];
let fallbackProfileSocials: ProfileSocialLink[] = [];
let fallbackOrderMilestones: OrderMilestone[] = [];
let fallbackPayouts: Payout[] = [];
let fallbackNotifications: NotificationEntry[] = [];
let fallbackVerificationRequests: VerificationRequest[] = [];
let fallbackModerationQueue: ModerationQueueItem[] = [];
let fallbackSupportTickets: SupportTicket[] = [];
let fallbackHelpUsers: HelpUser[] = [...sampleHelpUsers];
let fallbackHelpRequests: HelpRequest[] = [...sampleHelpRequests];
let fallbackHelpOffers: HelpOffer[] = [...sampleHelpOffers];
let fallbackHelpChats: HelpChat[] = [...sampleHelpChats];
let fallbackHelpMessages: HelpMessage[] = [...sampleHelpMessages];
let fallbackHelpRatings: HelpRating[] = [...sampleHelpRatings];
let fallbackHelpVerifications: HelpVerificationRecord[] = [...sampleHelpVerifications];
let fallbackHelpModerationLogs: HelpModerationLog[] = [...sampleHelpModerationLogs];
let fallbackProductivityBoards: ProductivityBoard[] = [...sampleProductivityBoards];
let fallbackProductivityColumns: ProductivityColumn[] = [...sampleProductivityColumns];
let fallbackProductivityCards: ProductivityCard[] = [...sampleProductivityCards];
let fallbackProductivityTodos: ProductivityTodo[] = [...sampleProductivityTodos];
let fallbackProductivityEvents: ProductivityCalendarEvent[] = [...sampleProductivityEvents];
let fallbackProductivityComments: ProductivityComment[] = [...sampleProductivityComments];
const LIKE_HISTORY_WINDOW_MS = 1000 * 60 * 60 * 24 * 3;
const mergeById = <T>(collection: T[], updates: T[], getId: (item: T) => string): T[] => {
  if (!updates.length) {
    return collection;
  }
  const identifiers = new Set(updates.map(getId));
  return [...collection.filter((item) => !identifiers.has(getId(item))), ...updates];
};

const CHECKIN_TTL_MS = 1000 * 60 * 60 * 4;
const STATUS_TAG_PREFIX = "__status:";

const decodeStatusFromTags = (tags: string[]): { cleanTags: string[]; status: Artwork["status"] } => {
  let derived: Artwork["status"] | null = null;
  const cleanTags = tags.filter((tag) => {
    if (tag.startsWith(STATUS_TAG_PREFIX)) {
      const value = tag.slice(STATUS_TAG_PREFIX.length) as Artwork["status"];
      if (value === "listed" || value === "negotiation" || value === "sold") {
        derived = value;
      }
      return false;
    }
    return true;
  });
  return { cleanTags, status: derived ?? "listed" };
};

const encodeTagsWithStatus = (tags: string[], status: Artwork["status"]) => {
  const base = tags.filter((tag) => !tag.startsWith(STATUS_TAG_PREFIX));
  return [...base, `${STATUS_TAG_PREFIX}${status}`];
};

const getRewardSummaryForUser = (userId: string) => {
  const logs = fallbackRewards
    .filter((log) => log.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
  const total = logs.reduce((sum, log) => sum + log.points, 0);
  return { total, logs };
};

const getFallbackUser = (userId: string) => sampleUsers.find((user) => user.userId === userId) ?? null;

const fetchUserById = async (userId: string): Promise<User | null> => {
  if (!userId) return null;
  if (!clients) {
    return getFallbackUser(userId);
  }
  try {
    const { admin } = clients;
    const { data, error } = await admin.from("users").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!data) {
      return getFallbackUser(userId);
    }
    return mapUserRow(data);
  } catch (error) {
    console.warn("[supabase] fetchUserById fallback:", error instanceof Error ? error.message : error);
    return getFallbackUser(userId);
  }
};

const mapMatchActionRow = (row: Database["public"]["Tables"]["match_actions"]["Row"]): MatchAction => ({
  id: row.id,
  userId: row.user_id,
  targetId: row.target_id,
  action: (row.action as MatchAction["action"]) ?? "connected",
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const getFallbackMatchHistory = (userId: string) =>
  fallbackMatchActions.filter((entry) => entry.userId === userId).sort((a, b) => b.createdAt - a.createdAt);

const upsertFallbackMatchAction = (entry: MatchAction) => {
  fallbackMatchActions = [
    entry,
    ...fallbackMatchActions.filter((current) => current.userId !== entry.userId || current.targetId !== entry.targetId)
  ];
};

const getFallbackIncomingLikes = (userId: string): MatchLikeAlert[] =>
  fallbackMatchActions
    .filter((entry) => entry.targetId === userId && entry.action === "connected")
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((entry) => {
      const from = getFallbackUser(entry.userId) ?? sampleUsers[0];
      const isMutual = fallbackMatchActions.some(
        (candidate) =>
          candidate.userId === userId && candidate.targetId === entry.userId && candidate.action === "connected"
      );
      return { action: entry, from, isMutual };
    });

const mapProfileProjectRow = (row: Database["public"]["Tables"]["profile_projects"]["Row"]): ProfileProject => ({
  projectId: row.project_id,
  userId: row.user_id,
  title: row.title,
  summary: row.summary ?? undefined,
  link: row.link ?? undefined,
  status: (row.status as ProfileProject["status"]) ?? undefined,
  tags: row.tags ?? [],
  year: row.year ?? undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const mapProfileMediaRow = (row: Database["public"]["Tables"]["profile_media"]["Row"]): ProfileMedia => ({
  mediaId: row.media_id,
  userId: row.user_id,
  projectId: row.project_id ?? undefined,
  type: row.type as ProfileMedia["type"],
  title: row.title ?? undefined,
  description: row.description ?? undefined,
  url: row.url,
  thumbnailUrl: row.thumbnail_url ?? undefined,
  tags: row.tags ?? [],
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const mapProfileSocialRow = (row: Database["public"]["Tables"]["profile_socials"]["Row"]): ProfileSocialLink => ({
  socialId: row.social_id,
  userId: row.user_id,
  platform: row.platform,
  handle: row.handle ?? undefined,
  url: row.url ?? undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const mapOrderMilestoneRow = (row: Database["public"]["Tables"]["order_milestones"]["Row"]): OrderMilestone => ({
  milestoneId: row.milestone_id,
  orderId: row.order_id,
  title: row.title,
  amount: Number(row.amount ?? 0),
  dueDate: row.due_date ? new Date(row.due_date).getTime() : undefined,
  status: (row.status as OrderMilestone["status"]) ?? "pending",
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
});

const mapPayoutRow = (row: Database["public"]["Tables"]["payouts"]["Row"]): Payout => ({
  payoutId: row.payout_id,
  orderId: row.order_id,
  milestoneId: row.milestone_id ?? undefined,
  payeeId: row.payee_id,
  amount: Number(row.amount ?? 0),
  currency: row.currency ?? "usd",
  status: (row.status as Payout["status"]) ?? "initiated",
  metadata: (row.metadata as Record<string, unknown>) ?? undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const mapNotificationRow = (row: Database["public"]["Tables"]["notifications"]["Row"]): NotificationEntry => ({
  notificationId: row.notification_id,
  userId: row.user_id,
  kind: row.kind ?? "system",
  title: row.title,
  body: row.body ?? undefined,
  link: row.link ?? undefined,
  linkLabel: row.link_label ?? undefined,
  secondaryLink: row.secondary_link ?? undefined,
  secondaryLinkLabel: row.secondary_link_label ?? undefined,
  metadata: (row.metadata as Record<string, unknown>) ?? undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  readAt: row.read_at ? new Date(row.read_at).getTime() : undefined
});

const mapVerificationRequestRow = (
  row: Database["public"]["Tables"]["verification_requests"]["Row"]
): VerificationRequest => ({
  requestId: row.request_id,
  userId: row.user_id,
  portfolioUrl: row.portfolio_url ?? undefined,
  statement: row.statement ?? undefined,
  status: row.status ?? "pending",
  reviewerId: row.reviewer_id ?? undefined,
  reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : undefined,
  notes: row.notes ?? undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const mapModerationQueueRow = (
  row: Database["public"]["Tables"]["moderation_queue"]["Row"]
): ModerationQueueItem => ({
  queueId: row.queue_id,
  resourceType: row.resource_type,
  resourceId: row.resource_id,
  reportedBy: row.reported_by ?? undefined,
  reason: row.reason ?? undefined,
  status: row.status ?? "open",
  reviewerId: row.reviewer_id ?? undefined,
  reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : undefined,
  resolution: row.resolution ?? undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const mapSupportTicketRow = (row: Database["public"]["Tables"]["support_tickets"]["Row"]): SupportTicket => ({
  ticketId: row.ticket_id,
  userId: row.user_id ?? undefined,
  subject: row.subject,
  body: row.body ?? undefined,
  status: row.status ?? "open",
  assignedTo: row.assigned_to ?? undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
});

const mapProductivityBoardRow = (row: Database["public"]["Tables"]["productivity_boards"]["Row"]): ProductivityBoard => ({
  boardId: row.board_id,
  userId: row.user_id,
  title: row.title,
  description: row.description ?? undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const mapProductivityColumnRow = (
  row: Database["public"]["Tables"]["productivity_columns"]["Row"]
): ProductivityColumn => ({
  columnId: row.column_id,
  boardId: row.board_id,
  title: row.title,
  position: row.position,
  color: row.color ?? undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const mapProductivityCardRow = (row: Database["public"]["Tables"]["productivity_cards"]["Row"]): ProductivityCard => ({
  cardId: row.card_id,
  columnId: row.column_id,
  title: row.title,
  description: row.description ?? undefined,
  labels: row.labels ?? [],
  dueDate: row.due_date ? new Date(row.due_date).getTime() : undefined,
  assignees: row.assignees ?? [],
  metadata: row.metadata ?? undefined,
  position: row.position,
  priority: (row.priority as ProductivityCard["priority"]) ?? "medium",
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const mapProductivityTodoRow = (row: Database["public"]["Tables"]["productivity_todos"]["Row"]): ProductivityTodo => ({
  todoId: row.todo_id,
  userId: row.user_id,
  title: row.title,
  completed: row.completed ?? false,
  dueDate: row.due_date ? new Date(row.due_date).getTime() : undefined,
  tags: row.tags ?? [],
  priority: (row.priority as ProductivityTodo["priority"]) ?? "medium",
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const mapProductivityEventRow = (
  row: Database["public"]["Tables"]["productivity_events"]["Row"]
): ProductivityCalendarEvent => ({
  eventId: row.event_id,
  userId: row.user_id,
  title: row.title,
  description: row.description ?? undefined,
  startAt: row.start_at ? new Date(row.start_at).getTime() : Date.now(),
  endAt: row.end_at ? new Date(row.end_at).getTime() : undefined,
  location: row.location ?? undefined,
  color: row.color ?? undefined,
  metadata: row.metadata ?? undefined,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const mapProductivityCommentRow = (
  row: Database["public"]["Tables"]["productivity_comments"]["Row"]
): ProductivityComment => ({
  commentId: row.comment_id,
  entityType: row.entity_type as "card" | "todo",
  entityId: row.entity_id,
  userId: row.user_id,
  authorName: row.author_name ?? undefined,
  body: row.body,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
});

const mapHelpUserRow = (row: Database["public"]["Tables"]["User"]["Row"]): HelpUser => ({
  id: row.id,
  email: row.email,
  fullName: row.fullName ?? undefined,
  avatarUrl: row.avatarUrl ?? undefined,
  phoneVerified: row.phoneVerified,
  idVerified: row.idVerified,
  trustLevel: row.trustLevel as HelpUser["trustLevel"],
  createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
  updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now(),
  about: row.about ?? undefined,
  aboutGenerated: row.aboutGenerated ?? undefined,
  location: row.location ?? undefined,
  phone: row.phone ?? undefined,
  preferredCategories: row.preferredCategories ?? [],
  profileTags: row.profileTags ?? [],
  pronouns: row.pronouns ?? undefined,
  publicProfile: row.publicProfile,
  radiusPreference: row.radiusPreference ?? 5
});

const mapHelpRequestRow = (row: Database["public"]["Tables"]["HelpRequest"]["Row"]): HelpRequest => ({
  requestId: row.id,
  requesterId: row.requesterId,
  title: row.title,
  description: row.description,
  summary: row.summary ?? undefined,
  category: row.category as HelpRequest["category"],
  urgency: row.urgency as HelpRequest["urgency"],
  location: (row.location ?? undefined) as HelpRequest["location"],
  status: row.status as HelpRequest["status"],
  aiChecklist: row.aiChecklist ?? undefined,
  aiRiskScore: row.aiRiskScore,
  createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
  updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now()
});

const mapHelpOfferRow = (row: Database["public"]["Tables"]["HelpOffer"]["Row"]): HelpOffer => ({
  offerId: row.id,
  helperId: row.helperId,
  requestId: row.requestId,
  message: row.message,
  status: row.status as HelpOffer["status"],
  createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
  updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now()
});

const mapHelpChatRow = (row: Database["public"]["Tables"]["Chat"]["Row"]): HelpChat => ({
  chatId: row.id,
  requestId: row.requestId,
  helperId: row.helperId,
  requesterId: row.requesterId,
  consentLevel: row.consentLevel as HelpChat["consentLevel"],
  createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
  updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now()
});

const mapHelpMessageRow = (row: Database["public"]["Tables"]["Message"]["Row"]): HelpMessage => ({
  messageId: row.id,
  chatId: row.chatId,
  authorId: row.authorId,
  content: row.content,
  aiRewrite: row.aiRewrite ?? undefined,
  createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now()
});

const mapHelpRatingRow = (row: Database["public"]["Tables"]["Rating"]["Row"]): HelpRating => ({
  ratingId: row.id,
  score: row.score,
  feedback: row.feedback ?? undefined,
  helperId: row.helperId,
  requesterId: row.requesterId,
  requestId: row.requestId,
  createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now()
});

const mapHelpVerificationRow = (row: Database["public"]["Tables"]["Verification"]["Row"]): HelpVerificationRecord => ({
  verificationId: row.id,
  userId: row.userId,
  type: row.type,
  status: row.status as HelpVerificationRecord["status"],
  metadata: row.metadata ?? undefined,
  createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
  updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : Date.now()
});

const mapHelpModerationLogRow = (row: Database["public"]["Tables"]["ModerationLog"]["Row"]): HelpModerationLog => ({
  moderationId: row.id,
  entityType: row.entityType,
  entityId: row.entityId,
  action: row.action,
  notes: row.notes ?? undefined,
  createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
  reviewedBy: row.reviewedBy ?? undefined,
  metadata: row.metadata ?? undefined
});

const loadMatchHistory = async (userId: string): Promise<MatchAction[]> => {
  if (!userId) return [];
  if (isClientRuntime) {
    try {
      const response = await fetchFromApi<{ items: MatchAction[] }>(
        `/api/match/actions${buildQueryString({ userId, direction: "outgoing" })}`
      );
      if (Array.isArray(response.items)) {
        return response.items;
      }
    } catch (error) {
      console.warn("[supabase] matches.history api fallback:", error instanceof Error ? error.message : error);
    }
    return getFallbackMatchHistory(userId);
  }
  if (!clients) {
    return getFallbackMatchHistory(userId);
  }
  try {
    const { admin } = clients;
    const { data, error } = await admin
      .from("match_actions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const mapped = (data ?? []).map(mapMatchActionRow);
    fallbackMatchActions = [
      ...fallbackMatchActions.filter((entry) => entry.userId !== userId),
      ...mapped
    ];
    return mapped;
  } catch (error) {
    console.warn("[supabase] matches.history fallback:", error instanceof Error ? error.message : error);
    return getFallbackMatchHistory(userId);
  }
};

const ensureDirectChat = async (memberA: string, memberB: string): Promise<string | null> => {
  if (!clients) return null;
  const { admin } = clients;
  const members = [memberA, memberB];
  try {
    const { data } = await admin
      .from("chats")
      .select("*")
      .contains("member_ids", members)
      .eq("is_group", false)
      .limit(1)
      .maybeSingle();
    if (data) {
      return mapChatRow(data).chatId;
    }
    const chatId = generateId();
    const { data: inserted, error: insertError } = await admin
      .from("chats")
      .insert({
        chat_id: chatId,
        member_ids: members,
        is_group: false,
        title: null,
        created_at: new Date().toISOString(),
        archived_by: [],
        hidden_by: []
      })
      .select("*")
      .single();
    if (insertError || !inserted) {
      throw insertError ?? new Error("Unable to create chat");
    }
    return mapChatRow(inserted).chatId;
  } catch (error) {
    console.warn("[supabase] ensureDirectChat failed:", error instanceof Error ? error.message : error);
    return null;
  }
};

const loadIncomingLikes = async (userId: string): Promise<MatchLikeAlert[]> => {
  if (!userId) return [];
  if (isClientRuntime) {
    try {
      const response = await fetchFromApi<{ items: MatchLikeAlert[] }>(
        `/api/match/actions${buildQueryString({ direction: "incoming" })}`
      );
      if (Array.isArray(response.items)) {
        return response.items;
      }
    } catch (error) {
      console.warn("[supabase] matches.incomingLikes api fallback:", error instanceof Error ? error.message : error);
    }
    return getFallbackIncomingLikes(userId).filter(
      (entry) => entry.action.createdAt >= Date.now() - LIKE_HISTORY_WINDOW_MS
    );
  }
  if (!clients) {
    return getFallbackIncomingLikes(userId);
  }
  try {
    const { admin } = clients;
    const { data, error } = await admin
      .from("match_actions")
      .select("*, liker:users!match_actions_user_id_fkey (*)")
      .eq("target_id", userId)
      .eq("action", "connected")
      .order("created_at", { ascending: false });
    if (error) throw error;
    type MatchActionRowWithLiker = Database["public"]["Tables"]["match_actions"]["Row"] & {
      liker?: Database["public"]["Tables"]["users"]["Row"] | null;
    };
    const mappedRows: MatchActionRowWithLiker[] = data ?? [];
    const mapped = mappedRows.map(mapMatchActionRow);
    const { data: outgoingRows, error: outgoingError } = await admin
      .from("match_actions")
      .select("target_id")
      .eq("user_id", userId)
      .eq("action", "connected");
    if (outgoingError) {
      console.warn("[supabase] matches.incomingLikes outgoing fallback:", outgoingError.message);
    }
    const likedTargets = new Set((outgoingRows ?? []).map((row) => row.target_id));
    const alerts: MatchLikeAlert[] = [];
    for (let index = 0; index < mapped.length; index += 1) {
      const action = mapped[index];
      const likerRow = mappedRows[index]?.liker ?? null;
      const likerUser =
        likerRow && "user_id" in likerRow
          ? mapUserRow(likerRow as Database["public"]["Tables"]["users"]["Row"])
          : (await fetchUserById(action.userId)) ?? (getFallbackUser(action.userId) ?? sampleUsers[0]);
      const isMutual = likedTargets.has(action.userId);
      let chatId: string | undefined;
      if (isMutual) {
        const ensured = await ensureDirectChat(action.userId, userId);
        if (ensured) {
          chatId = ensured;
        }
      }
      alerts.push({ action, from: likerUser, isMutual, chatId });
    }
    return alerts;
  } catch (error) {
    console.warn("[supabase] matches.incomingLikes fallback:", error instanceof Error ? error.message : error);
    return getFallbackIncomingLikes(userId);
  }
};


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
  createdAt: new Date(row.created_at).getTime(),
  archivedBy: row.archived_by ?? [],
  hiddenBy: row.hidden_by ?? []
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
  ...(() => {
    const { cleanTags, status } = decodeStatusFromTags(row.tags ?? []);
    return {
      status,
      isSold: status === "sold" || row.is_sold,
      tags: cleanTags
    };
  })(),
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
  createdAt: new Date(row.created_at).getTime(),
  metadata: row.metadata ?? undefined
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
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "chats" },
      (payload) => {
        const row = payload.new as Database["public"]["Tables"]["chats"]["Row"];
        emitEvent({ type: "chat:updated", chat: mapChatRow(row) });
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "chats" },
      (payload) => {
        const row = payload.old as Database["public"]["Tables"]["chats"]["Row"];
        emitEvent({ type: "chat:removed", chatId: row.chat_id });
      }
    )
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

  const createNotificationEntry = async (
    input: Omit<NotificationEntry, "notificationId" | "createdAt" | "readAt"> & {
      notificationId?: string;
      createdAt?: number;
      readAt?: number | null;
    }
  ): Promise<NotificationEntry> => {
    const entry: NotificationEntry = {
      notificationId: input.notificationId ?? generateId(),
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
    if (!clients) {
      fallbackNotifications = mergeById(fallbackNotifications, [entry], (item) => item.notificationId);
      return entry;
    }
    try {
      const { data, error } = await admin
        .from("notifications")
        .insert({
          notification_id: entry.notificationId,
          user_id: entry.userId,
          kind: entry.kind,
          title: entry.title,
          body: entry.body ?? null,
          link: entry.link ?? null,
          link_label: entry.linkLabel ?? null,
          secondary_link: entry.secondaryLink ?? null,
          secondary_link_label: entry.secondaryLinkLabel ?? null,
          metadata: entry.metadata ?? null,
          created_at: new Date(entry.createdAt).toISOString(),
          read_at: entry.readAt ? new Date(entry.readAt).toISOString() : null
        })
        .select("*")
        .single();
      if (error || !data) {
        throw error ?? new Error("Unable to create notification");
      }
      const mapped = mapNotificationRow(data);
      fallbackNotifications = mergeById(fallbackNotifications, [mapped], (item) => item.notificationId);
      return mapped;
    } catch (error) {
      console.warn("[supabase] notifications.create fallback:", error instanceof Error ? error.message : error);
      fallbackNotifications = mergeById(fallbackNotifications, [entry], (item) => item.notificationId);
      return entry;
    }
  };

  const triggerHubPresenceBroadcast = async (hub: Hub, count: number) => {
    const memberIds = Array.from(new Set(hub.activeUsers ?? [])).slice(0, HUB_PRESENCE_ALERT_MAX_RECIPIENTS);
    if (!memberIds.length) {
      return;
    }
    const link = `/hub-map?hub=${hub.hubId}`;
    await Promise.all(
      memberIds.map((userId) =>
        createNotificationEntry({
          userId,
          kind: "system",
          title: `Live now at ${hub.name}`,
          body: `${count} creatives are checked in. Tap to join.`,
          link,
          metadata: { type: "hub_presence", hubId: hub.hubId, count }
        }).catch((error) =>
          console.warn("[supabase] hub presence notification failed:", error instanceof Error ? error.message : error)
        )
      )
    );
    const profiles = await Promise.all(memberIds.map(fetchUserById));
    const emails = profiles.map((profile) => profile?.email).filter(Boolean) as string[];
    if (emails.length) {
      await sendHubPresenceEmail({
        to: emails,
        hubName: hub.name,
        count,
        hubLink: buildAbsoluteUrl(link)
      }).catch((error) =>
        console.warn("[supabase] hub presence email failed:", error instanceof Error ? error.message : error)
      );
    }
  };

  const evaluateHubPresenceThreshold = async (hubId: string | null | undefined) => {
    if (!clients || !HUB_PRESENCE_THRESHOLD || !hubId) {
      return;
    }
    try {
      const { admin } = clients;
      const [hubResult, presenceResult] = await Promise.all([
        admin.from("hubs").select("*").eq("hub_id", hubId).maybeSingle(),
        admin
          .from("checkins")
          .select("checkin_id")
          .eq("hub_id", hubId)
          .gt("expires_at", new Date().toISOString())
      ]);
      if (hubResult.error) throw hubResult.error;
      const hubRow = hubResult.data;
      if (!hubRow) {
        return;
      }
      if (presenceResult.error) throw presenceResult.error;
      const count = presenceResult.data?.length ?? 0;
      const now = Date.now();
      const previous = hubPresenceAlertState.get(hubId);
      if (count < HUB_PRESENCE_THRESHOLD) {
        hubPresenceAlertState.set(hubId, { count, timestamp: now });
        return;
      }
      if (
        previous &&
        previous.count >= HUB_PRESENCE_THRESHOLD &&
        now - previous.timestamp < HUB_PRESENCE_ALERT_COOLDOWN_MS &&
        count <= previous.count
      ) {
        return;
      }
      hubPresenceAlertState.set(hubId, { count, timestamp: now });
      await triggerHubPresenceBroadcast(mapHubRow(hubRow), count);
    } catch (error) {
      console.warn(
        "[supabase] hub presence evaluation error:",
        error instanceof Error ? error.message : error
      );
    }
  };

  const listNotificationEntries = async ({
    userId,
    since,
    limit = 100
  }: {
    userId: string;
    since?: number;
    limit?: number;
  }): Promise<NotificationEntry[]> => {
    if (!userId) return [];
    const readFallback = () =>
      [...fallbackNotifications]
        .filter((entry) => entry.userId === userId && (since ? entry.createdAt >= since : true))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    if (!clients) {
      return readFallback();
    }
    try {
      let query = admin
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (since) {
        query = query.gte("created_at", new Date(since).toISOString());
      }
      const { data, error } = await query;
      if (error) throw error;
      const mapped = (data ?? []).map(mapNotificationRow);
      fallbackNotifications = mergeById(fallbackNotifications, mapped, (item) => item.notificationId);
      return mapped;
    } catch (error) {
      console.warn("[supabase] notifications.list fallback:", error instanceof Error ? error.message : error);
      return readFallback();
    }
  };

  const markNotificationsState = async ({
    userId,
    ids,
    read
  }: {
    userId: string;
    ids?: string[];
    read: boolean;
  }) => {
    if (!userId) return;
    if (!clients) {
      fallbackNotifications = fallbackNotifications.map((entry) => {
        if (entry.userId !== userId) return entry;
        if (ids?.length && !ids.includes(entry.notificationId)) return entry;
        return { ...entry, readAt: read ? Date.now() : undefined };
      });
      return;
    }
    try {
      let query = admin
        .from("notifications")
        .update({ read_at: read ? new Date().toISOString() : null })
        .eq("user_id", userId);
      if (ids?.length) {
        query = query.in("notification_id", ids);
      }
      await query;
    } catch (error) {
      console.warn("[supabase] notifications.markRead fallback:", error instanceof Error ? error.message : error);
    } finally {
      fallbackNotifications = fallbackNotifications.map((entry) => {
        if (entry.userId !== userId) return entry;
        if (ids?.length && !ids.includes(entry.notificationId)) return entry;
        return { ...entry, readAt: read ? Date.now() : undefined };
      });
    }
  };

  const fetchUserSummary = async (userId: string) => {
    const fallback = sampleUsers.find((entry) => entry.userId === userId) ?? null;
    if (!clients) {
      return fallback;
    }
    try {
      const { data, error } = await admin
        .from("users")
        .select("user_id, display_name, email")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            userId: data.user_id,
            displayName: data.display_name ?? undefined,
            email: data.email ?? undefined
          }
        : fallback;
    } catch (error) {
      console.warn("[supabase] fetchUserSummary fallback:", error instanceof Error ? error.message : error);
      return fallback;
    }
  };

  const fetchArtworkSummary = async (artworkId: string) => {
    const fallback = sampleArtworks.find((entry) => entry.artworkId === artworkId) ?? null;
    if (!clients) return fallback;
    try {
      const { data, error } = await admin
        .from("artworks")
        .select("artwork_id, title")
        .eq("artwork_id", artworkId)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            artworkId: data.artwork_id,
            title: data.title
          }
        : fallback;
    } catch (error) {
      console.warn("[supabase] fetchArtworkSummary fallback:", error instanceof Error ? error.message : error);
      return fallback;
    }
  };

  const ensureDirectChat = async (userA: string, userB: string) => {
    if (!clients) return null;
    const members = [userA, userB];
    const { data, error } = await admin
      .from("chats")
      .select("*")
      .eq("is_group", false)
      .contains("member_ids", members);
    if (!error && data?.length) {
      const existing = data.find(
        (row) => row.member_ids.length === 2 && members.every((member) => row.member_ids.includes(member))
      );
      if (existing) {
        return existing;
      }
    }
    const chatId = generateId();
    const { data: created, error: insertError } = await admin
      .from("chats")
      .insert({
        chat_id: chatId,
        member_ids: members,
        is_group: false,
        title: null,
        created_at: new Date().toISOString(),
        archived_by: [],
        hidden_by: []
      })
      .select("*")
      .single();
    if (insertError || !created) {
      throw insertError ?? new Error("Unable to create chat");
    }
    return created;
  };

  const sendAutomatedMessage = async ({
    chatId,
    senderId,
    content
  }: {
    chatId: string;
    senderId: string;
    content: string;
  }) => {
    if (!clients) return;
    const payload: Database["public"]["Tables"]["messages"]["Insert"] = {
      message_id: generateId(),
      chat_id: chatId,
      sender_id: senderId,
      content,
      attachments: [],
      metadata: null,
      is_silent: false,
      scheduled_for: null,
      expires_at: null,
      created_at: new Date().toISOString(),
      delivered_to: null,
      read_by: [senderId],
      pinned: false
    };
    try {
      await admin.from("messages").insert(payload);
    } catch (error) {
      console.warn("[supabase] sendAutomatedMessage failed:", error instanceof Error ? error.message : error);
    }
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
        const profile: Database["public"]["Tables"]["users"]["Row"] = {
          user_id: authUser.id,
          email,
          display_name: email.split("@")[0],
          bio: null,
          skills: [],
          profile_picture_url: null,
          connections: [],
          is_verified: false,
          language: "en",
          location: null,
          joined_at: authUser.created_at ?? new Date().toISOString(),
          profile: null
        };
        await admin.from("users").upsert(profile, { onConflict: "user_id" });
        const user = mapUserRow(profile);
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
    profilePortfolio: {
      projects: {
        list: async (userId: string) => {
          if (!userId) return [];
          const readFallback = () =>
            [...fallbackProfileProjects.filter((project) => project.userId === userId)].sort(
              (a, b) => b.createdAt - a.createdAt
            );
          try {
            const { data, error } = await admin
              .from("profile_projects")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false });
            if (error) throw error;
            const mapped = (data ?? []).map(mapProfileProjectRow);
            fallbackProfileProjects = mergeById(fallbackProfileProjects, mapped, (item) => item.projectId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] profile.projects.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        create: async (input) => {
          const project: ProfileProject = {
            projectId: input.projectId ?? generateId(),
            userId: input.userId,
            title: input.title,
            summary: input.summary ?? undefined,
            link: input.link ?? undefined,
            status: input.status,
            tags: input.tags ?? [],
            year: input.year ?? undefined,
            createdAt: Date.now()
          };
          try {
            const { data, error } = await admin
              .from("profile_projects")
              .insert({
                project_id: project.projectId,
                user_id: project.userId,
                title: project.title,
                summary: project.summary ?? null,
                link: project.link ?? null,
                status: project.status ?? null,
                tags: project.tags,
                year: project.year ?? null
              })
              .select("*")
              .single();
            if (error || !data) {
              throw error ?? new Error("Unable to create project");
            }
            const mapped = mapProfileProjectRow(data);
            fallbackProfileProjects = mergeById(fallbackProfileProjects, [mapped], (item) => item.projectId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] profile.projects.create fallback:", error instanceof Error ? error.message : error);
            fallbackProfileProjects = mergeById(fallbackProfileProjects, [project], (item) => item.projectId);
            return project;
          }
        },
        update: async (projectId, data) => {
          const patch: Database["public"]["Tables"]["profile_projects"]["Update"] = {};
          if (data.title !== undefined) patch.title = data.title;
          if (data.summary !== undefined) patch.summary = data.summary ?? null;
          if (data.link !== undefined) patch.link = data.link ?? null;
          if (data.status !== undefined) patch.status = data.status ?? null;
          if (data.tags !== undefined) patch.tags = data.tags;
          if (data.year !== undefined) patch.year = data.year ?? null;
          try {
            const { data: row, error } = await admin
              .from("profile_projects")
              .update(patch)
              .eq("project_id", projectId)
              .select("*")
              .single();
            if (error || !row) {
              throw error ?? new Error("Project not found");
            }
            const mapped = mapProfileProjectRow(row);
            fallbackProfileProjects = mergeById(fallbackProfileProjects, [mapped], (item) => item.projectId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] profile.projects.update fallback:", error instanceof Error ? error.message : error);
            const existing = fallbackProfileProjects.find((project) => project.projectId === projectId);
            if (!existing) {
              throw error instanceof Error ? error : new Error("Project not found");
            }
            const updated = {
              ...existing,
              ...data,
              summary: data.summary !== undefined ? data.summary ?? undefined : existing.summary,
              link: data.link !== undefined ? data.link ?? undefined : existing.link,
              status: data.status ?? existing.status,
              tags: data.tags ?? existing.tags,
              year: data.year ?? existing.year
            };
            fallbackProfileProjects = mergeById(fallbackProfileProjects, [updated], (item) => item.projectId);
            return updated;
          }
        },
        remove: async (projectId) => {
          try {
            await admin.from("profile_projects").delete().eq("project_id", projectId);
          } catch (error) {
            console.warn("[supabase] profile.projects.remove fallback:", error instanceof Error ? error.message : error);
          } finally {
            fallbackProfileProjects = fallbackProfileProjects.filter((project) => project.projectId !== projectId);
            fallbackProfileMedia = fallbackProfileMedia.filter((media) => media.projectId !== projectId);
          }
        }
      },
      media: {
        list: async (userId: string) => {
          if (!userId) return [];
          const readFallback = () =>
            [...fallbackProfileMedia.filter((media) => media.userId === userId)].sort(
              (a, b) => b.createdAt - a.createdAt
            );
          try {
            const { data, error } = await admin
              .from("profile_media")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false });
            if (error) throw error;
            const mapped = (data ?? []).map(mapProfileMediaRow);
            fallbackProfileMedia = mergeById(fallbackProfileMedia, mapped, (item) => item.mediaId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] profile.media.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        create: async (input) => {
          const media: ProfileMedia = {
            mediaId: input.mediaId ?? generateId(),
            userId: input.userId,
            projectId: input.projectId ?? undefined,
            type: input.type,
            title: input.title ?? undefined,
            description: input.description ?? undefined,
            url: input.url,
            thumbnailUrl: input.thumbnailUrl ?? undefined,
            tags: input.tags ?? [],
            createdAt: Date.now()
          };
          try {
            const { data, error } = await admin
              .from("profile_media")
              .insert({
                media_id: media.mediaId,
                user_id: media.userId,
                project_id: media.projectId ?? null,
                type: media.type,
                title: media.title ?? null,
                description: media.description ?? null,
                url: media.url,
                thumbnail_url: media.thumbnailUrl ?? null,
                tags: media.tags
              })
              .select("*")
              .single();
            if (error || !data) {
              throw error ?? new Error("Unable to add media");
            }
            const mapped = mapProfileMediaRow(data);
            fallbackProfileMedia = mergeById(fallbackProfileMedia, [mapped], (item) => item.mediaId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] profile.media.create fallback:", error instanceof Error ? error.message : error);
            fallbackProfileMedia = mergeById(fallbackProfileMedia, [media], (item) => item.mediaId);
            return media;
          }
        },
        update: async (mediaId, data) => {
          const patch: Database["public"]["Tables"]["profile_media"]["Update"] = {};
          if (data.projectId !== undefined) patch.project_id = data.projectId ?? null;
          if (data.type !== undefined) patch.type = data.type;
          if (data.title !== undefined) patch.title = data.title ?? null;
          if (data.description !== undefined) patch.description = data.description ?? null;
          if (data.url !== undefined) patch.url = data.url;
          if (data.thumbnailUrl !== undefined) patch.thumbnail_url = data.thumbnailUrl ?? null;
          if (data.tags !== undefined) patch.tags = data.tags;
          try {
            const { data: row, error } = await admin
              .from("profile_media")
              .update(patch)
              .eq("media_id", mediaId)
              .select("*")
              .single();
            if (error || !row) {
              throw error ?? new Error("Media not found");
            }
            const mapped = mapProfileMediaRow(row);
            fallbackProfileMedia = mergeById(fallbackProfileMedia, [mapped], (item) => item.mediaId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] profile.media.update fallback:", error instanceof Error ? error.message : error);
            const existing = fallbackProfileMedia.find((entry) => entry.mediaId === mediaId);
            if (!existing) {
              throw error instanceof Error ? error : new Error("Media not found");
            }
            const updated = {
              ...existing,
              ...data,
              projectId: data.projectId !== undefined ? data.projectId ?? undefined : existing.projectId,
              title: data.title !== undefined ? data.title ?? undefined : existing.title,
              description: data.description !== undefined ? data.description ?? undefined : existing.description,
              thumbnailUrl: data.thumbnailUrl !== undefined ? data.thumbnailUrl ?? undefined : existing.thumbnailUrl,
              tags: data.tags ?? existing.tags
            };
            fallbackProfileMedia = mergeById(fallbackProfileMedia, [updated], (item) => item.mediaId);
            return updated;
          }
        },
        remove: async (mediaId) => {
          try {
            await admin.from("profile_media").delete().eq("media_id", mediaId);
          } catch (error) {
            console.warn("[supabase] profile.media.remove fallback:", error instanceof Error ? error.message : error);
          } finally {
            fallbackProfileMedia = fallbackProfileMedia.filter((media) => media.mediaId !== mediaId);
          }
        }
      },
      socials: {
        list: async (userId: string) => {
          if (!userId) return [];
          const readFallback = () =>
            [...fallbackProfileSocials.filter((entry) => entry.userId === userId)].sort(
              (a, b) => b.createdAt - a.createdAt
            );
          try {
            const { data, error } = await admin
              .from("profile_socials")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", { ascending: false });
            if (error) throw error;
            const mapped = (data ?? []).map(mapProfileSocialRow);
            fallbackProfileSocials = mergeById(fallbackProfileSocials, mapped, (item) => item.socialId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] profile.socials.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        create: async (input) => {
          const social: ProfileSocialLink = {
            socialId: input.socialId ?? generateId(),
            userId: input.userId,
            platform: input.platform,
            handle: input.handle ?? undefined,
            url: input.url ?? undefined,
            createdAt: Date.now()
          };
          try {
            const { data, error } = await admin
              .from("profile_socials")
              .insert({
                social_id: social.socialId,
                user_id: social.userId,
                platform: social.platform,
                handle: social.handle ?? null,
                url: social.url ?? null
              })
              .select("*")
              .single();
            if (error || !data) {
              throw error ?? new Error("Unable to create social link");
            }
            const mapped = mapProfileSocialRow(data);
            fallbackProfileSocials = mergeById(fallbackProfileSocials, [mapped], (item) => item.socialId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] profile.socials.create fallback:", error instanceof Error ? error.message : error);
            fallbackProfileSocials = mergeById(fallbackProfileSocials, [social], (item) => item.socialId);
            return social;
          }
        },
        update: async (socialId, data) => {
          const patch: Database["public"]["Tables"]["profile_socials"]["Update"] = {};
          if (data.platform !== undefined) patch.platform = data.platform;
          if (data.handle !== undefined) patch.handle = data.handle ?? null;
          if (data.url !== undefined) patch.url = data.url ?? null;
          try {
            const { data: row, error } = await admin
              .from("profile_socials")
              .update(patch)
              .eq("social_id", socialId)
              .select("*")
              .single();
            if (error || !row) {
              throw error ?? new Error("Social link not found");
            }
            const mapped = mapProfileSocialRow(row);
            fallbackProfileSocials = mergeById(fallbackProfileSocials, [mapped], (item) => item.socialId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] profile.socials.update fallback:", error instanceof Error ? error.message : error);
            const existing = fallbackProfileSocials.find((entry) => entry.socialId === socialId);
            if (!existing) {
              throw error instanceof Error ? error : new Error("Social link not found");
            }
            const updated = {
              ...existing,
              ...data,
              handle: data.handle !== undefined ? data.handle ?? undefined : existing.handle,
              url: data.url !== undefined ? data.url ?? undefined : existing.url
            };
            fallbackProfileSocials = mergeById(fallbackProfileSocials, [updated], (item) => item.socialId);
            return updated;
          }
        },
        remove: async (socialId) => {
          try {
            await admin.from("profile_socials").delete().eq("social_id", socialId);
          } catch (error) {
            console.warn("[supabase] profile.socials.remove fallback:", error instanceof Error ? error.message : error);
          } finally {
            fallbackProfileSocials = fallbackProfileSocials.filter((entry) => entry.socialId !== socialId);
          }
        }
      }
    },
    orderMilestones: {
      milestones: {
        list: async (orderId: string) => {
          if (!orderId) return [];
          const readFallback = () =>
            [...fallbackOrderMilestones.filter((entry) => entry.orderId === orderId)].sort(
              (a, b) => a.createdAt - b.createdAt
            );
          try {
            const { data, error } = await admin
              .from("order_milestones")
              .select("*")
              .eq("order_id", orderId)
              .order("created_at", { ascending: true });
            if (error) throw error;
            const mapped = (data ?? []).map(mapOrderMilestoneRow);
            fallbackOrderMilestones = mergeById(fallbackOrderMilestones, mapped, (item) => item.milestoneId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] order.milestones.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        create: async (input) => {
          const milestone: OrderMilestone = {
            milestoneId: input.milestoneId ?? generateId(),
            orderId: input.orderId,
            title: input.title,
            amount: input.amount,
            dueDate: input.dueDate,
            status: input.status ?? "pending",
            createdAt: Date.now(),
            updatedAt: undefined
          };
          try {
            const { data, error } = await admin
              .from("order_milestones")
              .insert({
                milestone_id: milestone.milestoneId,
                order_id: milestone.orderId,
                title: milestone.title,
                amount: milestone.amount,
                due_date: milestone.dueDate ? new Date(milestone.dueDate).toISOString() : null,
                status: milestone.status
              })
              .select("*")
              .single();
            if (error || !data) {
              throw error ?? new Error("Unable to create milestone");
            }
            const mapped = mapOrderMilestoneRow(data);
            fallbackOrderMilestones = mergeById(fallbackOrderMilestones, [mapped], (item) => item.milestoneId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] order.milestones.create fallback:", error instanceof Error ? error.message : error);
            fallbackOrderMilestones = mergeById(fallbackOrderMilestones, [milestone], (item) => item.milestoneId);
            return milestone;
          }
        },
        update: async (milestoneId, data) => {
          const patch: Database["public"]["Tables"]["order_milestones"]["Update"] = {
            updated_at: new Date().toISOString()
          };
          if (data.title !== undefined) patch.title = data.title;
          if (data.amount !== undefined) patch.amount = data.amount;
          if (data.dueDate !== undefined) patch.due_date = data.dueDate ? new Date(data.dueDate).toISOString() : null;
          if (data.status !== undefined) patch.status = data.status;
          try {
            const { data: row, error } = await admin
              .from("order_milestones")
              .update(patch)
              .eq("milestone_id", milestoneId)
              .select("*")
              .single();
            if (error || !row) {
              throw error ?? new Error("Milestone not found");
            }
            const mapped = mapOrderMilestoneRow(row);
            fallbackOrderMilestones = mergeById(fallbackOrderMilestones, [mapped], (item) => item.milestoneId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] order.milestones.update fallback:", error instanceof Error ? error.message : error);
            const existing = fallbackOrderMilestones.find((entry) => entry.milestoneId === milestoneId);
            if (!existing) {
              throw error instanceof Error ? error : new Error("Milestone not found");
            }
            const updated: OrderMilestone = {
              ...existing,
              ...data,
              dueDate: data.dueDate !== undefined ? data.dueDate ?? undefined : existing.dueDate,
              updatedAt: Date.now()
            };
            fallbackOrderMilestones = mergeById(fallbackOrderMilestones, [updated], (item) => item.milestoneId);
            return updated;
          }
        }
      },
      payouts: {
        list: async (orderId: string) => {
          if (!orderId) return [];
          const readFallback = () =>
            [...fallbackPayouts.filter((entry) => entry.orderId === orderId)].sort((a, b) => b.createdAt - a.createdAt);
          try {
            const { data, error } = await admin
              .from("payouts")
              .select("*")
              .eq("order_id", orderId)
              .order("created_at", { ascending: false });
            if (error) throw error;
            const mapped = (data ?? []).map(mapPayoutRow);
            fallbackPayouts = mergeById(fallbackPayouts, mapped, (item) => item.payoutId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] payouts.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        create: async (input) => {
          const payout: Payout = {
            payoutId: input.payoutId ?? generateId(),
            orderId: input.orderId,
            milestoneId: input.milestoneId ?? undefined,
            payeeId: input.payeeId,
            amount: input.amount,
            currency: input.currency ?? "usd",
            status: input.status ?? "initiated",
            metadata: input.metadata,
            createdAt: Date.now()
          };
          try {
            const { data, error } = await admin
              .from("payouts")
              .insert({
                payout_id: payout.payoutId,
                order_id: payout.orderId,
                milestone_id: payout.milestoneId ?? null,
                payee_id: payout.payeeId,
                amount: payout.amount,
                currency: payout.currency,
                status: payout.status,
                metadata: payout.metadata ?? null
              })
              .select("*")
              .single();
            if (error || !data) {
              throw error ?? new Error("Unable to create payout");
            }
            const mapped = mapPayoutRow(data);
            fallbackPayouts = mergeById(fallbackPayouts, [mapped], (item) => item.payoutId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] payouts.create fallback:", error instanceof Error ? error.message : error);
            fallbackPayouts = mergeById(fallbackPayouts, [payout], (item) => item.payoutId);
            return payout;
          }
        },
        update: async (payoutId, data) => {
          const patch: Database["public"]["Tables"]["payouts"]["Update"] = {};
          if (data.orderId !== undefined) patch.order_id = data.orderId;
          if (data.milestoneId !== undefined) patch.milestone_id = data.milestoneId ?? null;
          if (data.payeeId !== undefined) patch.payee_id = data.payeeId;
          if (data.amount !== undefined) patch.amount = data.amount;
          if (data.currency !== undefined) patch.currency = data.currency;
          if (data.status !== undefined) patch.status = data.status;
          if (data.metadata !== undefined) patch.metadata = data.metadata ?? null;
          try {
            const { data: row, error } = await admin
              .from("payouts")
              .update(patch)
              .eq("payout_id", payoutId)
              .select("*")
              .single();
            if (error || !row) {
              throw error ?? new Error("Payout not found");
            }
            const mapped = mapPayoutRow(row);
            fallbackPayouts = mergeById(fallbackPayouts, [mapped], (item) => item.payoutId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] payouts.update fallback:", error instanceof Error ? error.message : error);
            const existing = fallbackPayouts.find((entry) => entry.payoutId === payoutId);
            if (!existing) {
              throw error instanceof Error ? error : new Error("Payout not found");
            }
            const updated: Payout = {
              ...existing,
              ...data,
              milestoneId: data.milestoneId !== undefined ? data.milestoneId ?? undefined : existing.milestoneId,
              metadata: data.metadata !== undefined ? data.metadata ?? undefined : existing.metadata
            };
            fallbackPayouts = mergeById(fallbackPayouts, [updated], (item) => item.payoutId);
            return updated;
          }
        }
      }
    },
    notifications: {
      list: async ({ userId, since, limit = 50 }) => listNotificationEntries({ userId, since, limit }),
      create: async (input) => createNotificationEntry(input),
      markRead: async ({ userId, ids, read }) => markNotificationsState({ userId, ids, read })
    },
    users: {
      list: async ({ query }) => {
        if (isClientRuntime) {
          try {
            const response = await fetchFromApi<{ items: User[] }>(`/api/users${buildQueryString({ query })}`);
            if (Array.isArray(response.items)) {
              return response.items;
            }
          } catch (error) {
            console.warn("[supabase] users.list api fallback:", error instanceof Error ? error.message : error);
          }
        }
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
        if (isClientRuntime) {
          try {
            const user = await fetchFromApi<User>(`/api/users${buildQueryString({ id })}`);
            if (user?.userId) {
              return user;
            }
          } catch (error) {
            console.warn("[supabase] users.get api fallback:", error instanceof Error ? error.message : error);
          }
        }
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
        if (isClientRuntime && !SUPABASE_SERVICE_ROLE_KEY) {
          const response = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input)
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(payload?.error?.message ?? "Unable to save profile");
          }
          return payload as User;
        }
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
        if (isClientRuntime) {
          try {
            const response = await fetchFromApi<{ items: Hub[] }>("/api/hubs");
            if (Array.isArray(response.items)) {
              return response.items;
            }
          } catch (error) {
            console.warn("[supabase] hubs.list api fallback:", error instanceof Error ? error.message : error);
          }
        }
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
          await evaluateHubPresenceThreshold(hubId);
          return mapped;
        } catch (error) {
          console.warn("[supabase] checkins.create fallback:", error instanceof Error ? error.message : error);
          return createFallbackCheckin({ userId, hubId, location, status });
        }
      },
      listActive: async ({ near }: { near?: { lat: number; lng: number } } = {}) => {
        if (isClientRuntime) {
          try {
            const response = await fetchFromApi<{ items: Checkin[] }>(
              `/api/checkin${buildQueryString({
                lat: near?.lat,
                lng: near?.lng
              })}`
            );
            if (Array.isArray(response.items)) {
              return sortByNearIfNeeded(response.items, near);
            }
          } catch (error) {
            console.warn("[supabase] checkins.listActive api fallback:", error instanceof Error ? error.message : error);
          }
        }
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
        if (isClientRuntime) {
          try {
            const response = await fetchFromApi<{ items: MatchSuggestion[] }>("/api/match", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId })
            });
            if (Array.isArray(response.items)) {
              return response.items;
            }
          } catch (error) {
            console.warn("[supabase] matches.suggest api fallback:", error instanceof Error ? error.message : error);
          }
        }
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
        const history = await loadMatchHistory(userId);
        if (history.length) {
          const excluded = new Set(history.map((entry) => entry.targetId));
          suggestions = suggestions.filter((candidate) => !excluded.has(candidate.userId));
        }
        return suggestions;
      },
      history: async ({ userId }) => loadMatchHistory(userId),
      incomingLikes: async ({ userId }) => loadIncomingLikes(userId),
      recordAction: async ({ userId, targetId, action, createdAt }) => {
        if (!userId) {
          throw new Error("userId required");
        }
        if (isClientRuntime) {
          try {
            const response = await fetchFromApi<MatchActionResult>("/api/match/actions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, targetId, action, createdAt })
            });
            if (response) {
              upsertFallbackMatchAction(response.action);
              return response;
            }
          } catch (error) {
            console.warn("[supabase] matches.recordAction api fallback:", error instanceof Error ? error.message : error);
          }
        }
        if (!clients) {
          const entry: MatchAction = {
            id: generateId(),
            userId,
            targetId,
            action,
            createdAt: createdAt ?? Date.now()
          };
          upsertFallbackMatchAction(entry);
          let match: MatchActionResult["match"];
          if (action === "connected") {
            const reciprocal = fallbackMatchActions.find(
              (candidate) =>
                candidate.userId === targetId && candidate.targetId === userId && candidate.action === "connected"
            );
            if (reciprocal) {
              match = {
                chatId: generateId(),
                user: getFallbackUser(targetId) ?? sampleUsers[0]
              };
            }
          }
          return { action: entry, match };
        }
        try {
          const { admin } = clients;
          const insertPayload: Database["public"]["Tables"]["match_actions"]["Insert"] = {
            id: generateId(),
            user_id: userId,
            target_id: targetId,
            action,
            created_at: new Date((createdAt ?? Date.now())).toISOString()
          };
          const { data, error } = await admin.from("match_actions").insert(insertPayload).select("*").single();
          if (error || !data) {
            throw error ?? new Error("Unable to log match action");
          }
          const mapped = mapMatchActionRow(data);
          upsertFallbackMatchAction(mapped);
          const actorProfile = (await fetchUserById(userId)) ?? (getFallbackUser(userId) ?? sampleUsers[0]);
          let cachedTargetProfile: User | null = null;
          const resolveTargetProfile = async () => {
            if (cachedTargetProfile) return cachedTargetProfile;
            cachedTargetProfile =
              (await fetchUserById(targetId)) ?? (getFallbackUser(targetId) ?? sampleUsers[0]);
            return cachedTargetProfile;
          };
          let match: MatchActionResult["match"];
          if (action === "connected") {
            await createNotificationEntry({
              userId: targetId,
              kind: "system",
              title: `${actorProfile.displayName} liked your profile`,
              body: "Open their profile to connect back.",
              link: `/profile/${actorProfile.userId}`,
              linkLabel: "View profile",
              metadata: { actorId: actorProfile.userId, actionId: mapped.id }
            });
            const { data: reciprocal } = await admin
              .from("match_actions")
              .select("*")
              .eq("user_id", targetId)
              .eq("target_id", userId)
              .eq("action", "connected")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (reciprocal) {
              const chatId = await ensureDirectChat(userId, targetId);
              if (chatId) {
                const targetUser = await resolveTargetProfile();
                match = { chatId, user: targetUser };
                await createNotificationEntry({
                  userId,
                  kind: "system",
                  title: `You matched with ${targetUser.displayName}`,
                  body: "Start a conversation now.",
                  link: `/messages?chat=${chatId}`,
                  linkLabel: "Open chat",
                  secondaryLink: `/profile/${targetUser.userId}`,
                  secondaryLinkLabel: "View profile",
                  metadata: { chatId, otherUserId: targetUser.userId }
                });
                await createNotificationEntry({
                  userId: targetId,
                  kind: "system",
                  title: `You matched with ${actorProfile.displayName}`,
                  body: "Start a conversation now.",
                  link: `/messages?chat=${chatId}`,
                  linkLabel: "Open chat",
                  secondaryLink: `/profile/${actorProfile.userId}`,
                  secondaryLinkLabel: "View profile",
                  metadata: { chatId, otherUserId: actorProfile.userId }
                });
              }
            }
          }
          return { action: mapped, match };
        } catch (error) {
          console.warn("[supabase] matches.recordAction fallback:", error instanceof Error ? error.message : error);
          const fallback: MatchAction = {
            id: generateId(),
            userId,
            targetId,
            action,
            createdAt: createdAt ?? Date.now()
          };
          upsertFallbackMatchAction(fallback);
          return { action: fallback };
        }
      }
    },
    messages: {
      listChats: async ({ userId }) => {
        if (isClientRuntime && !SUPABASE_SERVICE_ROLE_KEY) {
          const response = await fetch(`/api/messages?userId=${encodeURIComponent(userId)}`);
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(payload?.error?.message ?? "Unable to load chats");
          }
          return (payload?.items ?? []) as Chat[];
        }
        const { data, error } = await admin
          .from("chats")
          .select("*")
          .contains("member_ids", [userId]);
        if (error) throw error;
        return (data ?? [])
          .filter((row) => !((row.hidden_by ?? []).includes(userId)))
          .map(mapChatRow);
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
        if (!(content?.trim() || (attachments && attachments.length > 0))) {
          throw new Error("Message requires content or an attachment");
        }
        const { data: chatRow, error: chatError } = await admin.from("chats").select("*").eq("chat_id", chatId).single();
        if (chatError || !chatRow) {
          throw chatError ?? new Error("Chat not found");
        }
        if (!chatRow.member_ids.includes(senderId)) {
          throw new Error("You are not a member of this chat");
        }
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
        if (isClientRuntime && !SUPABASE_SERVICE_ROLE_KEY) {
          const response = await fetch("/api/messages", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memberIds, isGroup, title })
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(payload?.error?.message ?? "Unable to create chat");
          }
          return payload as Chat;
        }
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
      archiveChat: async ({ chatId, userId, archived }) => {
        const { data: row, error } = await admin.from("chats").select("*").eq("chat_id", chatId).single();
        if (error || !row) throw error ?? new Error("Chat not found");
        if (!row.member_ids.includes(userId)) {
          throw new Error("User not in chat");
        }
        const archivedBy = (row as { archived_by?: string[] | null }).archived_by;
        if (archivedBy === undefined) {
          console.warn("[supabase] archiveChat skipped: archived_by column missing");
          return mapChatRow(row);
        }
        const archiveSet = new Set(archivedBy ?? []);
        if (archived) {
          archiveSet.add(userId);
        } else {
          archiveSet.delete(userId);
        }
        const { data: updated, error: updateError } = await admin
          .from("chats")
          .update({ archived_by: Array.from(archiveSet) })
          .eq("chat_id", chatId)
          .select("*")
          .single();
        if (updateError || !updated) {
          throw updateError ?? new Error("Unable to update chat");
        }
        return mapChatRow(updated);
      },
      removeChat: async ({ chatId, userId }) => {
        const { data: row, error } = await admin.from("chats").select("*").eq("chat_id", chatId).single();
        if (error || !row) throw error ?? new Error("Chat not found");
        if (!row.member_ids.includes(userId)) {
          throw new Error("User not in chat");
        }
        const hiddenBy = (row as { hidden_by?: string[] | null }).hidden_by;
        if (hiddenBy === undefined) {
          await admin.from("messages").delete().eq("chat_id", chatId);
          await admin.from("chats").delete().eq("chat_id", chatId);
          emitEvent({ type: "chat:removed", chatId });
          return;
        }
        const hiddenSet = new Set(hiddenBy ?? []);
        if (hiddenSet.has(userId)) return;
        hiddenSet.add(userId);
        const shouldDelete = row.member_ids.every((memberId: string) => hiddenSet.has(memberId));
        if (shouldDelete) {
          await admin.from("messages").delete().eq("chat_id", chatId);
          await admin.from("chats").delete().eq("chat_id", chatId);
          return;
        }
        const { error: updateError } = await admin
          .from("chats")
          .update({ hidden_by: Array.from(hiddenSet) })
          .eq("chat_id", chatId);
        if (updateError) throw updateError;
      },
      subscribe: (handler) => {
        listeners.add(handler);
        return () => listeners.delete(handler);
      }
    },
    marketplace: {
      list: async ({ tag, priceMin, priceMax }) => {
        if (isClientRuntime) {
          try {
            const response = await fetchFromApi<{ items: Artwork[] }>(
              `/api/marketplace${buildQueryString({
                tag,
                priceMin,
                priceMax
              })}`
            );
            if (Array.isArray(response.items)) {
              return response.items;
            }
          } catch (error) {
            console.warn("[supabase] marketplace.list api fallback:", error instanceof Error ? error.message : error);
          }
        }
        const builder = admin.from("artworks").select("*").order("created_at", { ascending: false });
        if (tag) builder.contains("tags", [tag]);
        if (typeof priceMin === "number") builder.gte("price", priceMin);
        if (typeof priceMax === "number") builder.lte("price", priceMax);
        const { data, error } = await builder;
        if (error || !data || data.length === 0) {
          if (error) {
            console.warn("[supabase] artworks.list falling back to sample data:", error.message);
          }
          return fallbackArtworks.filter((artwork) => {
            const withinTag = tag ? artwork.tags.includes(tag) : true;
            const aboveMin = typeof priceMin === "number" ? artwork.price >= priceMin : true;
            const belowMax = typeof priceMax === "number" ? artwork.price <= priceMax : true;
            return withinTag && aboveMin && belowMax;
          });
        }
        const mapped = data.map(mapArtworkRow);
        fallbackArtworks = mapped;
        return mapped;
      },
      createListing: async (input) => {
        const status = input.status ?? (input.isSold ? "sold" : "listed");
        const tagsWithStatus = encodeTagsWithStatus(input.tags ?? [], status);
        const payload = {
          artworkId: input.artworkId ?? generateId(),
          artistId: input.artistId,
          title: input.title,
          description: input.description,
          mediaUrls: input.mediaUrls,
          price: input.price,
          currency: input.currency ?? "usd",
          status,
          isSold: status === "sold",
          tags: input.tags ?? [],
          createdAt: input.createdAt ?? Date.now()
        } satisfies Artwork;
        try {
          const entry: Database["public"]["Tables"]["artworks"]["Insert"] = {
            artwork_id: payload.artworkId,
            artist_id: payload.artistId,
            title: payload.title,
            description: payload.description ?? null,
            media_urls: payload.mediaUrls,
            price: payload.price,
            currency: payload.currency,
            is_sold: payload.isSold,
            tags: tagsWithStatus,
            created_at: new Date(payload.createdAt).toISOString()
          };
          const { data, error } = await admin
            .from("artworks")
            .upsert(entry, { onConflict: "artwork_id" })
            .select("*")
            .single();
          if (error || !data) {
            throw error ?? new Error("Unable to create listing");
          }
          const mapped = mapArtworkRow(data);
          fallbackArtworks = [mapped, ...fallbackArtworks.filter((art) => art.artworkId !== mapped.artworkId)];
          return mapped;
        } catch (error) {
          console.warn("[supabase] artworks.createListing falling back:", error instanceof Error ? error.message : error);
          fallbackArtworks = [payload, ...fallbackArtworks.filter((art) => art.artworkId !== payload.artworkId)];
          return payload;
        }
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
            ? fallbackArtworks.filter((artwork) => artwork.artistId === userId)
            : listingRows.map(mapArtworkRow);
        if (!listingError && listingRows) {
          fallbackArtworks = fallbackArtworks.map((art) => {
            const updated = listings.find((item) => item.artworkId === art.artworkId);
            return updated ?? art;
          });
        }
        const orders =
          orderError || !orderRows || orderRows.length === 0
            ? fallbackOrders.filter((order) => order.sellerId === userId)
            : orderRows.map(mapOrderRow);
        if (!orderError && orderRows) {
          fallbackOrders = fallbackOrders.map((order) => {
            const updated = orders.find((item) => item.orderId === order.orderId);
            return updated ?? order;
          });
        }
        return { listings, orders };
      },
      updateStatus: async ({ artworkId, status }) => {
        try {
          const { data: existing, error: fetchError } = await admin
            .from("artworks")
            .select("*")
            .eq("artwork_id", artworkId)
            .single();
          if (fetchError || !existing) {
            throw fetchError ?? new Error("Listing not found");
          }
          const updatedTags = encodeTagsWithStatus(existing.tags ?? [], status);
          const { data, error } = await admin
            .from("artworks")
            .update({ is_sold: status === "sold", tags: updatedTags })
            .eq("artwork_id", artworkId)
            .select("*")
            .single();
          if (error || !data) {
            throw error ?? new Error("Unable to update listing");
          }
          const mapped = mapArtworkRow(data);
          fallbackArtworks = fallbackArtworks.map((art) => (art.artworkId === mapped.artworkId ? mapped : art));
          return mapped;
        } catch (error) {
          console.warn("[supabase] artworks.updateStatus falling back:", error instanceof Error ? error.message : error);
          let updated: Artwork | undefined;
          fallbackArtworks = fallbackArtworks.map((art) => {
            if (art.artworkId === artworkId) {
              updated = { ...art, status, isSold: status === "sold" };
              return updated;
            }
            return art;
          });
          if (!updated) {
            throw new Error("Listing not found");
          }
          return updated;
        }
      },
      removeListing: async ({ artworkId }) => {
        try {
          const { error } = await admin.from("artworks").delete().eq("artwork_id", artworkId);
          if (error) {
            throw error;
          }
          fallbackArtworks = fallbackArtworks.filter((art) => art.artworkId !== artworkId);
        } catch (error) {
          console.warn("[supabase] artworks.removeListing falling back:", error instanceof Error ? error.message : error);
          const next = fallbackArtworks.filter((art) => art.artworkId !== artworkId);
          if (next.length === fallbackArtworks.length) {
            throw new Error("Listing not found");
          }
          fallbackArtworks = next;
        }
      }
    },
    orders: {
      createPaymentIntent: async ({ artworkId, buyerId, metadata }) => {
        const orderId = generateId();
        try {
          const { data: artworkRow, error: artworkError } = await admin
            .from("artworks")
            .select("*")
            .eq("artwork_id", artworkId)
            .single();
          if (artworkError || !artworkRow) {
            throw artworkError ?? new Error("Artwork not found");
          }
          const amount = artworkRow.price;
          const orderPayload: Database["public"]["Tables"]["orders"]["Insert"] = {
            order_id: orderId,
            artwork_id: artworkId,
            buyer_id: buyerId,
            seller_id: artworkRow.artist_id,
            amount,
            currency: artworkRow.currency,
            status: "pending",
            stripe_payment_intent_id: `pi_${orderId}`,
            created_at: new Date().toISOString(),
            metadata: metadata ?? null
          };
          const { data, error } = await admin.from("orders").insert(orderPayload).select("*").single();
          if (error || !data) {
            throw error ?? new Error("Unable to create order");
          }
          const mapped = mapOrderRow(data);
          fallbackOrders = [mapped, ...fallbackOrders.filter((order) => order.orderId !== mapped.orderId)];
          return { clientSecret: `pi_secret_${orderId}`, order: mapped };
        } catch (error) {
          console.warn("[supabase] orders.createPaymentIntent falling back:", error);
          const artwork = fallbackArtworks.find((item) => item.artworkId === artworkId);
          if (!artwork) {
            throw new Error("Artwork not found");
          }
          const order = {
            orderId,
            artworkId,
            buyerId,
            sellerId: artwork.artistId,
            amount: artwork.price,
            currency: artwork.currency,
            status: "pending" as const,
            stripePaymentIntentId: `pi_${orderId}`,
            createdAt: Date.now(),
            metadata
          };
          fallbackOrders = [order, ...fallbackOrders];
          return { clientSecret: `pi_secret_${orderId}`, order };
        }
      },
      confirmPayment: async ({ paymentIntentId, status }) => {
        try {
          const { data: row, error } = await admin
            .from("orders")
            .select("*")
            .eq("stripe_payment_intent_id", paymentIntentId)
            .single();
          if (error || !row) {
            throw error ?? new Error("Order not found");
          }
          const { data: updated, error: updateError } = await admin
            .from("orders")
            .update({ status })
            .eq("order_id", row.order_id)
            .select("*")
            .single();
          if (updateError || !updated) {
            throw updateError ?? new Error("Unable to update order");
          }
          if (status === "paid") {
            const { data: artworkRow } = await admin
              .from("artworks")
              .select("*")
              .eq("artwork_id", updated.artwork_id)
              .single();
            if (artworkRow) {
              const updatedTags = encodeTagsWithStatus(artworkRow.tags ?? [], "sold");
              await admin
                .from("artworks")
                .update({ is_sold: true, tags: updatedTags })
                .eq("artwork_id", updated.artwork_id);
            }
          }
          const mapped = mapOrderRow(updated);
          fallbackOrders = fallbackOrders.map((order) => (order.orderId === mapped.orderId ? mapped : order));
          if (status === "paid") {
            try {
              const [buyerSummary, sellerSummary, artworkSummary] = await Promise.all([
                fetchUserSummary(mapped.buyerId),
                fetchUserSummary(mapped.sellerId),
                fetchArtworkSummary(mapped.artworkId)
              ]);
              const artworkTitle = artworkSummary?.title ?? "an artwork";
              const buyerName = buyerSummary?.displayName ?? buyerSummary?.email ?? mapped.buyerId;
              const sellerName = sellerSummary?.displayName ?? sellerSummary?.email ?? mapped.sellerId;
              await Promise.all([
                createNotificationEntry({
                  userId: mapped.sellerId,
                  kind: "order",
                  title: `New order from ${buyerName}`,
                  body: `${buyerName} purchased "${artworkTitle}". Review the order details.`,
                  link: `/marketplace/orders/${mapped.orderId}`,
                  metadata: { orderId: mapped.orderId, artworkId: mapped.artworkId }
                }),
                createNotificationEntry({
                  userId: mapped.buyerId,
                  kind: "order",
                  title: `Order confirmed: ${artworkTitle}`,
                  body: `Thanks for collecting from ${sellerName}. We'll follow up with tracking info soon.`,
                  link: `/marketplace/orders/${mapped.orderId}`,
                  metadata: { orderId: mapped.orderId, artworkId: mapped.artworkId }
                })
              ]);
              if (clients) {
                const directChat = await ensureDirectChat(mapped.sellerId, mapped.buyerId);
                if (directChat) {
                  await sendAutomatedMessage({
                    chatId: directChat.chat_id,
                    senderId: mapped.sellerId,
                    content: `Hi ${buyerName}, thanks for your purchase of "${artworkTitle}". We'll follow up from the hub with fulfillment details and a tracking number shortly.`
                  });
                }
              }
              try {
                const metadata = (mapped.metadata ?? {}) as {
                  buyerName?: string;
                  buyerEmail?: string;
                  buyerPhone?: string;
                  notes?: string;
                };
                const amountLabel = (mapped.amount / 100).toLocaleString(undefined, {
                  style: "currency",
                  currency: mapped.currency.toUpperCase()
                });
                const reminderTasks: Promise<unknown>[] = [];
                if (metadata.buyerEmail) {
                  reminderTasks.push(
                    sendOrderReceiptEmail({
                      to: metadata.buyerEmail,
                      recipientName: metadata.buyerName,
                      orderId: mapped.orderId,
                      amountLabel,
                      artworkTitle,
                      role: "buyer",
                      counterpartyName: sellerName,
                      notes: metadata.notes
                    })
                  );
                }
                if (sellerSummary?.email) {
                  reminderTasks.push(
                    sendOrderReceiptEmail({
                      to: sellerSummary.email,
                      recipientName: sellerName,
                      orderId: mapped.orderId,
                      amountLabel,
                      artworkTitle,
                      role: "seller",
                      counterpartyName: metadata.buyerName ?? buyerName,
                      notes: metadata.notes
                    })
                  );
                }
                if (metadata.buyerPhone) {
                  reminderTasks.push(
                    sendTransactionalSms({
                      to: metadata.buyerPhone,
                      message: `Your order ${mapped.orderId.slice(0, 8).toUpperCase()} for ${artworkTitle} is confirmed.`
                    })
                  );
                }
                if (reminderTasks.length) {
                  await Promise.all(reminderTasks);
                }
              } catch (reminderError) {
                console.warn(
                  "[supabase] orders.confirmPayment reminders failed:",
                  reminderError instanceof Error ? reminderError.message : reminderError
                );
              }
            } catch (notifyError) {
              console.warn(
                "[supabase] orders.confirmPayment notification failed:",
                notifyError instanceof Error ? notifyError.message : notifyError
              );
            }
          }
          return mapped;
        } catch (error) {
          console.warn("[supabase] orders.confirmPayment falling back:", error);
          let updated: Order | undefined;
          fallbackOrders = fallbackOrders.map((order) => {
            if (order.stripePaymentIntentId === paymentIntentId) {
              updated = { ...order, status };
              return updated;
            }
            return order;
          });
          if (!updated) {
            throw new Error("Order not found");
          }
          if (status === "paid" && updated) {
            fallbackArtworks = fallbackArtworks.map((artwork) =>
              artwork.artworkId === updated?.artworkId ? { ...artwork, status: "sold", isSold: true } : artwork
            );
            try {
              const [buyerSummary, sellerSummary, artworkSummary] = await Promise.all([
                fetchUserSummary(updated.buyerId),
                fetchUserSummary(updated.sellerId),
                fetchArtworkSummary(updated.artworkId)
              ]);
              const artworkTitle = artworkSummary?.title ?? "an artwork";
              const buyerName = buyerSummary?.displayName ?? buyerSummary?.email ?? updated.buyerId;
              const sellerName = sellerSummary?.displayName ?? sellerSummary?.email ?? updated.sellerId;
              await Promise.all([
                createNotificationEntry({
                  userId: updated.sellerId,
                  kind: "order",
                  title: `New order from ${buyerName}`,
                  body: `${buyerName} purchased "${artworkTitle}". Review the order details.`,
                  link: `/marketplace/orders/${updated.orderId}`,
                  metadata: { orderId: updated.orderId, artworkId: updated.artworkId }
                }),
                createNotificationEntry({
                  userId: updated.buyerId,
                  kind: "order",
                  title: `Order confirmed: ${artworkTitle}`,
                  body: `Thanks for collecting from ${sellerName}. We'll follow up with tracking info soon.`,
                  link: `/marketplace/orders/${updated.orderId}`,
                  metadata: { orderId: updated.orderId, artworkId: updated.artworkId }
                })
              ]);
              try {
                const metadata = (updated.metadata ?? {}) as {
                  buyerName?: string;
                  buyerEmail?: string;
                  buyerPhone?: string;
                  notes?: string;
                };
                const amountLabel = (updated.amount / 100).toLocaleString(undefined, {
                  style: "currency",
                  currency: updated.currency.toUpperCase()
                });
                const reminderTasks: Promise<unknown>[] = [];
                if (metadata.buyerEmail) {
                  reminderTasks.push(
                    sendOrderReceiptEmail({
                      to: metadata.buyerEmail,
                      recipientName: metadata.buyerName,
                      orderId: updated.orderId,
                      amountLabel,
                      artworkTitle,
                      role: "buyer",
                      counterpartyName: sellerName,
                      notes: metadata.notes
                    })
                  );
                }
                if (sellerSummary?.email) {
                  reminderTasks.push(
                    sendOrderReceiptEmail({
                      to: sellerSummary.email,
                      recipientName: sellerName,
                      orderId: updated.orderId,
                      amountLabel,
                      artworkTitle,
                      role: "seller",
                      counterpartyName: metadata.buyerName ?? buyerName,
                      notes: metadata.notes
                    })
                  );
                }
                if (metadata.buyerPhone) {
                  reminderTasks.push(
                    sendTransactionalSms({
                      to: metadata.buyerPhone,
                      message: `Your order ${updated.orderId.slice(0, 8).toUpperCase()} for ${artworkTitle} is confirmed.`
                    })
                  );
                }
                if (reminderTasks.length) {
                  await Promise.all(reminderTasks);
                }
              } catch (reminderFallbackError) {
                console.warn(
                  "[supabase] orders.confirmPayment fallback reminders failed:",
                  reminderFallbackError instanceof Error ? reminderFallbackError.message : reminderFallbackError
                );
              }
            } catch (notifyFallbackError) {
              console.warn(
                "[supabase] orders.confirmPayment fallback notification failed:",
                notifyFallbackError instanceof Error ? notifyFallbackError.message : notifyFallbackError
              );
            }
          }
          return updated;
        }
      },
      get: async (orderId) => {
        try {
          const { data, error } = await admin.from("orders").select("*").eq("order_id", orderId).single();
          if (error || !data) {
            throw error ?? new Error("Order not found");
          }
          const mapped = mapOrderRow(data);
          fallbackOrders = mergeById(fallbackOrders, [mapped], (item) => item.orderId);
          return mapped;
        } catch (error) {
          console.warn("[supabase] orders.get falling back:", error instanceof Error ? error.message : error);
          return fallbackOrders.find((order) => order.orderId === orderId) ?? null;
        }
      },
      listForUser: async ({ userId, role = "all" }) => {
        const buildQuery = () => {
          if (role === "buyer") {
            return admin.from("orders").select("*").eq("buyer_id", userId);
          }
          if (role === "seller") {
            return admin.from("orders").select("*").eq("seller_id", userId);
          }
          return admin.from("orders").select("*").or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
        };
        try {
          const { data, error } = await buildQuery().order("created_at", { ascending: false });
          if (error || !data) {
            throw error ?? new Error("Unable to fetch orders");
          }
          const mapped = data.map(mapOrderRow);
          fallbackOrders = mergeById(fallbackOrders, mapped, (item) => item.orderId);
          return mapped;
        } catch (error) {
          console.warn("[supabase] orders.listForUser falling back:", error instanceof Error ? error.message : error);
          return fallbackOrders
            .filter((order) => {
              if (role === "buyer") return order.buyerId === userId;
              if (role === "seller") return order.sellerId === userId;
              return order.buyerId === userId || order.sellerId === userId;
            })
            .sort((a, b) => b.createdAt - a.createdAt);
        }
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
          updates.title = data.title ?? undefined;
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
      summary: async ({ userId }) => {
        if (!userId) {
          return { total: 0, logs: [] };
        }
        if (!clients) {
          return getRewardSummaryForUser(userId);
        }
        try {
          const { admin } = clients;
          const { data, error } = await admin
            .from("rewards")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
          if (error || !data) {
            throw error ?? new Error("Unable to load rewards");
          }
          const mapped: RewardLog[] =
            data?.map((row) => ({
              id: row.id ?? generateId(),
              userId: row.user_id,
              action: (row.action as RewardLog["action"]) ?? "checkin",
              points: row.points ?? 0,
              createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
            })) ?? [];
          fallbackRewards = [
            ...fallbackRewards.filter((log) => log.userId !== userId),
            ...mapped
          ];
          return {
            total: mapped.reduce((sum, log) => sum + log.points, 0),
            logs: mapped
          };
        } catch (error) {
          console.warn("[supabase] rewards.summary falling back:", error);
          return getRewardSummaryForUser(userId);
        }
      },
      log: async (log) => {
        const entry: RewardLog = {
          ...log,
          id: log.id ?? generateId(),
          createdAt: log.createdAt ?? Date.now()
        };
        if (!clients) {
          fallbackRewards = [...fallbackRewards, entry];
          return entry;
        }
        try {
          const { admin } = clients;
          const { error } = await admin.from("rewards").insert({
            id: entry.id,
            user_id: entry.userId,
            action: entry.action,
            points: entry.points,
            created_at: new Date(entry.createdAt).toISOString()
          });
          if (error) throw error;
          fallbackRewards = [...fallbackRewards, entry];
          return entry;
        } catch (error) {
          console.warn("[supabase] rewards.log falling back:", error);
          fallbackRewards = [...fallbackRewards, entry];
          return entry;
        }
      }
    },
    uploads: {
      createSignedUrl: async ({ extension }) => {
        const assetId = generateId();
        const objectPath = `marketplace/${assetId}.${extension}`;
        try {
          const { data, error } = await admin.storage
            .from(SUPABASE_STORAGE_BUCKET)
            .createSignedUploadUrl(objectPath);
          if (error || !data) {
            throw error ?? new Error("Unable to create signed upload URL");
          }
          const { data: publicUrl } = admin.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(objectPath);
          const fileUrl =
            publicUrl?.publicUrl ??
            `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${objectPath}`;
          return {
            uploadUrl: data.signedUrl,
            fileUrl,
            method: "POST" as const,
            formFields: { token: data.token },
            fileField: "file"
          };
        } catch (error) {
          console.warn(
            "[supabase] uploads.createSignedUrl falling back:",
            error instanceof Error ? error.message : error
          );
          const fallback = `https://uploads.spheraconnect.dev/${assetId}.${extension}`;
          return {
            uploadUrl: fallback,
            fileUrl: fallback
          };
        }
      }
    },
      adminQueues: {
      verification: {
        submit: async (input) => {
          const request: VerificationRequest = {
            requestId: input.requestId ?? generateId(),
            userId: input.userId,
            portfolioUrl: input.portfolioUrl ?? undefined,
            statement: input.statement ?? undefined,
            status: "pending",
            reviewerId: undefined,
            reviewedAt: undefined,
            notes: undefined,
            createdAt: Date.now()
          };
          try {
            const { data, error } = await admin
              .from("verification_requests")
              .insert({
                request_id: request.requestId,
                user_id: request.userId,
                portfolio_url: request.portfolioUrl ?? null,
                statement: request.statement ?? null,
                status: request.status,
                notes: request.notes ?? null
              })
              .select("*")
              .single();
            if (error || !data) {
              throw error ?? new Error("Unable to submit verification request");
            }
            const mapped = mapVerificationRequestRow(data);
            fallbackVerificationRequests = mergeById(
              fallbackVerificationRequests,
              [mapped],
              (item) => item.requestId
            );
            return mapped;
          } catch (error) {
            console.warn("[supabase] verification.submit fallback:", error instanceof Error ? error.message : error);
            fallbackVerificationRequests = mergeById(
              fallbackVerificationRequests,
              [request],
              (item) => item.requestId
            );
            return request;
          }
        },
        list: async (input) => {
          const status = input?.status;
          const readFallback = () =>
            [...fallbackVerificationRequests.filter((entry) => (status ? entry.status === status : true))].sort(
              (a, b) => b.createdAt - a.createdAt
            );
          try {
            let query = admin.from("verification_requests").select("*").order("created_at", { ascending: false });
            if (status) {
              query = query.eq("status", status);
            }
            const { data, error } = await query;
            if (error) throw error;
            const mapped = (data ?? []).map(mapVerificationRequestRow);
            fallbackVerificationRequests = mergeById(
              fallbackVerificationRequests,
              mapped,
              (item) => item.requestId
            );
            return mapped;
          } catch (error) {
            console.warn("[supabase] verification.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        update: async (requestId, data) => {
          const patch: Database["public"]["Tables"]["verification_requests"]["Update"] = {};
          if (data.portfolioUrl !== undefined) patch.portfolio_url = data.portfolioUrl ?? null;
          if (data.statement !== undefined) patch.statement = data.statement ?? null;
          if (data.status !== undefined) patch.status = data.status;
          if (data.reviewerId !== undefined) patch.reviewer_id = data.reviewerId ?? null;
          if (data.reviewedAt !== undefined) patch.reviewed_at = data.reviewedAt ? new Date(data.reviewedAt).toISOString() : null;
          if (data.notes !== undefined) patch.notes = data.notes ?? null;
          try {
            const { data: row, error } = await admin
              .from("verification_requests")
              .update(patch)
              .eq("request_id", requestId)
              .select("*")
              .single();
            if (error || !row) {
              throw error ?? new Error("Verification request not found");
            }
            const mapped = mapVerificationRequestRow(row);
            fallbackVerificationRequests = mergeById(
              fallbackVerificationRequests,
              [mapped],
              (item) => item.requestId
            );
            return mapped;
          } catch (error) {
            console.warn("[supabase] verification.update fallback:", error instanceof Error ? error.message : error);
            const existing = fallbackVerificationRequests.find((entry) => entry.requestId === requestId);
            if (!existing) {
              throw error instanceof Error ? error : new Error("Verification request not found");
            }
            const updated: VerificationRequest = {
              ...existing,
              ...data,
              portfolioUrl: data.portfolioUrl !== undefined ? data.portfolioUrl ?? undefined : existing.portfolioUrl,
              statement: data.statement !== undefined ? data.statement ?? undefined : existing.statement,
              reviewerId: data.reviewerId !== undefined ? data.reviewerId ?? undefined : existing.reviewerId,
              reviewedAt: data.reviewedAt ?? existing.reviewedAt,
              notes: data.notes !== undefined ? data.notes ?? undefined : existing.notes,
              status: data.status ?? existing.status
            };
            fallbackVerificationRequests = mergeById(fallbackVerificationRequests, [updated], (item) => item.requestId);
            return updated;
          }
        }
      },
      moderation: {
        report: async (input) => {
          const report: ModerationQueueItem = {
            queueId: input.queueId ?? generateId(),
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            reportedBy: input.reportedBy ?? undefined,
            reason: input.reason ?? undefined,
            status: "open",
            reviewerId: undefined,
            reviewedAt: undefined,
            resolution: undefined,
            createdAt: Date.now()
          };
          try {
            const { data, error } = await admin
              .from("moderation_queue")
              .insert({
                queue_id: report.queueId,
                resource_type: report.resourceType,
                resource_id: report.resourceId,
                reported_by: report.reportedBy ?? null,
                reason: report.reason ?? null,
                status: report.status
              })
              .select("*")
              .single();
            if (error || !data) {
              throw error ?? new Error("Unable to submit report");
            }
            const mapped = mapModerationQueueRow(data);
            fallbackModerationQueue = mergeById(fallbackModerationQueue, [mapped], (item) => item.queueId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] moderation.report fallback:", error instanceof Error ? error.message : error);
            fallbackModerationQueue = mergeById(fallbackModerationQueue, [report], (item) => item.queueId);
            return report;
          }
        },
        list: async (input) => {
          const status = input?.status;
          const readFallback = () =>
            [...fallbackModerationQueue.filter((entry) => (status ? entry.status === status : true))].sort(
              (a, b) => b.createdAt - a.createdAt
            );
          try {
            let query = admin.from("moderation_queue").select("*").order("created_at", { ascending: false });
            if (status) {
              query = query.eq("status", status);
            }
            const { data, error } = await query;
            if (error) throw error;
            const mapped = (data ?? []).map(mapModerationQueueRow);
            fallbackModerationQueue = mergeById(fallbackModerationQueue, mapped, (item) => item.queueId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] moderation.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        resolve: async (queueId, data) => {
          const patch: Database["public"]["Tables"]["moderation_queue"]["Update"] = {};
          if (data.status !== undefined) patch.status = data.status;
          if (data.reviewerId !== undefined) patch.reviewer_id = data.reviewerId ?? null;
          if (data.reviewedAt !== undefined) patch.reviewed_at = data.reviewedAt ? new Date(data.reviewedAt).toISOString() : null;
          if (data.resolution !== undefined) patch.resolution = data.resolution ?? null;
          try {
            const { data: row, error } = await admin
              .from("moderation_queue")
              .update(patch)
              .eq("queue_id", queueId)
              .select("*")
              .single();
            if (error || !row) {
              throw error ?? new Error("Moderation record not found");
            }
            const mapped = mapModerationQueueRow(row);
            fallbackModerationQueue = mergeById(fallbackModerationQueue, [mapped], (item) => item.queueId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] moderation.resolve fallback:", error instanceof Error ? error.message : error);
            const existing = fallbackModerationQueue.find((entry) => entry.queueId === queueId);
            if (!existing) {
              throw error instanceof Error ? error : new Error("Moderation record not found");
            }
            const updated: ModerationQueueItem = {
              ...existing,
              ...data,
              reviewerId: data.reviewerId !== undefined ? data.reviewerId ?? undefined : existing.reviewerId,
              reviewedAt: data.reviewedAt ?? existing.reviewedAt,
              resolution: data.resolution !== undefined ? data.resolution ?? undefined : existing.resolution,
              status: data.status ?? existing.status
            };
            fallbackModerationQueue = mergeById(fallbackModerationQueue, [updated], (item) => item.queueId);
            return updated;
          }
        }
      },
      support: {
        submit: async (input) => {
          const ticket: SupportTicket = {
            ticketId: input.ticketId ?? generateId(),
            userId: input.userId ?? undefined,
            subject: input.subject,
            body: input.body ?? undefined,
            status: "open",
            assignedTo: undefined,
            createdAt: Date.now(),
            updatedAt: undefined
          };
          try {
            const { data, error } = await admin
              .from("support_tickets")
              .insert({
                ticket_id: ticket.ticketId,
                user_id: ticket.userId ?? null,
                subject: ticket.subject,
                body: ticket.body ?? null,
                status: ticket.status
              })
              .select("*")
              .single();
            if (error || !data) {
              throw error ?? new Error("Unable to submit support ticket");
            }
            const mapped = mapSupportTicketRow(data);
            fallbackSupportTickets = mergeById(fallbackSupportTickets, [mapped], (item) => item.ticketId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] support.submit fallback:", error instanceof Error ? error.message : error);
            fallbackSupportTickets = mergeById(fallbackSupportTickets, [ticket], (item) => item.ticketId);
            return ticket;
          }
        },
        list: async (input) => {
          const status = input?.status;
          const readFallback = () =>
            [...fallbackSupportTickets.filter((entry) => (status ? entry.status === status : true))].sort(
              (a, b) => b.createdAt - a.createdAt
            );
          try {
            let query = admin.from("support_tickets").select("*").order("created_at", { ascending: false });
            if (status) {
              query = query.eq("status", status);
            }
            const { data, error } = await query;
            if (error) throw error;
            const mapped = (data ?? []).map(mapSupportTicketRow);
            fallbackSupportTickets = mergeById(fallbackSupportTickets, mapped, (item) => item.ticketId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] support.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        update: async (ticketId, data) => {
          const patch: Database["public"]["Tables"]["support_tickets"]["Update"] = {
            updated_at: new Date().toISOString()
          };
          if (data.subject !== undefined) patch.subject = data.subject;
          if (data.body !== undefined) patch.body = data.body ?? null;
          if (data.status !== undefined) patch.status = data.status;
          if (data.assignedTo !== undefined) patch.assigned_to = data.assignedTo ?? null;
          try {
            const { data: row, error } = await admin
              .from("support_tickets")
              .update(patch)
              .eq("ticket_id", ticketId)
              .select("*")
              .single();
            if (error || !row) {
              throw error ?? new Error("Support ticket not found");
            }
            const mapped = mapSupportTicketRow(row);
            fallbackSupportTickets = mergeById(fallbackSupportTickets, [mapped], (item) => item.ticketId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] support.update fallback:", error instanceof Error ? error.message : error);
            const existing = fallbackSupportTickets.find((entry) => entry.ticketId === ticketId);
            if (!existing) {
              throw error instanceof Error ? error : new Error("Support ticket not found");
            }
            const updated: SupportTicket = {
              ...existing,
              ...data,
              body: data.body !== undefined ? data.body ?? undefined : existing.body,
              assignedTo: data.assignedTo !== undefined ? data.assignedTo ?? undefined : existing.assignedTo,
              status: data.status ?? existing.status,
              updatedAt: Date.now()
            };
            fallbackSupportTickets = mergeById(fallbackSupportTickets, [updated], (item) => item.ticketId);
            return updated;
          }
        }
      }
      },
      productivity: {
        fetch: async (userId) => {
          const prepareFallback = () => {
            const boards = fallbackProductivityBoards.filter((board) => board.userId === userId);
            const boardIds = new Set(boards.map((board) => board.boardId));
            const columns = fallbackProductivityColumns.filter((column) => boardIds.has(column.boardId));
            const columnIds = new Set(columns.map((column) => column.columnId));
            const cards = fallbackProductivityCards.filter((card) => columnIds.has(card.columnId));
            const todos = fallbackProductivityTodos.filter((todo) => todo.userId === userId);
            const events = fallbackProductivityEvents.filter((event) => event.userId === userId);
            const cardIds = new Set(cards.map((card) => card.cardId));
            const todoIds = new Set(todos.map((todo) => todo.todoId));
            const comments = fallbackProductivityComments.filter(
              (comment) =>
                (comment.entityType === "card" && cardIds.has(comment.entityId)) ||
                (comment.entityType === "todo" && todoIds.has(comment.entityId))
            );
            return { boards, columns, cards, todos, events, comments };
          };

          const ensureWorkspace = async () => {
            try {
              const { data: existingBoards, error: existingError } = await admin
                .from("productivity_boards")
                .select("board_id")
                .eq("user_id", userId)
                .limit(1);
              if (existingError) throw existingError;
              if ((existingBoards ?? []).length) return;

              const templateBoard = sampleProductivityBoards[0];
              const { data: boardRow, error: boardError } = await admin
                .from("productivity_boards")
                .insert({
                  user_id: userId,
                  title: templateBoard?.title ?? "Creative workspace",
                  description: templateBoard?.description ?? null
                })
                .select("*")
                .single();
              if (boardError || !boardRow) {
                throw boardError ?? new Error("Unable to seed productivity board");
              }
              const columnTemplates =
                sampleProductivityColumns.length > 0
                  ? sampleProductivityColumns
                  : [
                      { title: "Backlog", position: 0, color: null },
                      { title: "In Progress", position: 1, color: null },
                      { title: "Done", position: 2, color: null }
                    ];
              const columnPayload = columnTemplates.map((column, index) => ({
                board_id: boardRow.board_id,
                title: column.title ?? `Column ${index + 1}`,
                position: column.position ?? index,
                color: column.color ?? null
              }));
              if (columnPayload.length) {
                await admin.from("productivity_columns").insert(columnPayload);
              }
            } catch (error) {
              console.warn("[supabase] ensureProductivityWorkspace:", error instanceof Error ? error.message : error);
            }
          };

          const loadSnapshot = async (): Promise<{
            boards: ProductivityBoard[];
            columns: ProductivityColumn[];
            cards: ProductivityCard[];
            todos: ProductivityTodo[];
            events: ProductivityCalendarEvent[];
            comments: ProductivityComment[];
          }> => {
            const [{ data: boardRows, error: boardError }, { data: columnRows, error: columnError }, { data: cardRows, error: cardError }] =
              await Promise.all([
                admin.from("productivity_boards").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
                admin
                  .from("productivity_columns")
                  .select("*")
                  .order("position", { ascending: true }),
                admin
                  .from("productivity_cards")
                  .select("*")
                  .order("position", { ascending: true })
              ]);
            if (boardError || columnError || cardError) {
              throw boardError ?? columnError ?? cardError;
            }
            const boards = (boardRows ?? []).map(mapProductivityBoardRow);
            const boardIds = new Set(boards.map((board) => board.boardId));
            const columns = (columnRows ?? []).map(mapProductivityColumnRow).filter((column) => boardIds.has(column.boardId));
            const columnIds = new Set(columns.map((column) => column.columnId));
            const cards = (cardRows ?? []).map(mapProductivityCardRow).filter((card) => columnIds.has(card.columnId));
            const [{ data: todoRows, error: todoError }, { data: eventRows, error: eventError }] = await Promise.all([
              admin.from("productivity_todos").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
              admin.from("productivity_events").select("*").eq("user_id", userId).order("start_at", { ascending: true })
            ]);
            if (todoError || eventError) {
              throw todoError ?? eventError;
            }
            const todos = (todoRows ?? []).map(mapProductivityTodoRow);
            const events = (eventRows ?? []).map(mapProductivityEventRow);
            const cardIds = cards.map((card) => card.cardId);
            const todoIds = todos.map((todo) => todo.todoId);
            let comments: ProductivityComment[] = [];
            if (cardIds.length || todoIds.length) {
              const [cardComments, todoComments] = await Promise.all([
                cardIds.length
                  ? admin
                      .from("productivity_comments")
                      .select("*")
                      .eq("entity_type", "card")
                      .in("entity_id", cardIds)
                  : { data: [], error: null },
                todoIds.length
                  ? admin
                      .from("productivity_comments")
                      .select("*")
                      .eq("entity_type", "todo")
                      .in("entity_id", todoIds)
                  : { data: [], error: null }
              ]);
              if (cardComments.error || todoComments.error) {
                throw cardComments.error ?? todoComments.error;
              }
              comments = [...(cardComments.data ?? []), ...(todoComments.data ?? [])].map(mapProductivityCommentRow);
            }
            return { boards, columns, cards, todos, events, comments };
          };

          try {
            let snapshot = await loadSnapshot();
            if (!snapshot.boards.length) {
              await ensureWorkspace();
              snapshot = await loadSnapshot();
            }
            fallbackProductivityBoards = mergeById(fallbackProductivityBoards, snapshot.boards, (item) => item.boardId);
            fallbackProductivityColumns = mergeById(fallbackProductivityColumns, snapshot.columns, (item) => item.columnId);
            fallbackProductivityCards = mergeById(fallbackProductivityCards, snapshot.cards, (item) => item.cardId);
            fallbackProductivityTodos = mergeById(fallbackProductivityTodos, snapshot.todos, (item) => item.todoId);
            fallbackProductivityEvents = mergeById(fallbackProductivityEvents, snapshot.events, (item) => item.eventId);
            fallbackProductivityComments = mergeById(fallbackProductivityComments, snapshot.comments, (item) => item.commentId);
            return snapshot;
          } catch (error) {
            console.warn("[supabase] productivity.fetch fallback:", error instanceof Error ? error.message : error);
            return prepareFallback();
          }
        },
        createCard: async (input) => {
          try {
            const payload: Database["public"]["Tables"]["productivity_cards"]["Insert"] = {
              column_id: input.columnId,
              title: input.title,
              description: input.description ?? null,
              labels: input.labels ?? [],
              due_date: input.dueDate ? new Date(input.dueDate).toISOString() : null,
              assignees: input.assignees ?? [],
              metadata: input.metadata ?? null,
              position: input.position ?? 0,
              priority: input.priority ?? "medium"
            };
            const { data, error } = await admin.from("productivity_cards").insert(payload).select("*").single();
            if (error || !data) {
              throw error ?? new Error("Unable to create card");
            }
            const mapped = mapProductivityCardRow(data);
            fallbackProductivityCards = mergeById(fallbackProductivityCards, [mapped], (item) => item.cardId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] productivity.createCard fallback:", error instanceof Error ? error.message : error);
            const card: ProductivityCard = {
              cardId: generateId(),
              columnId: input.columnId,
              title: input.title,
              description: input.description ?? undefined,
              labels: input.labels ?? [],
              dueDate: input.dueDate,
              assignees: input.assignees ?? [],
              metadata: input.metadata,
              position: input.position ?? 0,
              priority: input.priority ?? "medium",
              createdAt: Date.now()
            };
            fallbackProductivityCards = mergeById(fallbackProductivityCards, [card], (item) => item.cardId);
            return card;
          }
        },
        moveCard: async ({ cardId, columnId, position }) => {
          try {
            const { data, error } = await admin
              .from("productivity_cards")
              .update({ column_id: columnId, position })
              .eq("card_id", cardId)
              .select("*")
              .single();
            if (error || !data) {
              throw error ?? new Error("Unable to move card");
            }
            const mapped = mapProductivityCardRow(data);
            fallbackProductivityCards = mergeById(fallbackProductivityCards, [mapped], (item) => item.cardId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] productivity.moveCard fallback:", error instanceof Error ? error.message : error);
            let updated: ProductivityCard | undefined;
            fallbackProductivityCards = fallbackProductivityCards.map((card) => {
              if (card.cardId === cardId) {
                updated = { ...card, columnId, position };
                return updated;
              }
              return card;
            });
            if (!updated) throw new Error("Card not found");
            return updated;
          }
        },
        updateCard: async (cardId, data) => {
          const patch: Database["public"]["Tables"]["productivity_cards"]["Update"] = {};
          if (data.title !== undefined) patch.title = data.title;
          if (data.description !== undefined) patch.description = data.description ?? null;
          if (data.labels !== undefined) patch.labels = data.labels;
          if (data.dueDate !== undefined) patch.due_date = data.dueDate ? new Date(data.dueDate).toISOString() : null;
          if (data.assignees !== undefined) patch.assignees = data.assignees;
          if (data.metadata !== undefined) patch.metadata = data.metadata ?? null;
          if (data.position !== undefined) patch.position = data.position;
          if (data.columnId !== undefined) patch.column_id = data.columnId;
          if (data.priority !== undefined) patch.priority = data.priority;
          try {
            const { data: row, error } = await admin
              .from("productivity_cards")
              .update(patch)
              .eq("card_id", cardId)
              .select("*")
              .single();
            if (error || !row) {
              throw error ?? new Error("Unable to update card");
            }
            const mapped = mapProductivityCardRow(row);
            fallbackProductivityCards = mergeById(fallbackProductivityCards, [mapped], (item) => item.cardId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] productivity.updateCard fallback:", error instanceof Error ? error.message : error);
            let updated: ProductivityCard | undefined;
            fallbackProductivityCards = fallbackProductivityCards.map((card) => {
              if (card.cardId === cardId) {
                updated = {
                  ...card,
                  ...data,
                  labels: data.labels ?? card.labels,
                  assignees: data.assignees ?? card.assignees,
                  metadata: data.metadata ?? card.metadata,
                  position: data.position ?? card.position,
                  columnId: data.columnId ?? card.columnId,
                  dueDate: data.dueDate ?? card.dueDate
                };
                return updated;
              }
              return card;
            });
            if (!updated) throw new Error("Card not found");
            return updated;
          }
        },
        createTodo: async (input) => {
          try {
            const payload: Database["public"]["Tables"]["productivity_todos"]["Insert"] = {
              user_id: input.userId,
              title: input.title,
              completed: input.completed ?? false,
              due_date: input.dueDate ? new Date(input.dueDate).toISOString() : null,
              tags: input.tags ?? [],
              priority: input.priority ?? "medium"
            };
            const { data, error } = await admin.from("productivity_todos").insert(payload).select("*").single();
            if (error || !data) throw error ?? new Error("Unable to create todo");
            const mapped = mapProductivityTodoRow(data);
            fallbackProductivityTodos = mergeById(fallbackProductivityTodos, [mapped], (item) => item.todoId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] productivity.createTodo fallback:", error instanceof Error ? error.message : error);
            const todo: ProductivityTodo = {
              todoId: generateId(),
              userId: input.userId,
              title: input.title,
              completed: input.completed ?? false,
              dueDate: input.dueDate,
              tags: input.tags ?? [],
              priority: input.priority ?? "medium",
              createdAt: Date.now()
            };
            fallbackProductivityTodos = mergeById(fallbackProductivityTodos, [todo], (item) => item.todoId);
            return todo;
          }
        },
        updateTodo: async (todoId, data) => {
          const patch: Database["public"]["Tables"]["productivity_todos"]["Update"] = {};
          if (data.title !== undefined) patch.title = data.title;
          if (data.dueDate !== undefined) patch.due_date = data.dueDate ? new Date(data.dueDate).toISOString() : null;
          if (data.tags !== undefined) patch.tags = data.tags;
          if (data.priority !== undefined) patch.priority = data.priority;
          try {
            const { data: row, error } = await admin
              .from("productivity_todos")
              .update(patch)
              .eq("todo_id", todoId)
              .select("*")
              .single();
            if (error || !row) throw error ?? new Error("Unable to update todo");
            const mapped = mapProductivityTodoRow(row);
            fallbackProductivityTodos = mergeById(fallbackProductivityTodos, [mapped], (item) => item.todoId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] productivity.updateTodo fallback:", error instanceof Error ? error.message : error);
            let updated: ProductivityTodo | undefined;
            fallbackProductivityTodos = fallbackProductivityTodos.map((todo) => {
              if (todo.todoId === todoId) {
                updated = {
                  ...todo,
                  ...data,
                  tags: data.tags ?? todo.tags,
                  priority: data.priority ?? todo.priority,
                  dueDate: data.dueDate ?? todo.dueDate,
                  title: data.title ?? todo.title
                };
                return updated;
              }
              return todo;
            });
            if (!updated) throw new Error("Todo not found");
            return updated;
          }
        },
        toggleTodo: async (todoId, completed) => {
          try {
            const { data, error } = await admin
              .from("productivity_todos")
              .update({ completed })
              .eq("todo_id", todoId)
              .select("*")
              .single();
            if (error || !data) throw error ?? new Error("Unable to update todo");
            const mapped = mapProductivityTodoRow(data);
            fallbackProductivityTodos = mergeById(fallbackProductivityTodos, [mapped], (item) => item.todoId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] productivity.toggleTodo fallback:", error instanceof Error ? error.message : error);
            let updated: ProductivityTodo | undefined;
            fallbackProductivityTodos = fallbackProductivityTodos.map((todo) => {
              if (todo.todoId === todoId) {
                updated = { ...todo, completed };
                return updated;
              }
              return todo;
            });
            if (!updated) throw new Error("Todo not found");
            return updated;
          }
        },
        deleteTodo: async (todoId) => {
          try {
            await admin.from("productivity_todos").delete().eq("todo_id", todoId);
            fallbackProductivityTodos = fallbackProductivityTodos.filter((todo) => todo.todoId !== todoId);
          } catch (error) {
            console.warn("[supabase] productivity.deleteTodo fallback:", error instanceof Error ? error.message : error);
            fallbackProductivityTodos = fallbackProductivityTodos.filter((todo) => todo.todoId !== todoId);
          }
        },
        createEvent: async (input) => {
          try {
            const payload: Database["public"]["Tables"]["productivity_events"]["Insert"] = {
              user_id: input.userId,
              title: input.title,
              description: input.description ?? null,
              start_at: new Date(input.startAt).toISOString(),
              end_at: input.endAt ? new Date(input.endAt).toISOString() : null,
              location: input.location ?? null,
              color: input.color ?? null,
              metadata: input.metadata ?? null
            };
            if (input.eventId) {
              payload.event_id = input.eventId;
            }
            const { data, error } = await admin.from("productivity_events").insert(payload).select("*").single();
            if (error || !data) throw error ?? new Error("Unable to create event");
            const mapped = mapProductivityEventRow(data);
            fallbackProductivityEvents = mergeById(fallbackProductivityEvents, [mapped], (item) => item.eventId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] productivity.createEvent fallback:", error instanceof Error ? error.message : error);
            const event: ProductivityCalendarEvent = {
              eventId: input.eventId ?? generateId(),
              userId: input.userId,
              title: input.title,
              description: input.description ?? undefined,
              startAt: input.startAt,
              endAt: input.endAt,
              location: input.location ?? undefined,
              color: input.color ?? undefined,
              metadata: input.metadata ?? undefined,
              createdAt: Date.now()
            };
            fallbackProductivityEvents = mergeById(fallbackProductivityEvents, [event], (item) => item.eventId);
            return event;
          }
        },
        updateEvent: async (eventId, data) => {
          const patch: Database["public"]["Tables"]["productivity_events"]["Update"] = {};
          if (data.title !== undefined) patch.title = data.title;
          if (data.description !== undefined) patch.description = data.description ?? null;
          if (data.startAt !== undefined) patch.start_at = new Date(data.startAt).toISOString();
          if (data.endAt !== undefined) patch.end_at = data.endAt ? new Date(data.endAt).toISOString() : null;
          if (data.location !== undefined) patch.location = data.location ?? null;
          if (data.color !== undefined) patch.color = data.color ?? null;
          if (data.metadata !== undefined) patch.metadata = data.metadata ?? null;
          try {
            const { data: row, error } = await admin
              .from("productivity_events")
              .update(patch)
              .eq("event_id", eventId)
              .select("*")
              .single();
            if (error || !row) throw error ?? new Error("Unable to update event");
            const mapped = mapProductivityEventRow(row);
            fallbackProductivityEvents = mergeById(fallbackProductivityEvents, [mapped], (item) => item.eventId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] productivity.updateEvent fallback:", error instanceof Error ? error.message : error);
            let updated: ProductivityCalendarEvent | undefined;
            fallbackProductivityEvents = fallbackProductivityEvents.map((event) => {
              if (event.eventId === eventId) {
                updated = {
                  ...event,
                  ...data,
                  metadata: data.metadata ?? event.metadata
                };
                return updated;
              }
              return event;
            });
            if (!updated) throw new Error("Event not found");
            return updated;
          }
        },
        deleteEvent: async (eventId) => {
          try {
            await admin.from("productivity_events").delete().eq("event_id", eventId);
            fallbackProductivityEvents = fallbackProductivityEvents.filter((event) => event.eventId !== eventId);
          } catch (error) {
            console.warn("[supabase] productivity.deleteEvent fallback:", error instanceof Error ? error.message : error);
            fallbackProductivityEvents = fallbackProductivityEvents.filter((event) => event.eventId !== eventId);
          }
        },
        listComments: async ({ entityType, entityId }) => {
          const fallback = () =>
            fallbackProductivityComments
              .filter((comment) => comment.entityType === entityType && comment.entityId === entityId)
              .sort((a, b) => a.createdAt - b.createdAt);
          try {
            const { data, error } = await admin
              .from("productivity_comments")
              .select("*")
              .eq("entity_type", entityType)
              .eq("entity_id", entityId)
              .order("created_at", { ascending: true });
            if (error) throw error;
            const mapped = (data ?? []).map(mapProductivityCommentRow);
            fallbackProductivityComments = mergeById(fallbackProductivityComments, mapped, (item) => item.commentId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] productivity.listComments fallback:", error instanceof Error ? error.message : error);
            return fallback();
          }
        },
        addComment: async (input) => {
          try {
            const payload: Database["public"]["Tables"]["productivity_comments"]["Insert"] = {
              comment_id: input.commentId,
              entity_type: input.entityType,
              entity_id: input.entityId,
              user_id: input.userId,
              author_name: input.authorName ?? null,
              body: input.body
            };
            const { data, error } = await admin.from("productivity_comments").insert(payload).select("*").single();
            if (error || !data) throw error ?? new Error("Unable to add comment");
            const mapped = mapProductivityCommentRow(data);
            fallbackProductivityComments = mergeById(fallbackProductivityComments, [mapped], (item) => item.commentId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] productivity.addComment fallback:", error instanceof Error ? error.message : error);
            const comment: ProductivityComment = {
              commentId: input.commentId ?? generateId(),
              entityType: input.entityType,
              entityId: input.entityId,
              userId: input.userId,
              authorName: input.authorName ?? undefined,
              body: input.body,
              createdAt: Date.now()
            };
            fallbackProductivityComments = mergeById(fallbackProductivityComments, [comment], (item) => item.commentId);
            return comment;
          }
        }
      },
      helpCenter: {
      users: {
        list: async () => {
          const readFallback = () => [...fallbackHelpUsers].sort((a, b) => b.createdAt - a.createdAt);
          try {
            const { data, error } = await admin.from("User").select("*").order("createdAt", { ascending: false });
            if (error) throw error;
            const mapped = (data ?? []).map(mapHelpUserRow);
            fallbackHelpUsers = mergeById(fallbackHelpUsers, mapped, (item) => item.id);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.users.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        upsert: async (input) => {
          const existing = fallbackHelpUsers.find((entry) => entry.id === input.id);
          const nowTs = Date.now();
          const record: HelpUser = {
            id: input.id,
            email: input.email ?? existing?.email ?? `${input.id}@example.com`,
            fullName: input.fullName ?? existing?.fullName,
            avatarUrl: input.avatarUrl ?? existing?.avatarUrl,
            phoneVerified: input.phoneVerified ?? existing?.phoneVerified ?? false,
            idVerified: input.idVerified ?? existing?.idVerified ?? false,
            trustLevel: input.trustLevel ?? existing?.trustLevel ?? "MEMBER",
            createdAt: existing?.createdAt ?? nowTs,
            updatedAt: nowTs,
            about: input.about ?? existing?.about,
            aboutGenerated: input.aboutGenerated ?? existing?.aboutGenerated,
            location: input.location ?? existing?.location,
            phone: input.phone ?? existing?.phone,
            preferredCategories: input.preferredCategories ?? existing?.preferredCategories ?? [],
            profileTags: input.profileTags ?? existing?.profileTags ?? [],
            pronouns: input.pronouns ?? existing?.pronouns,
            publicProfile: input.publicProfile ?? existing?.publicProfile ?? true,
            radiusPreference: input.radiusPreference ?? existing?.radiusPreference ?? 5
          };
          const payload: Database["public"]["Tables"]["User"]["Insert"] = {
            id: record.id,
            email: record.email,
            fullName: record.fullName ?? null,
            avatarUrl: record.avatarUrl ?? null,
            phoneVerified: record.phoneVerified,
            idVerified: record.idVerified,
            trustLevel: record.trustLevel,
            createdAt: new Date(record.createdAt).toISOString(),
            updatedAt: new Date(record.updatedAt).toISOString(),
            about: record.about ?? null,
            aboutGenerated: record.aboutGenerated ?? null,
            location: record.location ?? null,
            phone: record.phone ?? null,
            preferredCategories: record.preferredCategories,
            profileTags: record.profileTags,
            pronouns: record.pronouns ?? null,
            publicProfile: record.publicProfile,
            radiusPreference: record.radiusPreference
          };
          try {
            const { data, error } = await admin.from("User").upsert(payload, { onConflict: "id" }).select("*").single();
            if (error || !data) {
              throw error ?? new Error("Unable to upsert help user");
            }
            const mapped = mapHelpUserRow(data);
            fallbackHelpUsers = mergeById(fallbackHelpUsers, [mapped], (item) => item.id);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.users.upsert fallback:", error instanceof Error ? error.message : error);
            fallbackHelpUsers = mergeById(fallbackHelpUsers, [record], (item) => item.id);
            return record;
          }
        }
      },
      requests: {
        list: async (input) => {
          const status = input?.status;
          const limit = input?.limit;
          const readFallback = () =>
            [...fallbackHelpRequests.filter((entry) => (status ? entry.status === status : true))]
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, limit ?? fallbackHelpRequests.length);
          try {
            let query = admin.from("HelpRequest").select("*").order("createdAt", { ascending: false });
            if (status) {
              query = query.eq("status", status);
            }
            if (limit) {
              query = query.limit(limit);
            }
            const { data, error } = await query;
            if (error) throw error;
            const mapped = (data ?? []).map(mapHelpRequestRow);
            fallbackHelpRequests = mergeById(fallbackHelpRequests, mapped, (item) => item.requestId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.requests.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        create: async (input) => {
          const nowTs = Date.now();
          const record: HelpRequest = {
            requestId: input.requestId ?? generateId(),
            requesterId: input.requesterId,
            title: input.title,
            description: input.description,
            summary: input.summary,
            category: input.category,
            urgency: input.urgency,
            location: input.location,
            status: input.status ?? "PUBLISHED",
            aiChecklist: input.aiChecklist,
            aiRiskScore: input.aiRiskScore ?? null,
            createdAt: nowTs,
            updatedAt: nowTs
          };
          const payload: Database["public"]["Tables"]["HelpRequest"]["Insert"] = {
            id: record.requestId,
            requesterId: record.requesterId,
            title: record.title,
            description: record.description,
            summary: record.summary ?? null,
            category: record.category,
            urgency: record.urgency,
            location: (record.location as Record<string, unknown>) ?? null,
            status: record.status,
            aiChecklist: record.aiChecklist ?? null,
            aiRiskScore: record.aiRiskScore ?? null,
            createdAt: new Date(record.createdAt).toISOString(),
            updatedAt: new Date(record.updatedAt).toISOString()
          };
          try {
            const { data, error } = await admin.from("HelpRequest").insert(payload).select("*").single();
            if (error || !data) {
              throw error ?? new Error("Unable to create help request");
            }
            const mapped = mapHelpRequestRow(data);
            fallbackHelpRequests = mergeById(fallbackHelpRequests, [mapped], (item) => item.requestId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.requests.create fallback:", error instanceof Error ? error.message : error);
            fallbackHelpRequests = mergeById(fallbackHelpRequests, [record], (item) => item.requestId);
            return record;
          }
        },
        update: async (requestId, data) => {
          const patch: Database["public"]["Tables"]["HelpRequest"]["Update"] = {
            updatedAt: new Date().toISOString()
          };
          if (data.title !== undefined) patch.title = data.title;
          if (data.description !== undefined) patch.description = data.description;
          if (data.summary !== undefined) patch.summary = data.summary ?? null;
          if (data.category !== undefined) patch.category = data.category;
          if (data.urgency !== undefined) patch.urgency = data.urgency;
          if (data.location !== undefined) patch.location = (data.location as Record<string, unknown>) ?? null;
          if (data.status !== undefined) patch.status = data.status;
          if (data.aiChecklist !== undefined) patch.aiChecklist = data.aiChecklist ?? null;
          if (data.aiRiskScore !== undefined) patch.aiRiskScore = data.aiRiskScore ?? null;
          try {
            const { data: row, error } = await admin
              .from("HelpRequest")
              .update(patch)
              .eq("id", requestId)
              .select("*")
              .single();
            if (error || !row) {
              throw error ?? new Error("Help request not found");
            }
            const mapped = mapHelpRequestRow(row);
            fallbackHelpRequests = mergeById(fallbackHelpRequests, [mapped], (item) => item.requestId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.requests.update fallback:", error instanceof Error ? error.message : error);
            const existing = fallbackHelpRequests.find((entry) => entry.requestId === requestId);
            if (!existing) throw error instanceof Error ? error : new Error("Help request not found");
            const updated: HelpRequest = {
              ...existing,
              ...data,
              location: data.location ?? existing.location,
              aiChecklist: data.aiChecklist ?? existing.aiChecklist,
              aiRiskScore: data.aiRiskScore ?? existing.aiRiskScore,
              status: data.status ?? existing.status,
              updatedAt: Date.now()
            };
            fallbackHelpRequests = mergeById(fallbackHelpRequests, [updated], (item) => item.requestId);
            return updated;
          }
        }
      },
      offers: {
        listForRequest: async (requestId) => {
          const readFallback = () =>
            [...fallbackHelpOffers.filter((offer) => offer.requestId === requestId)].sort((a, b) => b.createdAt - a.createdAt);
          try {
            const { data, error } = await admin
              .from("HelpOffer")
              .select("*")
              .eq("requestId", requestId)
              .order("createdAt", { ascending: false });
            if (error) throw error;
            const mapped = (data ?? []).map(mapHelpOfferRow);
            fallbackHelpOffers = mergeById(fallbackHelpOffers, mapped, (item) => item.offerId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.offers.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        create: async (input) => {
          const nowTs = Date.now();
          const record: HelpOffer = {
            offerId: input.offerId ?? generateId(),
            helperId: input.helperId,
            requestId: input.requestId,
            message: input.message,
            status: input.status ?? "PENDING",
            createdAt: nowTs,
            updatedAt: nowTs
          };
          const payload: Database["public"]["Tables"]["HelpOffer"]["Insert"] = {
            id: record.offerId,
            helperId: record.helperId,
            requestId: record.requestId,
            message: record.message,
            status: record.status,
            createdAt: new Date(record.createdAt).toISOString(),
            updatedAt: new Date(record.updatedAt).toISOString()
          };
          try {
            const { data, error } = await admin.from("HelpOffer").insert(payload).select("*").single();
            if (error || !data) {
              throw error ?? new Error("Unable to create help offer");
            }
            const mapped = mapHelpOfferRow(data);
            fallbackHelpOffers = mergeById(fallbackHelpOffers, [mapped], (item) => item.offerId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.offers.create fallback:", error instanceof Error ? error.message : error);
            fallbackHelpOffers = mergeById(fallbackHelpOffers, [record], (item) => item.offerId);
            return record;
          }
        },
        updateStatus: async (offerId, status) => {
          try {
            const { data, error } = await admin
              .from("HelpOffer")
              .update({ status, updatedAt: new Date().toISOString() })
              .eq("id", offerId)
              .select("*")
              .single();
            if (error || !data) {
              throw error ?? new Error("Help offer not found");
            }
            const mapped = mapHelpOfferRow(data);
            fallbackHelpOffers = mergeById(fallbackHelpOffers, [mapped], (item) => item.offerId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.offers.updateStatus fallback:", error instanceof Error ? error.message : error);
            const existing = fallbackHelpOffers.find((entry) => entry.offerId === offerId);
            if (!existing) throw error instanceof Error ? error : new Error("Help offer not found");
            const updated: HelpOffer = { ...existing, status, updatedAt: Date.now() };
            fallbackHelpOffers = mergeById(fallbackHelpOffers, [updated], (item) => item.offerId);
            return updated;
          }
        }
      },
      chats: {
        listForRequest: async (requestId) => {
          const readFallback = () =>
            [...fallbackHelpChats.filter((chat) => chat.requestId === requestId)].sort((a, b) => b.updatedAt - a.updatedAt);
          try {
            const { data, error } = await admin
              .from("Chat")
              .select("*")
              .eq("requestId", requestId)
              .order("updatedAt", { ascending: false });
            if (error) throw error;
            const mapped = (data ?? []).map(mapHelpChatRow);
            fallbackHelpChats = mergeById(fallbackHelpChats, mapped, (item) => item.chatId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.chats.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        start: async (input) => {
          const nowTs = Date.now();
          const record: HelpChat = {
            chatId: input.chatId ?? generateId(),
            requestId: input.requestId,
            helperId: input.helperId,
            requesterId: input.requesterId,
            consentLevel: input.consentLevel ?? "OFF",
            createdAt: nowTs,
            updatedAt: nowTs
          };
          const payload: Database["public"]["Tables"]["Chat"]["Insert"] = {
            id: record.chatId,
            requestId: record.requestId,
            helperId: record.helperId,
            requesterId: record.requesterId,
            consentLevel: record.consentLevel,
            createdAt: new Date(record.createdAt).toISOString(),
            updatedAt: new Date(record.updatedAt).toISOString()
          };
          try {
            const { data, error } = await admin.from("Chat").insert(payload).select("*").single();
            if (error || !data) {
              throw error ?? new Error("Unable to start help chat");
            }
            const mapped = mapHelpChatRow(data);
            fallbackHelpChats = mergeById(fallbackHelpChats, [mapped], (item) => item.chatId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.chats.start fallback:", error instanceof Error ? error.message : error);
            fallbackHelpChats = mergeById(fallbackHelpChats, [record], (item) => item.chatId);
            return record;
          }
        }
      },
      messages: {
        list: async (chatId) => {
          const readFallback = () =>
            [...fallbackHelpMessages.filter((message) => message.chatId === chatId)].sort((a, b) => a.createdAt - b.createdAt);
          try {
            const { data, error } = await admin
              .from("Message")
              .select("*")
              .eq("chatId", chatId)
              .order("createdAt", { ascending: true });
            if (error) throw error;
            const mapped = (data ?? []).map(mapHelpMessageRow);
            fallbackHelpMessages = mergeById(fallbackHelpMessages, mapped, (item) => item.messageId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.messages.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        send: async (input) => {
          const record: HelpMessage = {
            messageId: input.messageId ?? generateId(),
            chatId: input.chatId,
            authorId: input.authorId,
            content: input.content,
            aiRewrite: input.aiRewrite,
            createdAt: Date.now()
          };
          const payload: Database["public"]["Tables"]["Message"]["Insert"] = {
            id: record.messageId,
            chatId: record.chatId,
            authorId: record.authorId,
            content: record.content,
            aiRewrite: record.aiRewrite ?? null,
            createdAt: new Date(record.createdAt).toISOString()
          };
          try {
            const { data, error } = await admin.from("Message").insert(payload).select("*").single();
            if (error || !data) {
              throw error ?? new Error("Unable to send help message");
            }
            await admin.from("Chat").update({ updatedAt: new Date().toISOString() }).eq("id", record.chatId);
            const mapped = mapHelpMessageRow(data);
            fallbackHelpMessages = mergeById(fallbackHelpMessages, [mapped], (item) => item.messageId);
            fallbackHelpChats = fallbackHelpChats.map((chat) =>
              chat.chatId === record.chatId ? { ...chat, updatedAt: mapped.createdAt } : chat
            );
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.messages.send fallback:", error instanceof Error ? error.message : error);
            fallbackHelpMessages = mergeById(fallbackHelpMessages, [record], (item) => item.messageId);
            fallbackHelpChats = fallbackHelpChats.map((chat) =>
              chat.chatId === record.chatId ? { ...chat, updatedAt: record.createdAt } : chat
            );
            return record;
          }
        }
      },
      ratings: {
        listForUser: async ({ helperId, requesterId }) => {
          const readFallback = () =>
            fallbackHelpRatings.filter((rating) => {
              if (helperId && rating.helperId !== helperId) return false;
              if (requesterId && rating.requesterId !== requesterId) return false;
              return true;
            });
          try {
            let query = admin.from("Rating").select("*");
            if (helperId) query = query.eq("helperId", helperId);
            if (requesterId) query = query.eq("requesterId", requesterId);
            const { data, error } = await query;
            if (error) throw error;
            const mapped = (data ?? []).map(mapHelpRatingRow);
            fallbackHelpRatings = mergeById(fallbackHelpRatings, mapped, (item) => item.ratingId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.ratings.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        submit: async (input) => {
          const record: HelpRating = {
            ratingId: input.ratingId ?? generateId(),
            score: input.score,
            feedback: input.feedback,
            helperId: input.helperId,
            requesterId: input.requesterId,
            requestId: input.requestId,
            createdAt: Date.now()
          };
          const payload: Database["public"]["Tables"]["Rating"]["Insert"] = {
            id: record.ratingId,
            score: record.score,
            feedback: record.feedback ?? null,
            helperId: record.helperId,
            requesterId: record.requesterId,
            requestId: record.requestId,
            createdAt: new Date(record.createdAt).toISOString()
          };
          try {
            const { data, error } = await admin.from("Rating").insert(payload).select("*").single();
            if (error || !data) {
              throw error ?? new Error("Unable to submit rating");
            }
            const mapped = mapHelpRatingRow(data);
            fallbackHelpRatings = mergeById(fallbackHelpRatings, [mapped], (item) => item.ratingId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.ratings.submit fallback:", error instanceof Error ? error.message : error);
            fallbackHelpRatings = mergeById(fallbackHelpRatings, [record], (item) => item.ratingId);
            return record;
          }
        }
      },
      verification: {
        list: async (input) => {
          const status = input?.status;
          const readFallback = () =>
            fallbackHelpVerifications.filter((entry) => (status ? entry.status === status : true));
          try {
            let query = admin.from("Verification").select("*").order("createdAt", { ascending: false });
            if (status) query = query.eq("status", status);
            const { data, error } = await query;
            if (error) throw error;
            const mapped = (data ?? []).map(mapHelpVerificationRow);
            fallbackHelpVerifications = mergeById(fallbackHelpVerifications, mapped, (item) => item.verificationId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.verification.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        submit: async (input) => {
          const nowTs = Date.now();
          const record: HelpVerificationRecord = {
            verificationId: input.verificationId ?? generateId(),
            userId: input.userId,
            type: input.type,
            status: input.status ?? "PENDING",
            metadata: input.metadata,
            createdAt: nowTs,
            updatedAt: nowTs
          };
          const payload: Database["public"]["Tables"]["Verification"]["Insert"] = {
            id: record.verificationId,
            userId: record.userId,
            type: record.type,
            status: record.status,
            metadata: record.metadata ?? null,
            createdAt: new Date(record.createdAt).toISOString(),
            updatedAt: new Date(record.updatedAt).toISOString()
          };
          try {
            const { data, error } = await admin.from("Verification").insert(payload).select("*").single();
            if (error || !data) {
              throw error ?? new Error("Unable to submit verification");
            }
            const mapped = mapHelpVerificationRow(data);
            fallbackHelpVerifications = mergeById(fallbackHelpVerifications, [mapped], (item) => item.verificationId);
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.verification.submit fallback:", error instanceof Error ? error.message : error);
            fallbackHelpVerifications = mergeById(fallbackHelpVerifications, [record], (item) => item.verificationId);
            return record;
          }
        },
        updateStatus: async (verificationId, status) => {
          try {
            const { data, error } = await admin
              .from("Verification")
              .update({ status, updatedAt: new Date().toISOString() })
              .eq("id", verificationId)
              .select("*")
              .single();
            if (error || !data) {
              throw error ?? new Error("Help verification not found");
            }
            const mapped = mapHelpVerificationRow(data);
            fallbackHelpVerifications = mergeById(fallbackHelpVerifications, [mapped], (item) => item.verificationId);
            return mapped;
          } catch (error) {
            console.warn(
              "[supabase] helpCenter.verification.updateStatus fallback:",
              error instanceof Error ? error.message : error
            );
            const existing = fallbackHelpVerifications.find((entry) => entry.verificationId === verificationId);
            if (!existing) throw error instanceof Error ? error : new Error("Help verification not found");
            const updated: HelpVerificationRecord = { ...existing, status, updatedAt: Date.now() };
            fallbackHelpVerifications = mergeById(fallbackHelpVerifications, [updated], (item) => item.verificationId);
            return updated;
          }
        }
      },
      moderation: {
        list: async (input) => {
          const entityType = input?.entityType;
          const readFallback = () =>
            fallbackHelpModerationLogs.filter((entry) => (entityType ? entry.entityType === entityType : true));
          try {
            let query = admin.from("ModerationLog").select("*").order("createdAt", { ascending: false });
            if (entityType) query = query.eq("entityType", entityType);
            const { data, error } = await query;
            if (error) throw error;
            const mapped = (data ?? []).map(mapHelpModerationLogRow);
            fallbackHelpModerationLogs = mergeById(
              fallbackHelpModerationLogs,
              mapped,
              (item) => item.moderationId
            );
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.moderation.list fallback:", error instanceof Error ? error.message : error);
            return readFallback();
          }
        },
        log: async (input) => {
          const record: HelpModerationLog = {
            moderationId: input.moderationId ?? generateId(),
            entityType: input.entityType,
            entityId: input.entityId,
            action: input.action,
            notes: input.notes,
            createdAt: Date.now(),
            reviewedBy: input.reviewedBy,
            metadata: input.metadata
          };
          const payload: Database["public"]["Tables"]["ModerationLog"]["Insert"] = {
            id: record.moderationId,
            entityType: record.entityType,
            entityId: record.entityId,
            action: record.action,
            notes: record.notes ?? null,
            createdAt: new Date(record.createdAt).toISOString(),
            reviewedBy: record.reviewedBy ?? null,
            metadata: record.metadata ?? null
          };
          try {
            const { data, error } = await admin.from("ModerationLog").insert(payload).select("*").single();
            if (error || !data) {
              throw error ?? new Error("Unable to log moderation event");
            }
            const mapped = mapHelpModerationLogRow(data);
            fallbackHelpModerationLogs = mergeById(
              fallbackHelpModerationLogs,
              [mapped],
              (item) => item.moderationId
            );
            return mapped;
          } catch (error) {
            console.warn("[supabase] helpCenter.moderation.log fallback:", error instanceof Error ? error.message : error);
            fallbackHelpModerationLogs = mergeById(
              fallbackHelpModerationLogs,
              [record],
              (item) => item.moderationId
            );
            return record;
          }
        }
      }
    }
  };
};
