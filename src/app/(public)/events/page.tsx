import { getBackend } from "@/lib/backend";
import { EventsClient } from "./EventsClient";

export default async function EventsPage() {
  const backend = getBackend();
  const events = await backend.events.list();
  const upcoming = events.filter((event) => event.startsAt >= Date.now());
  const past = events.filter((event) => event.startsAt < Date.now());

  return <EventsClient upcoming={upcoming} past={past} />;
}
