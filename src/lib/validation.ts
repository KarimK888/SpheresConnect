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
  mediaUrl: z.string().url().optional()
});

export const ChatSchema = z.object({
  memberIds: z.array(z.string()).min(1),
  isGroup: z.boolean(),
  title: z.string().optional()
});

export const OrderSchema = z.object({
  artworkId: z.string()
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
  action: z.enum(["onboarding", "checkin", "match", "sale", "rsvp"]),
  points: z.number().min(0),
  createdAt: z.number().optional()
});

export const UploadSchema = z.object({
  mimeType: z.string(),
  extension: z.string()
});
