/**
 * Tests for client-side rate limiting module.
 */

import {
  getRateLimitMessage,
  getDailyLimit,
  checkRateLimit,
  incrementUsage,
} from "@/lib/security/rateLimit";
import type { APIService } from "@/lib/security/rateLimit";
import {
  getRateLimitState,
  saveRateLimitState,
  atomicIncrementUsage,
  isNewDay,
} from "@/lib/firebase/firestore";

jest.mock("@/lib/firebase/firestore", () => ({
  getRateLimitState: jest.fn<Promise<null>, []>().mockResolvedValue(null),
  saveRateLimitState: jest.fn(),
  atomicIncrementUsage: jest.fn(),
  isNewDay: jest.requireActual("@/lib/firebase/firestore/rateLimit").isNewDay,
}));

describe("getRateLimitMessage", () => {
  // ... (unchanged)
});

describe("getDailyLimit", () => {
  // ... (unchanged)
});

describe("checkRateLimit", () => {
  const sessionId = "test-session";
  
  const createMockTimestamp = (date: Date) => ({
    toDate: () => date
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns { allowed: true, remaining: 39 } when usage is below limit", async () => {
    (getRateLimitState as jest.Mock).mockResolvedValue({
      geminiCallsToday: 1,
      lastResetAt: createMockTimestamp(new Date()),
    });

    const result = await checkRateLimit(sessionId, "gemini");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(39);
  });

  it("returns { allowed: false, remaining: 0 } when usage is at limit", async () => {
    (getRateLimitState as jest.Mock).mockResolvedValue({
      geminiCallsToday: 40,
      lastResetAt: createMockTimestamp(new Date()),
    });

    const result = await checkRateLimit(sessionId, "gemini");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets count and returns allowed when lastReset was yesterday", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    (getRateLimitState as jest.Mock).mockResolvedValue({
      geminiCallsToday: 40,
      lastResetAt: createMockTimestamp(yesterday),
    });

    const result = await checkRateLimit(sessionId, "gemini");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(40);
    expect(saveRateLimitState).toHaveBeenCalled();
  });

  it("returns allowed when Firestore throws (graceful degradation)", async () => {
    (getRateLimitState as jest.Mock).mockRejectedValue(
      new Error("Firestore down"),
    );

    const result = await checkRateLimit(sessionId, "gemini");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(40);
  });
});

describe("incrementUsage", () => {
  const sessionId = "test-session";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates to atomic Firestore transaction for gemini", async () => {
    await incrementUsage(sessionId, "gemini");
    expect(atomicIncrementUsage).toHaveBeenCalledWith(
      sessionId,
      "geminiCallsToday",
    );
  });

  it("delegates to atomic Firestore transaction for translate", async () => {
    await incrementUsage(sessionId, "translate");
    expect(atomicIncrementUsage).toHaveBeenCalledWith(
      sessionId,
      "translateCallsToday",
    );
  });

  it("delegates to atomic Firestore transaction for tts", async () => {
    await incrementUsage(sessionId, "tts");
    expect(atomicIncrementUsage).toHaveBeenCalledWith(
      sessionId,
      "ttsCallsToday",
    );
  });

  it("handles Firestore failure silently without crashing the app", async () => {
    (atomicIncrementUsage as jest.Mock).mockRejectedValue(
      new Error("Transaction failed"),
    );
    // The Promise should resolve normally, suppressing the error
    await expect(incrementUsage(sessionId, "gemini")).resolves.not.toThrow();
  });
});

