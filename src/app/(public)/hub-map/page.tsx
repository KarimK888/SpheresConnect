import { getBackend } from "../../../lib/backend";
import { HubMapClient } from "./HubMapClient";

export default async function HubMapPage() {
  const backend = getBackend();
  const hubs = await backend.hubs.list();
  const checkins = await backend.checkins.listActive({});

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <HubMapClient hubs={hubs} initialCheckins={checkins} />
    </div>
  );
}
