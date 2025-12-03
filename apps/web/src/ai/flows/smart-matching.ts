import { getBackend } from "../../lib/backend";
import type { MatchSuggestion } from "../../lib/types";

interface SmartMatchInput {
  userId: string;
}

export const smartMatchingFlow = async ({ userId }: SmartMatchInput): Promise<MatchSuggestion[]> => {
  const backend = getBackend();
  return backend.matches.suggest({ userId });
};
