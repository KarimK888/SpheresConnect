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

export type Locale = "en" | "fr" | "es";

export type MessageEvent =
  | { type: "message:created" | "message:updated" | "message:deleted" | "message:pinned"; chatId: string; message: ChatMessage }
  | { type: "reaction:added" | "reaction:removed"; chatId: string; messageId: string; reaction: MessageReaction }
  | { type: "typing"; chatId: string; userId: string; isTyping: boolean; expiresAt: number }
  | { type: "read"; chatId: string; messageId: string; userId: string; readAt: number }
  | { type: "presence"; chatId: string; userId: string; status: "online" | "offline"; updatedAt: number }
  | { type: "chat:updated"; chat: Chat }
  | { type: "chat:removed"; chatId: string };
