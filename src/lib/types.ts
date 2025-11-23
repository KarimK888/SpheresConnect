export interface UserSocialLinks {
  website?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  behance?: string;
  dribbble?: string;
  youtube?: string;
  tiktok?: string;
  github?: string;
}

export interface UserProfileMedia {
  mediaId: string;
  type: "image" | "video" | "document";
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  tags?: string[];
}

export interface UserProfileProject {
  projectId: string;
  title: string;
  summary: string;
  link?: string;
  status?: "draft" | "live";
  mediaIds?: string[];
  tags?: string[];
  year?: number;
}

export interface UserProfile {
  headline?: string;
  locationName?: string;
  availability?: "open" | "limited" | "booked";
  timezone?: string;
  coverImageUrl?: string;
  avatarType?: "photo" | "avatar" | "initials";
  socials?: UserSocialLinks;
  media?: UserProfileMedia[];
  projects?: UserProfileProject[];
  resumeUrl?: string;
  featuredVideoUrl?: string;
  preferredCollabModes?: ("remote" | "in-person" | "hybrid")[];
}

export interface User {
  userId: string;
  email: string;
  displayName: string;
  bio?: string;
  skills: string[];
  profilePictureUrl?: string;
  connections: string[];
  isVerified: boolean;
  language: "en" | "fr" | "es";
  location?: { lat: number; lng: number };
  joinedAt: number;
  profile?: UserProfile;
}

export interface MatchSuggestion extends User {
  hubId?: string;
  hubName?: string;
  distanceKm?: number;
  sharedHub?: boolean;
  score?: number;
}

export interface Artwork {
  artworkId: string;
  artistId: string;
  title: string;
  description?: string;
  mediaUrls: string[];
  price: number;
  currency: string;
  isSold: boolean;
  status: "listed" | "negotiation" | "sold";
  tags: string[];
  createdAt: number;
}

export interface Hub {
  hubId: string;
  name: string;
  location: { lat: number; lng: number };
  activeUsers: string[];
}

export interface Checkin {
  checkinId: string;
  userId: string;
  hubId?: string;
  location: { lat: number; lng: number };
  status: "online" | "offline";
  expiresAt: number;
  createdAt: number;
}

export interface ChatAttachment {
  attachmentId: string;
  type: "image" | "video" | "audio" | "document" | "gif" | "sticker";
  url: string;
  name?: string;
  sizeBytes?: number;
  durationMs?: number;
  thumbnailUrl?: string;
}

export interface MessageReaction {
  reactionId: string;
  emoji: string;
  userId: string;
  createdAt: number;
}

export interface ChatMessage {
  messageId: string;
  chatId: string;
  senderId: string;
  content?: string;
  attachments?: ChatAttachment[];
  replyTo?: string;
  lang?: string;
  translatedFrom?: string;
  createdAt: number;
  updatedAt?: number;
  deletedAt?: number;
  deliveredTo: string[];
  readBy: string[];
  reactions: MessageReaction[];
  isSilent?: boolean;
  scheduledFor?: number;
  expiresAt?: number;
  pinned?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Chat {
  chatId: string;
  memberIds: string[];
  isGroup: boolean;
  title?: string;
  createdAt: number;
  archivedBy: string[];
  hiddenBy: string[];
}

export type OrderShippingStatus = "processing" | "preparing" | "in_transit" | "delivered" | "refunded";

export interface OrderMetadataAttachment {
  label: string;
  url: string;
}

export interface OrderMetadata {
  shippingStatus?: OrderShippingStatus;
  trackingNumber?: string;
  downloadUrl?: string;
  attachments?: OrderMetadataAttachment[];
  note?: string;
  progressPercent?: number;
  lastUpdatedAt?: number;
  lastUpdatedBy?: string;
}

export interface Order {
  orderId: string;
  artworkId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  stripePaymentIntentId?: string;
  createdAt: number;
  metadata?: OrderMetadata;
}

export interface Event {
  eventId: string;
  title: string;
  description?: string;
  startsAt: number;
  endsAt?: number;
  location?: { lat?: number; lng?: number; address?: string };
  hostUserId: string;
  attendees: string[];
  pendingAttendees: string[];
  createdAt: number;
}

export interface RewardLog {
  id: string;
  userId: string;
  action: "onboarding" | "checkin" | "match" | "sale" | "rsvp" | "bonus" | "redeem" | "transfer";
  points: number;
  createdAt: number;
  note?: string;
}

export interface MatchAction {
  id?: string;
  userId: string;
  targetId: string;
  action: "connected" | "skipped";
  createdAt: number;
}

export interface MatchActionResult {
  action: MatchAction;
  match?: {
    chatId: string;
    user: User;
  };
}

export interface MatchLikeAlert {
  action: MatchAction;
  from: User;
  isMutual: boolean;
  chatId?: string;
}

export interface ProfileProject {
  projectId: string;
  userId: string;
  title: string;
  summary?: string;
  link?: string;
  status?: "draft" | "live";
  tags: string[];
  year?: number;
  createdAt: number;
}

export interface ProfileMedia {
  mediaId: string;
  userId: string;
  projectId?: string;
  type: "image" | "video" | "document";
  title?: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  tags: string[];
  createdAt: number;
}

export interface ProfileSocialLink {
  socialId: string;
  userId: string;
  platform: string;
  handle?: string;
  url?: string;
  createdAt: number;
}

export interface OrderMilestone {
  milestoneId: string;
  orderId: string;
  title: string;
  amount: number;
  dueDate?: number;
  status: "pending" | "submitted" | "approved" | "paid";
  createdAt: number;
  updatedAt?: number;
}

export interface Payout {
  payoutId: string;
  orderId: string;
  milestoneId?: string;
  payeeId: string;
  amount: number;
  currency: string;
  status: "initiated" | "processing" | "paid" | "failed";
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface NotificationEntry {
  notificationId: string;
  userId: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  linkLabel?: string;
  secondaryLink?: string;
  secondaryLinkLabel?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  readAt?: number | null;
}

export interface VerificationRequest {
  requestId: string;
  userId: string;
  portfolioUrl?: string;
  statement?: string;
  status: "pending" | "approved" | "rejected";
  reviewerId?: string;
  reviewedAt?: number;
  notes?: string;
  createdAt: number;
}

export interface ModerationQueueItem {
  queueId: string;
  resourceType: string;
  resourceId: string;
  reportedBy?: string;
  reason?: string;
  status: "open" | "in_review" | "resolved";
  reviewerId?: string;
  reviewedAt?: number;
  resolution?: string;
  createdAt: number;
}

export interface SupportTicket {
  ticketId: string;
  userId?: string;
  subject: string;
  body?: string;
  status: "open" | "in_progress" | "closed";
  assignedTo?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ProductivityBoard {
  boardId: string;
  userId: string;
  title: string;
  description?: string;
  createdAt: number;
}

export interface ProductivityColumn {
  columnId: string;
  boardId: string;
  title: string;
  position: number;
  color?: string;
  createdAt: number;
}

export interface ProductivityCard {
  cardId: string;
  columnId: string;
  title: string;
  description?: string;
  labels: string[];
  dueDate?: number;
  assignees: string[];
  metadata?: Record<string, unknown>;
  position: number;
  priority: "low" | "medium" | "high";
  createdAt: number;
}

export interface ProductivityTodo {
  todoId: string;
  userId: string;
  title: string;
  completed: boolean;
  dueDate?: number;
  tags: string[];
  priority: "low" | "medium" | "high";
  createdAt: number;
}

export interface ProductivityCalendarEvent {
  eventId: string;
  userId: string;
  title: string;
  description?: string;
  startAt: number;
  endAt?: number;
  location?: string;
  color?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface ProductivityComment {
  commentId: string;
  entityType: "card" | "todo";
  entityId: string;
  userId: string;
  authorName?: string;
  body: string;
  createdAt: number;
}

export type Locale = "en" | "fr" | "es";

export type ConsentLevel = "OFF" | "LIMITED" | "FULL" | (string & {});
export type HelpRequestStatus = "PUBLISHED" | "MATCHED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | (string & {});
export type HelpOfferStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | (string & {});
export type HelpUrgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | (string & {});
export type HelpCategory =
  | "LOGISTICS"
  | "PRODUCTION"
  | "ADVOCACY"
  | "FUNDRAISING"
  | "SAFETY"
  | "MEDICAL"
  | (string & {});
export type HelpTrustLevel = "MEMBER" | "ALLY" | "ADMIN" | (string & {});
export type HelpVerificationStatus = "PENDING" | "APPROVED" | "REJECTED" | (string & {});

export interface HelpLocation {
  city?: string;
  region?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
  notes?: string;
}

export interface HelpUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  phoneVerified: boolean;
  idVerified: boolean;
  trustLevel: HelpTrustLevel;
  createdAt: number;
  updatedAt: number;
  about?: string;
  aboutGenerated?: string;
  location?: string;
  phone?: string;
  preferredCategories: string[];
  profileTags: string[];
  pronouns?: string;
  publicProfile: boolean;
  radiusPreference: number;
}

export interface HelpRequest {
  requestId: string;
  requesterId: string;
  title: string;
  description: string;
  summary?: string;
  category: HelpCategory;
  urgency: HelpUrgency;
  location?: HelpLocation;
  status: HelpRequestStatus;
  aiChecklist?: Record<string, unknown>;
  aiRiskScore?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface HelpOffer {
  offerId: string;
  helperId: string;
  requestId: string;
  message: string;
  status: HelpOfferStatus;
  createdAt: number;
  updatedAt: number;
}

export interface HelpChat {
  chatId: string;
  requestId: string;
  helperId: string;
  requesterId: string;
  consentLevel: ConsentLevel;
  createdAt: number;
  updatedAt: number;
}

export interface HelpMessage {
  messageId: string;
  chatId: string;
  authorId: string;
  content: string;
  aiRewrite?: string;
  createdAt: number;
}

export interface HelpRating {
  ratingId: string;
  score: number;
  feedback?: string;
  helperId: string;
  requesterId: string;
  requestId: string;
  createdAt: number;
}

export interface HelpVerificationRecord {
  verificationId: string;
  userId: string;
  type: string;
  status: HelpVerificationStatus;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface HelpModerationLog {
  moderationId: string;
  entityType: string;
  entityId: string;
  action: string;
  notes?: string;
  createdAt: number;
  reviewedBy?: string;
  metadata?: Record<string, unknown>;
}

export type MessageEvent =
  | { type: "message:created" | "message:updated" | "message:deleted" | "message:pinned"; chatId: string; message: ChatMessage }
  | { type: "reaction:added" | "reaction:removed"; chatId: string; messageId: string; reaction: MessageReaction }
  | { type: "typing"; chatId: string; userId: string; isTyping: boolean; expiresAt: number }
  | { type: "read"; chatId: string; messageId: string; userId: string; readAt: number }
  | { type: "presence"; chatId: string; userId: string; status: "online" | "offline"; updatedAt: number }
  | { type: "chat:updated"; chat: Chat }
  | { type: "chat:removed"; chatId: string };
