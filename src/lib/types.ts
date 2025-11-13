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
}

export interface Event {
  eventId: string;
  title: string;
  description?: string;
  startsAt: number;
  endsAt?: number;
  location?: { lat: number; lng: number; address?: string };
  hostUserId: string;
  attendees: string[];
  createdAt: number;
}

export interface RewardLog {
  id: string;
  userId: string;
  action: "onboarding" | "checkin" | "match" | "sale" | "rsvp";
  points: number;
  createdAt: number;
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

export type Locale = "en" | "fr" | "es";

export type MessageEvent =
  | { type: "message:created" | "message:updated" | "message:deleted" | "message:pinned"; chatId: string; message: ChatMessage }
  | { type: "reaction:added" | "reaction:removed"; chatId: string; messageId: string; reaction: MessageReaction }
  | { type: "typing"; chatId: string; userId: string; isTyping: boolean; expiresAt: number }
  | { type: "read"; chatId: string; messageId: string; userId: string; readAt: number }
  | { type: "presence"; chatId: string; userId: string; status: "online" | "offline"; updatedAt: number }
  | { type: "chat:updated"; chat: Chat }
  | { type: "chat:removed"; chatId: string };
