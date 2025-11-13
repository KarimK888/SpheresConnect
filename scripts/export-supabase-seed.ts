import {
  sampleUsers,
  sampleArtworks,
  sampleHubs,
  sampleEvents,
  sampleCheckins,
  sampleRewardLogs,
  sampleMatchActions
} from "../src/lib/sample-data.js";

const literal = (value: string) => `'${value.replace(/'/g, "''")}'`;
const optionalLiteral = (value?: string | null) => (value ? literal(value) : "NULL");
const booleanLiteral = (value?: boolean | null) => (value ? "true" : "false");
const jsonLiteral = (value?: unknown | null) =>
  value !== undefined && value !== null ? `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb` : "NULL";
const arrayLiteral = (values?: string[] | null, cast = "text") => {
  if (!values) return "NULL";
  if (!values.length) return `ARRAY[]::${cast}[]`;
  return `ARRAY[${values.map((item) => literal(item)).join(", ")}]::${cast}[]`;
};
const isoLiteral = (value: number) => literal(new Date(value).toISOString());

const sections: string[] = [];

if (sampleUsers.length) {
  const rows = sampleUsers
    .map((user) => {
      const values = [
        literal(user.userId),
        literal(user.email),
        optionalLiteral(user.displayName),
        optionalLiteral(user.bio),
        user.skills.length ? arrayLiteral(user.skills) : "NULL",
        optionalLiteral(user.profilePictureUrl),
        user.connections.length ? arrayLiteral(user.connections) : "ARRAY[]::text[]",
        booleanLiteral(user.isVerified),
        literal(user.language),
        jsonLiteral(user.location ?? null),
        isoLiteral(user.joinedAt),
        jsonLiteral(user.profile ?? null)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Users
INSERT INTO public.users (
  user_id,
  email,
  display_name,
  bio,
  skills,
  profile_picture_url,
  connections,
  is_verified,
  language,
  location,
  joined_at,
  profile
) VALUES
  ${rows}
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  skills = EXCLUDED.skills,
  profile_picture_url = EXCLUDED.profile_picture_url,
  connections = EXCLUDED.connections,
  is_verified = EXCLUDED.is_verified,
  language = EXCLUDED.language,
  location = EXCLUDED.location,
  joined_at = EXCLUDED.joined_at,
  profile = EXCLUDED.profile;`);
}

if (sampleHubs.length) {
  const rows = sampleHubs
    .map((hub) => {
      const values = [
        literal(hub.hubId),
        literal(hub.name),
        jsonLiteral(hub.location),
        arrayLiteral(hub.activeUsers)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Hubs
INSERT INTO public.hubs (
  hub_id,
  name,
  location,
  active_users
) VALUES
  ${rows}
ON CONFLICT (hub_id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  active_users = EXCLUDED.active_users;`);
}

if (sampleArtworks.length) {
  const rows = sampleArtworks
    .map((art) => {
      const values = [
        literal(art.artworkId),
        literal(art.artistId),
        literal(art.title),
        optionalLiteral(art.description),
        arrayLiteral(art.mediaUrls),
        art.price.toString(),
        literal(art.currency),
        booleanLiteral(art.isSold),
        literal(art.status),
        arrayLiteral(art.tags),
        isoLiteral(art.createdAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Artworks
INSERT INTO public.artworks (
  artwork_id,
  artist_id,
  title,
  description,
  media_urls,
  price,
  currency,
  is_sold,
  status,
  tags,
  created_at
) VALUES
  ${rows}
ON CONFLICT (artwork_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  media_urls = EXCLUDED.media_urls,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  is_sold = EXCLUDED.is_sold,
  status = EXCLUDED.status,
  tags = EXCLUDED.tags,
  created_at = EXCLUDED.created_at;`);
}

if (sampleEvents.length) {
  const rows = sampleEvents
    .map((event) => {
      const values = [
        literal(event.eventId),
        literal(event.title),
        optionalLiteral(event.description),
        isoLiteral(event.startsAt),
        event.endsAt ? isoLiteral(event.endsAt) : "NULL",
        jsonLiteral(event.location ?? null),
        literal(event.hostUserId),
        event.attendees.length ? arrayLiteral(event.attendees) : "ARRAY[]::text[]",
        isoLiteral(event.createdAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Events
INSERT INTO public.events (
  event_id,
  title,
  description,
  starts_at,
  ends_at,
  location,
  host_user_id,
  attendees,
  created_at
) VALUES
  ${rows}
ON CONFLICT (event_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  location = EXCLUDED.location,
  host_user_id = EXCLUDED.host_user_id,
  attendees = EXCLUDED.attendees,
  created_at = EXCLUDED.created_at;`);
}

if (sampleCheckins.length) {
  const rows = sampleCheckins
    .map((checkin) => {
      const values = [
        literal(checkin.checkinId),
        literal(checkin.userId),
        optionalLiteral(checkin.hubId),
        jsonLiteral(checkin.location),
        literal(checkin.status),
        isoLiteral(checkin.expiresAt),
        isoLiteral(checkin.createdAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Check-ins
INSERT INTO public.checkins (
  checkin_id,
  user_id,
  hub_id,
  location,
  status,
  expires_at,
  created_at
) VALUES
  ${rows}
ON CONFLICT (checkin_id) DO UPDATE SET
  hub_id = EXCLUDED.hub_id,
  location = EXCLUDED.location,
  status = EXCLUDED.status,
  expires_at = EXCLUDED.expires_at,
  created_at = EXCLUDED.created_at;`);
}

if (sampleRewardLogs.length) {
  const rows = sampleRewardLogs
    .map((log) => {
      const values = [
        literal(log.id),
        literal(log.userId),
        literal(log.action),
        log.points.toString(),
        isoLiteral(log.createdAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Rewards
INSERT INTO public.rewards (
  id,
  user_id,
  action,
  points,
  created_at
) VALUES
  ${rows}
ON CONFLICT (id) DO UPDATE SET
  action = EXCLUDED.action,
  points = EXCLUDED.points,
  created_at = EXCLUDED.created_at;`);
}

if (sampleMatchActions.length) {
  const rows = sampleMatchActions
    .map((action) => {
      const values = [
        literal(action.id ?? `mat_${action.userId}`),
        literal(action.userId),
        literal(action.targetId),
        literal(action.action),
        isoLiteral(action.createdAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Match actions
INSERT INTO public.match_actions (
  id,
  user_id,
  target_id,
  action,
  created_at
) VALUES
  ${rows}
ON CONFLICT (id) DO UPDATE SET
  target_id = EXCLUDED.target_id,
  action = EXCLUDED.action,
  created_at = EXCLUDED.created_at;`);
}

console.log(`-- Generated seed script
${sections.join("\n\n")}
-- Run with: psql $DATABASE_URL -f supabase-seed.sql
`);
