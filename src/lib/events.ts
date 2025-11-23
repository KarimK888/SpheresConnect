import type { Event } from "./types";
import type { EventRsvpAction } from "./backend";

type ApplyRsvpInput = {
  requesterId: string;
  action?: EventRsvpAction;
  targetUserId?: string;
};

export const applyRsvpAction = (event: Event, { requesterId, action, targetUserId }: ApplyRsvpInput): Event => {
  const nextAction: EventRsvpAction =
    action && ["request", "cancel", "approve", "reject"].includes(action) ? action : "request";
  const attendees = new Set(event.attendees ?? []);
  const pending = new Set(event.pendingAttendees ?? []);

  if (nextAction === "approve" || nextAction === "reject") {
    if (event.hostUserId !== requesterId) {
      throw new Error("Only the host can moderate RSVP requests");
    }
    if (!targetUserId) {
      throw new Error("Missing target user");
    }
    if (nextAction === "approve") {
      pending.delete(targetUserId);
      attendees.add(targetUserId);
    } else {
      pending.delete(targetUserId);
      attendees.delete(targetUserId);
    }
  } else if (nextAction === "cancel") {
    pending.delete(requesterId);
    attendees.delete(requesterId);
  } else {
    if (!attendees.has(requesterId)) {
      pending.add(requesterId);
    }
  }

  return {
    ...event,
    attendees: Array.from(attendees),
    pendingAttendees: Array.from(pending)
  };
};
