/** The payment retry hold from selection to activation. */
export const HOLD_WINDOW_HOURS = 24;

const hourMs = 60 * 60 * 1000;

export function holdExpiresAt(selectedAt: Date): Date {
  return new Date(selectedAt.getTime() + HOLD_WINDOW_HOURS * hourMs);
}

export function isHoldExpired(holdExpiresAt: Date | null | undefined, now: Date): boolean {
  return holdExpiresAt != null && holdExpiresAt.getTime() <= now.getTime();
}
