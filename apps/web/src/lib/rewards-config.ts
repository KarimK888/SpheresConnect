import type { RewardLog } from "@/lib/types";

export type QuickRewardAction = Exclude<RewardLog["action"], "bonus" | "redeem" | "transfer">;

export type RewardsPresetConfig = {
  quickActions: Record<QuickRewardAction, number>;
};

export const DEFAULT_REWARDS_PRESETS: RewardsPresetConfig = {
  quickActions: {
    onboarding: 120,
    checkin: 40,
    match: 85,
    sale: 200,
    rsvp: 60
  }
};
