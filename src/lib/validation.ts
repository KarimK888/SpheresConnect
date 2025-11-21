import { z } from "zod";

export const UserSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  displayName: z.string().min(2).max(60),
  bio: z.string().max(1000).optional(),
  skills: z.array(z.string()).max(25),
  profilePictureUrl: z.string().url().optional(),
  connections: z.array(z.string()),
  isVerified: z.boolean().default(false),
  language: z.enum(["en", "fr", "es"]).default("en"),
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
  joinedAt: z.number()
});

export const ArtworkSchema = z.object({
  artworkId: z.string(),
  artistId: z.string(),
  title: z.string().min(2),
  description: z.string().max(2000).optional(),
  mediaUrls: z.array(z.string().url()),
  price: z.number().min(0),
  currency: z.string().min(3).max(3),
  isSold: z.boolean(),
  status: z.enum(["listed", "negotiation", "sold"]),
  tags: z.array(z.string()),
  createdAt: z.number()
});

export const CheckinSchema = z.object({
  hubId: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }),
  status: z.enum(["online", "offline"])
});

export const MatchRequestSchema = z.object({
  userId: z.string()
});

export const MessageSchema = z.object({
  chatId: z.string(),
  senderId: z.string(),
  content: z.string().max(4000).optional(),
  attachments: z
    .array(
      z.object({
        attachmentId: z.string(),
        type: z.enum(["image", "video", "audio", "document", "gif", "sticker"]),
        url: z.string().url(),
        name: z.string().optional(),
        sizeBytes: z.number().optional(),
        durationMs: z.number().optional(),
        thumbnailUrl: z.string().url().optional()
      })
    )
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  isSilent: z.boolean().optional(),
  scheduledFor: z.number().optional(),
  expiresAt: z.number().optional()
});

export const ChatSchema = z.object({
  memberIds: z.array(z.string()).min(1),
  isGroup: z.boolean(),
  title: z.string().optional()
});

export const OrderSchema = z.object({
  artworkId: z.string(),
  buyerId: z.string().optional(),
  buyerName: z.string().min(2).max(120).optional(),
  buyerEmail: z.string().email().optional(),
  buyerPhone: z.string().min(6).max(30).optional(),
  notes: z.string().max(2000).optional(),
  shippingAddress: z
    .object({
      line1: z.string().min(3),
      line2: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional()
    })
    .optional()
});

export const EventSchema = z.object({
  eventId: z.string().optional(),
  title: z.string().min(3),
  description: z.string().max(2000).optional(),
  startsAt: z.number().positive(),
  endsAt: z.number().positive().optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional()
    })
    .optional(),
  hostUserId: z.string(),
  attendees: z.array(z.string()).optional(),
  createdAt: z.number().optional()
});

export const RSVPEventSchema = z.object({
  userId: z.string()
});

export const EventUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().max(2000).nullable().optional(),
  startsAt: z.number().positive().optional(),
  endsAt: z.number().positive().nullable().optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional()
    })
    .nullable()
    .optional(),
  hostUserId: z.string().optional(),
  attendees: z.array(z.string()).optional()
});

export const RewardLogSchema = z.object({
  userId: z.string(),
  action: z.enum(["onboarding", "checkin", "match", "sale", "rsvp", "bonus", "redeem", "transfer"]),
  points: z.number(),
  note: z.string().max(200).optional(),
  createdAt: z.number().optional()
});

export const MatchActionSchema = z.object({
  userId: z.string().optional(),
  targetId: z.string(),
  action: z.enum(["connected", "skipped"]),
  createdAt: z.number().optional()
});

export const UploadSchema = z.object({
  mimeType: z.string(),
  extension: z.string()
});
