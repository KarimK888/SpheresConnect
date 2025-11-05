import { getBackend } from "@/lib/backend";
import { ProfilesClient } from "./ProfilesClient";

export default async function ProfilesPage() {
  const backend = getBackend();
  const users = await backend.users.list({});
  return <ProfilesClient initialUsers={users} />;
}
