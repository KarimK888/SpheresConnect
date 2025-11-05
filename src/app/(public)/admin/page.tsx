import { getBackend } from "@/lib/backend";
import { AdminClient } from "./AdminClient";

export default async function AdminPage() {
  const backend = getBackend();
  const users = await backend.users.list({});
  const unverified = users.filter((user) => !user.isVerified);

  return <AdminClient unverified={unverified} />;
}
