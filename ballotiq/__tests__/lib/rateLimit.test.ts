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
} from "@/lib/firebase/firestore";

jest.mock("@/lib/firebase/firestore", () => ({
  getRateLimitState: jest.fn<Promise<null>, []>().mockResolvedValue(null),
  saveRateLimitState: jest.fn(),
  atomicIncrementUsage: jest.fn(),
}));

describe("getRateLimitMessage", () => {
  it("returns a message for gemini service", () => {
    const msg = getRateLimitMessage("gemini");
    expect(msg).toContain("AI requests limit");
    expect(msg).toContain("midnight");
  });

  it("returns a message for translate service", () => {
    const msg = getRateLimitMessage("translate");
    expect(msg).toContain("Translation limit");
  });

  it("returns a message for tts service", () => {
    const msg = getRateLimitMessage("tts");
    expect(msg).toContain("Text-to-speech limit");
  });

  it("returns a string for each valid service", () => {
    const services: APIService[] = ["gemini", "translate", "tts"];
    services.forEach((service) => {
      expect(typeof getRateLimitMessage(service)).toBe("string");
      expect(getRateLimitMessage(service).length).toBeGreaterThan(0);
    });
  });
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
    services.forEach((service) => {
      const limit = getDailyLimit(service);
      expect(limit).toBeGreaterThan(0);
      expect(Number.isInteger(limit)).toBe(true);
    });
  });
});

describe("checkRateLimit", () => {
  const sessionId = "test-session";
  const today = new Date().toISOString().split("T")[0];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns { allowed: true, remaining: 39 } when usage is below limit", async () => {
    (getRateLimitState as jest.Mock).mockResolvedValue({
      geminiCallsToday: 1,
      lastReset: today,
    });

    const result = await checkRateLimit(sessionId, "gemini");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(39);
  });

  it("returns { allowed: false, remaining: 0 } when usage is at limit", async () => {
    (getRateLimitState as jest.Mock).mockResolvedValue({
      geminiCallsToday: 40,
      lastReset: today,
    });

    const result = await checkRateLimit(sessionId, "gemini");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets count and returns allowed when lastReset was yesterday", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    (getRateLimitState as jest.Mock).mockResolvedValue({
      geminiCallsToday: 40,
      lastReset: yesterdayStr,
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
  const today = new Date().toISOString().split("T")[0];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates to atomic Firestore transaction for gemini", async () => {
    await incrementUsage(sessionId, "gemini");
    expect(atomicIncrementUsage).toHaveBeenCalledWith(
      sessionId,
      "geminiCallsToday",
      today,
    );
  });

  it("delegates to atomic Firestore transaction for translate", async () => {
    await incrementUsage(sessionId, "translate");
    expect(atomicIncrementUsage).toHaveBeenCalledWith(
      sessionId,
      "translateCallsToday",
      today,
    );
  });

  it("delegates to atomic Firestore transaction for tts", async () => {
    await incrementUsage(sessionId, "tts");
    expect(atomicIncrementUsage).toHaveBeenCalledWith(
      sessionId,
      "ttsCallsToday",
      today,
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
