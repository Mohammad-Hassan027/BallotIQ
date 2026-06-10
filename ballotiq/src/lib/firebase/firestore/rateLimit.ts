import { doc, setDoc, getDoc, runTransaction } from "firebase/firestore";
import { getFirestoreDB, authReady } from "../client";
import type { RateLimitState } from "@/types";

/**
 * Saves rate limit state to Firestore.
 */
export async function saveRateLimitState(state: RateLimitState): Promise<void> {
  try {
    await authReady;
    const db = getFirestoreDB();
    if (!db) return;
    const ref = doc(db, 'rate_limits', state.sessionId);
    const ref = doc(db, "rate_limits", state.sessionId);
    await setDoc(ref, state, { merge: true });
  } catch (error) {
    console.error("[Firestore] Failed to save rate limit state:", error);
  }
}

/**
 * Retrieves rate limit state from Firestore.
 */
export async function getRateLimitState(
  sessionId: string,
): Promise<RateLimitState | null> {
  try {
    await authReady;
    const db = getFirestoreDB();
    if (!db) return null;
    const ref = doc(db, 'rate_limits', sessionId);
    const ref = doc(db, "rate_limits", sessionId);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as RateLimitState) : null;
  } catch (error) {
    console.error("[Firestore] Failed to get rate limit state:", error);
    return null;
  }
}

/**
 * Atomically increments usage via a Firestore Transaction.
 * Safely handles both high-concurrency requests and daily midnight resets.
 */
export async function atomicIncrementUsage(
  sessionId: string,
  serviceKey: "geminiCallsToday" | "translateCallsToday" | "ttsCallsToday",
  today: string,
): Promise<void> {
  try {
    await authReady;
    const db = getFirestoreDB();
    const ref = doc(db, "rate_limits", sessionId);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);

      if (!snap.exists()) {
        // 1. Brand new session: Create document with initial counts
        transaction.set(ref, {
          sessionId,
          geminiCallsToday: serviceKey === "geminiCallsToday" ? 1 : 0,
          translateCallsToday: serviceKey === "translateCallsToday" ? 1 : 0,
          ttsCallsToday: serviceKey === "ttsCallsToday" ? 1 : 0,
          lastReset: today,
        });
        return;
      }

      const current = snap.data() as RateLimitState;

      if (current.lastReset !== today) {
        // 2. Day rolled over: Reset all counters to 0, then add 1 to the requested service
        transaction.set(ref, {
          ...current, // preserves any other data if present
          geminiCallsToday: serviceKey === "geminiCallsToday" ? 1 : 0,
          translateCallsToday: serviceKey === "translateCallsToday" ? 1 : 0,
          ttsCallsToday: serviceKey === "ttsCallsToday" ? 1 : 0,
          lastReset: today,
        });
      } else {
        // 3. Same day: Atomically increment the specific service counter
        const currentCount = current[serviceKey] || 0;
        transaction.update(ref, {
          [serviceKey]: currentCount + 1,
        });
      }
    });
  } catch (error) {
    console.error(
      "[Firestore] Failed to run atomic rate limit transaction:",
      error,
    );
    throw error;
  }
}
