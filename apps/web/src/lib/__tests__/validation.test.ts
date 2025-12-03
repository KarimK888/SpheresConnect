import { describe, expect, it } from "vitest";
import { UserSchema } from "@/lib/validation";

describe("UserSchema", () => {
  it("requires a valid email", () => {
    const result = UserSchema.safeParse({
      userId: "usr_test",
      email: "not-an-email",
      displayName: "Test User",
      skills: [],
      connections: [],
      isVerified: false,
      language: "en",
      joinedAt: Date.now()
    });

    expect(result.success).toBe(false);
  });

  it("passes with minimal valid data", () => {
    const result = UserSchema.safeParse({
      userId: "usr_test",
      email: "test@example.com",
      displayName: "Test User",
      skills: [],
      connections: [],
      isVerified: false,
      language: "en",
      joinedAt: Date.now()
    });

    expect(result.success).toBe(true);
  });
});
