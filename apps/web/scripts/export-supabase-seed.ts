import {
  sampleUsers,
  sampleArtworks,
  sampleHubs,
  sampleEvents,
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
  sampleProductivityEvents
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

if (sampleHelpUsers.length) {
  const rows = sampleHelpUsers
    .map((user) => {
      const values = [
        literal(user.id),
        literal(user.email),
        optionalLiteral(user.fullName),
        optionalLiteral(user.avatarUrl),
        booleanLiteral(user.phoneVerified),
        booleanLiteral(user.idVerified),
        literal(user.trustLevel),
        isoLiteral(user.createdAt),
        isoLiteral(user.updatedAt),
        optionalLiteral(user.about),
        optionalLiteral(user.aboutGenerated),
        optionalLiteral(user.location),
        optionalLiteral(user.phone),
        arrayLiteral(user.preferredCategories, "text"),
        arrayLiteral(user.profileTags, "text"),
        optionalLiteral(user.pronouns),
        booleanLiteral(user.publicProfile),
        user.radiusPreference.toString()
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Help users
INSERT INTO "User" (
  "id",
  "email",
  "fullName",
  "avatarUrl",
  "phoneVerified",
  "idVerified",
  "trustLevel",
  "createdAt",
  "updatedAt",
  "about",
  "aboutGenerated",
  "location",
  "phone",
  "preferredCategories",
  "profileTags",
  "pronouns",
  "publicProfile",
  "radiusPreference"
) VALUES
  ${rows}
ON CONFLICT ("id") DO UPDATE SET
  "email" = EXCLUDED."email",
  "fullName" = EXCLUDED."fullName",
  "avatarUrl" = EXCLUDED."avatarUrl",
  "phoneVerified" = EXCLUDED."phoneVerified",
  "idVerified" = EXCLUDED."idVerified",
  "trustLevel" = EXCLUDED."trustLevel",
  "updatedAt" = EXCLUDED."updatedAt",
  "about" = EXCLUDED."about",
  "aboutGenerated" = EXCLUDED."aboutGenerated",
  "location" = EXCLUDED."location",
  "phone" = EXCLUDED."phone",
  "preferredCategories" = EXCLUDED."preferredCategories",
  "profileTags" = EXCLUDED."profileTags",
  "pronouns" = EXCLUDED."pronouns",
  "publicProfile" = EXCLUDED."publicProfile",
  "radiusPreference" = EXCLUDED."radiusPreference";`);
}

if (sampleHelpRequests.length) {
  const rows = sampleHelpRequests
    .map((request) => {
      const values = [
        literal(request.requestId),
        literal(request.requesterId),
        literal(request.title),
        literal(request.description),
        optionalLiteral(request.summary),
        literal(request.category),
        literal(request.urgency),
        jsonLiteral(request.location),
        literal(request.status),
        jsonLiteral(request.aiChecklist ?? null),
        request.aiRiskScore !== undefined && request.aiRiskScore !== null ? request.aiRiskScore.toString() : "NULL",
        isoLiteral(request.createdAt),
        isoLiteral(request.updatedAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Help requests
INSERT INTO "HelpRequest" (
  "id",
  "requesterId",
  "title",
  "description",
  "summary",
  "category",
  "urgency",
  "location",
  "status",
  "aiChecklist",
  "aiRiskScore",
  "createdAt",
  "updatedAt"
) VALUES
  ${rows}
ON CONFLICT ("id") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "summary" = EXCLUDED."summary",
  "category" = EXCLUDED."category",
  "urgency" = EXCLUDED."urgency",
  "location" = EXCLUDED."location",
  "status" = EXCLUDED."status",
  "aiChecklist" = EXCLUDED."aiChecklist",
  "aiRiskScore" = EXCLUDED."aiRiskScore",
  "updatedAt" = EXCLUDED."updatedAt";`);
}

if (sampleHelpOffers.length) {
  const rows = sampleHelpOffers
    .map((offer) => {
      const values = [
        literal(offer.offerId),
        literal(offer.helperId),
        literal(offer.requestId),
        literal(offer.message),
        literal(offer.status),
        isoLiteral(offer.createdAt),
        isoLiteral(offer.updatedAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Help offers
INSERT INTO "HelpOffer" (
  "id",
  "helperId",
  "requestId",
  "message",
  "status",
  "createdAt",
  "updatedAt"
) VALUES
  ${rows}
ON CONFLICT ("id") DO UPDATE SET
  "message" = EXCLUDED."message",
  "status" = EXCLUDED."status",
  "updatedAt" = EXCLUDED."updatedAt";`);
}

if (sampleHelpChats.length) {
  const rows = sampleHelpChats
    .map((chat) => {
      const values = [
        literal(chat.chatId),
        literal(chat.requestId),
        literal(chat.helperId),
        literal(chat.requesterId),
        literal(chat.consentLevel),
        isoLiteral(chat.createdAt),
        isoLiteral(chat.updatedAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Help chats
INSERT INTO "Chat" (
  "id",
  "requestId",
  "helperId",
  "requesterId",
  "consentLevel",
  "createdAt",
  "updatedAt"
) VALUES
  ${rows}
ON CONFLICT ("id") DO UPDATE SET
  "consentLevel" = EXCLUDED."consentLevel",
  "updatedAt" = EXCLUDED."updatedAt";`);
}

if (sampleHelpMessages.length) {
  const rows = sampleHelpMessages
    .map((message) => {
      const values = [
        literal(message.messageId),
        literal(message.chatId),
        literal(message.authorId),
        literal(message.content),
        optionalLiteral(message.aiRewrite),
        isoLiteral(message.createdAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Help messages
INSERT INTO "Message" (
  "id",
  "chatId",
  "authorId",
  "content",
  "aiRewrite",
  "createdAt"
) VALUES
  ${rows}
ON CONFLICT ("id") DO UPDATE SET
  "content" = EXCLUDED."content",
  "aiRewrite" = EXCLUDED."aiRewrite";`);
}

if (sampleHelpRatings.length) {
  const rows = sampleHelpRatings
    .map((rating) => {
      const values = [
        literal(rating.ratingId),
        rating.score.toString(),
        optionalLiteral(rating.feedback),
        literal(rating.helperId),
        literal(rating.requesterId),
        literal(rating.requestId),
        isoLiteral(rating.createdAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Help ratings
INSERT INTO "Rating" (
  "id",
  "score",
  "feedback",
  "helperId",
  "requesterId",
  "requestId",
  "createdAt"
) VALUES
  ${rows}
ON CONFLICT ("id") DO UPDATE SET
  "score" = EXCLUDED."score",
  "feedback" = EXCLUDED."feedback",
  "createdAt" = EXCLUDED."createdAt";`);
}

if (sampleHelpVerifications.length) {
  const rows = sampleHelpVerifications
    .map((record) => {
      const values = [
        literal(record.verificationId),
        literal(record.userId),
        literal(record.type),
        literal(record.status),
        jsonLiteral(record.metadata ?? null),
        isoLiteral(record.createdAt),
        isoLiteral(record.updatedAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Help verifications
INSERT INTO "Verification" (
  "id",
  "userId",
  "type",
  "status",
  "metadata",
  "createdAt",
  "updatedAt"
) VALUES
  ${rows}
ON CONFLICT ("id") DO UPDATE SET
  "status" = EXCLUDED."status",
  "metadata" = EXCLUDED."metadata",
  "updatedAt" = EXCLUDED."updatedAt";`);
}

if (sampleHelpModerationLogs.length) {
  const rows = sampleHelpModerationLogs
    .map((log) => {
      const values = [
        literal(log.moderationId),
        literal(log.entityType),
        literal(log.entityId),
        literal(log.action),
        optionalLiteral(log.notes),
        isoLiteral(log.createdAt),
        optionalLiteral(log.reviewedBy),
        jsonLiteral(log.metadata ?? null)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Help moderation logs
INSERT INTO "ModerationLog" (
  "id",
  "entityType",
  "entityId",
  "action",
  "notes",
  "createdAt",
  "reviewedBy",
  "metadata"
) VALUES
  ${rows}
ON CONFLICT ("id") DO UPDATE SET
  "action" = EXCLUDED."action",
  "notes" = EXCLUDED."notes",
  "reviewedBy" = EXCLUDED."reviewedBy",
  "metadata" = EXCLUDED."metadata";`);
}

if (sampleProductivityBoards.length) {
  const rows = sampleProductivityBoards
    .map((board) => {
      const values = [literal(board.boardId), literal(board.userId), literal(board.title), optionalLiteral(board.description), isoLiteral(board.createdAt)];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Productivity boards
INSERT INTO public.productivity_boards (
  board_id,
  user_id,
  title,
  description,
  created_at
) VALUES
  ${rows}
ON CONFLICT (board_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  created_at = EXCLUDED.created_at;`);
}

if (sampleProductivityColumns.length) {
  const rows = sampleProductivityColumns
    .map((column) => {
      const values = [
        literal(column.columnId),
        literal(column.boardId),
        literal(column.title),
        column.position.toString(),
        optionalLiteral(column.color),
        isoLiteral(column.createdAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Productivity columns
INSERT INTO public.productivity_columns (
  column_id,
  board_id,
  title,
  position,
  color,
  created_at
) VALUES
  ${rows}
ON CONFLICT (column_id) DO UPDATE SET
  title = EXCLUDED.title,
  position = EXCLUDED.position,
  color = EXCLUDED.color,
  created_at = EXCLUDED.created_at;`);
}

if (sampleProductivityCards.length) {
  const rows = sampleProductivityCards
    .map((card) => {
      const values = [
        literal(card.cardId),
        literal(card.columnId),
        literal(card.title),
        optionalLiteral(card.description),
        arrayLiteral(card.labels),
        card.dueDate ? isoLiteral(card.dueDate) : "NULL",
        arrayLiteral(card.assignees, "uuid"),
        jsonLiteral(card.metadata ?? null),
        card.position.toString(),
        isoLiteral(card.createdAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Productivity cards
INSERT INTO public.productivity_cards (
  card_id,
  column_id,
  title,
  description,
  labels,
  due_date,
  assignees,
  metadata,
  position,
  created_at
) VALUES
  ${rows}
ON CONFLICT (card_id) DO UPDATE SET
  column_id = EXCLUDED.column_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  labels = EXCLUDED.labels,
  due_date = EXCLUDED.due_date,
  assignees = EXCLUDED.assignees,
  metadata = EXCLUDED.metadata,
  position = EXCLUDED.position,
  created_at = EXCLUDED.created_at;`);
}

if (sampleProductivityTodos.length) {
  const rows = sampleProductivityTodos
    .map((todo) => {
      const values = [
        literal(todo.todoId),
        literal(todo.userId),
        literal(todo.title),
        booleanLiteral(todo.completed),
        todo.dueDate ? isoLiteral(todo.dueDate) : "NULL",
        arrayLiteral(todo.tags),
        isoLiteral(todo.createdAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Productivity todos
INSERT INTO public.productivity_todos (
  todo_id,
  user_id,
  title,
  completed,
  due_date,
  tags,
  created_at
) VALUES
  ${rows}
ON CONFLICT (todo_id) DO UPDATE SET
  title = EXCLUDED.title,
  completed = EXCLUDED.completed,
  due_date = EXCLUDED.due_date,
  tags = EXCLUDED.tags,
  created_at = EXCLUDED.created_at;`);
}

if (sampleProductivityEvents.length) {
  const rows = sampleProductivityEvents
    .map((event) => {
      const values = [
        literal(event.eventId),
        literal(event.userId),
        literal(event.title),
        optionalLiteral(event.description),
        isoLiteral(event.startAt),
        event.endAt ? isoLiteral(event.endAt) : "NULL",
        optionalLiteral(event.location),
        optionalLiteral(event.color),
        jsonLiteral(event.metadata ?? null),
        isoLiteral(event.createdAt)
      ];
      return `(${values.join(", ")})`;
    })
    .join(",\n  ");
  sections.push(`-- Productivity events
INSERT INTO public.productivity_events (
  event_id,
  user_id,
  title,
  description,
  start_at,
  end_at,
  location,
  color,
  metadata,
  created_at
) VALUES
  ${rows}
ON CONFLICT (event_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  start_at = EXCLUDED.start_at,
  end_at = EXCLUDED.end_at,
  location = EXCLUDED.location,
  color = EXCLUDED.color,
  metadata = EXCLUDED.metadata,
  created_at = EXCLUDED.created_at;`);
}

console.log(`-- Generated seed script
${sections.join("\n\n")}
-- Run with: psql $DATABASE_URL -f supabase-seed.sql
`);
