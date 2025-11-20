import { getBackend } from "@/lib/backend";
import type { Artwork, Event, Order } from "@/lib/types";
import { AdminClient } from "../AdminClient";

export default async function AdminWorkspacePage() {
  const backend = getBackend();
  const users = await backend.users.list({});
  const verified = users.filter((user) => user.isVerified);
  const unverified = users.filter((user) => !user.isVerified);
  const dashboardOwner = verified[0]?.userId ?? users[0]?.userId ?? "admin";

  let listings: Artwork[] = [];
  let orders: Order[] = [];
  try {
    const dashboard = await backend.marketplace.getDashboard(dashboardOwner);
    listings = dashboard.listings;
    orders = dashboard.orders;
  } catch (error) {
    console.warn("[admin-workspace] Unable to load marketplace dashboard", error);
  }

  let events: Event[] = [];
  try {
    events = await backend.events.list();
  } catch (error) {
    console.warn("[admin-workspace] Unable to load events", error);
  }

  return (
    <AdminClient
      unverified={unverified}
      verified={verified}
      orders={orders}
      listings={listings}
      events={events}
      totalUsers={users.length}
    />
  );
}
