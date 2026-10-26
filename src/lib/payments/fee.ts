/** Provisional platform fee. The rate is configurable pending launch approval. */
export const DEFAULT_PLATFORM_FEE_RATE = 0.05;

/** Reads PLATFORM_FEE_RATE (fraction, e.g. 0.05), falling back to 5%. */
export function platformFeeRate(
  value: string | undefined = process.env.PLATFORM_FEE_RATE,
): number {
  if (!value) return DEFAULT_PLATFORM_FEE_RATE;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return DEFAULT_PLATFORM_FEE_RATE;
  }

  return parsed;
}

/** Fee charged against the Tasker payout, rounded to the nearest centavo. */
export function platformFeeCents(
  amountCents: number,
  rate: number = platformFeeRate(),
): number {
  if (!Number.isInteger(amountCents) || amountCents <= 0) return 0;
  return Math.min(amountCents, Math.round(amountCents * rate));
}

/** What the Tasker receives after the provisional fee. */
export function payoutCents(
  amountCents: number,
  rate: number = platformFeeRate(),
): number {
  return amountCents - platformFeeCents(amountCents, rate);
}
