import { getBackend } from "@/lib/backend";
import { RewardsClient } from "./RewardsClient";

export default async function RewardsPage() {
  const backend = getBackend();
  const session = await backend.auth.getSession();

  const userId = session?.user.userId ?? "usr_alina";
  const summary = await backend.rewards.summary({ userId });

  return <RewardsClient summary={summary} />;
}
