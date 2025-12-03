import {
  sampleUsers,
  sampleArtworks,
  sampleEvents,
  sampleHubs,
  sampleRewardLogs,
  sampleMessages,
  sampleChats
} from "../src/lib/sample-data";

const main = async () => {
  console.log("SpheraConnect seed preview:\n");
  console.log(`Users: ${sampleUsers.length}`);
  console.log(`Artworks: ${sampleArtworks.length}`);
  console.log(`Events: ${sampleEvents.length}`);
  console.log(`Hubs: ${sampleHubs.length}`);
  console.log(`Reward logs: ${sampleRewardLogs.length}`);
  console.log(`Chats: ${sampleChats.length}, Messages: ${sampleMessages.length}`);
  console.log("\nConnect to Firebase or Supabase here to import the sample data.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
