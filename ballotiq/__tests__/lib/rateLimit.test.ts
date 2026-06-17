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
  it("returns 40 for gemini", () => {
    expect(getDailyLimit("gemini")).toBe(40);
  });

  it("returns 100 for translate", () => {
    expect(getDailyLimit("translate")).toBe(100);
  });

  it("returns 50 for tts", () => {
    expect(getDailyLimit("tts")).toBe(50);
  });

  it("returns positive integers for all services", () => {
    const services: APIService[] = ["gemini", "translate", "tts"];
    for (const service of services) {
      const limit = getDailyLimit(service);
      expect(typeof limit).toBe("number");
      expect(limit).toBeGreaterThan(0);
      expect(Number.isInteger(limit)).toBe(true);
    }
  });
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

  it("never bundles multiple service keys into a single write (bypass prevention)", async () => {
    // Security: if a client batched multiple counters in one write it could skip
    // counts and evade the Firestore rule that enforces +1-only per field.
    // Each service call must result in exactly one atomicIncrementUsage call
    // with exactly one service key — never multiple keys at once.
    await incrementUsage(sessionId, "gemini");
    await incrementUsage(sessionId, "translate");
    await incrementUsage(sessionId, "tts");

    expect(atomicIncrementUsage).toHaveBeenCalledTimes(3);
    expect(atomicIncrementUsage).toHaveBeenNthCalledWith(1, sessionId, "geminiCallsToday");
    expect(atomicIncrementUsage).toHaveBeenNthCalledWith(2, sessionId, "translateCallsToday");
    expect(atomicIncrementUsage).toHaveBeenNthCalledWith(3, sessionId, "ttsCallsToday");
  });

  it("passes exactly one service key per call — never an array or object (bypass prevention)", async () => {
    // Security: the second argument must always be a single string key, not a
    // bundled object. This mirrors the Firestore rule: only one field may change
    // per write. If this signature changes, the rules will reject the write.
    await incrementUsage(sessionId, "gemini");

    const [, secondArg] = (atomicIncrementUsage as jest.Mock).mock.calls[0];
    expect(typeof secondArg).toBe("string");
    expect(secondArg).toBe("geminiCallsToday");
  });
});

