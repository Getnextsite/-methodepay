/**
 * Retry schedule for outbound webhooks. Pure, so it can be tested and shown
 * in the dashboard without touching the database.
 *
 * Delays grow so a merchant endpoint that is down for an afternoon still gets
 * every event once it is back, without being hammered while it is down. The
 * total window is a little over a day, matching what merchants expect from
 * Stripe and PayPal.
 */

/** Delay before attempt n+1, indexed by the number of attempts already made. */
export const RETRY_DELAYS_MS = [
  60_000, // 1 min
  5 * 60_000, // 5 min
  30 * 60_000, // 30 min
  2 * 3_600_000, // 2 h
  8 * 3_600_000, // 8 h
  24 * 3_600_000, // 24 h
] as const;

/** First attempt plus one per delay. */
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

/** Consecutive failed attempts after which an endpoint is paused. */
export const PAUSE_AFTER_FAILURES = 20;

export type DeliveryStatus = 'pending' | 'delivered' | 'retrying' | 'failed';

/**
 * What happens after an attempt.
 *
 * `attempts` is the count including the attempt that just finished. A 2xx is
 * delivered. A 4xx other than 408/409/425/429 means the endpoint understood and
 * refused, so retrying the same body cannot help: it fails at once. Anything
 * else (5xx, timeouts, network errors) is retried until the schedule runs out.
 */
export function afterAttempt(
  attempts: number,
  responseCode: number | null,
  now = Date.now(),
): { status: DeliveryStatus; nextAttemptAt: Date | null } {
  if (responseCode !== null && responseCode >= 200 && responseCode < 300) {
    return { status: 'delivered', nextAttemptAt: null };
  }
  const permanent =
    responseCode !== null &&
    responseCode >= 400 &&
    responseCode < 500 &&
    ![408, 409, 425, 429].includes(responseCode);
  if (permanent || attempts >= MAX_ATTEMPTS) {
    return { status: 'failed', nextAttemptAt: null };
  }
  const delay = RETRY_DELAYS_MS[Math.max(0, attempts - 1)] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  return { status: 'retrying', nextAttemptAt: new Date(now + delay) };
}

/** "1 min", "2 h": the schedule as merchants read it. */
export function describeDelay(ms: number): string {
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`;
  return `${Math.round(ms / 3_600_000)} h`;
}
