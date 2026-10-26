import { createHmac, timingSafeEqual } from "node:crypto";

export type CheckoutInput = {
  taskId: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = {
  provider: string;
  reference: string;
  url: string;
};

export type ProviderEventType = "succeeded" | "failed" | "refunded";

export type ProviderEvent = {
  id: string;
  type: ProviderEventType;
  /** The provider checkout/payment reference stored on the Payment row. */
  reference: string;
  amountCents: number | null;
};

export interface PaymentProvider {
  name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  parseWebhook(headers: Headers, rawBody: string): Promise<ProviderEvent | null>;
}

/**
 * Deterministic provider for development and tests. It accepts the event JSON
 * directly, so it must never be selected for production traffic.
 */
export function fakeProvider(): PaymentProvider {
  return {
    name: "fake",
    async createCheckout(input) {
      return {
        provider: "fake",
        reference: `fake_cs_${input.paymentId}`,
        url: `/preview?checkout=${input.paymentId}`,
      };
    },
    async parseWebhook(_headers, rawBody) {
      try {
        const parsed = JSON.parse(rawBody) as Partial<ProviderEvent>;
        if (
          typeof parsed.id !== "string" ||
          typeof parsed.reference !== "string" ||
          (parsed.type !== "succeeded" &&
            parsed.type !== "failed" &&
            parsed.type !== "refunded")
        ) {
          return null;
        }

        return {
          id: parsed.id,
          type: parsed.type,
          reference: parsed.reference,
          amountCents:
            typeof parsed.amountCents === "number" ? parsed.amountCents : null,
        };
      } catch {
        return null;
      }
    },
  };
}

const paymongoApi = "https://api.paymongo.com/v1";

/**
 * PayMongo is the first provider to evaluate, not an approved production
 * choice. The adapter is only selected when PAYMENT_PROVIDER=paymongo and a
 * secret key is configured; verify against sandbox before enabling.
 */
export function paymongoProvider(input: {
  secretKey: string;
  webhookSecret: string;
}): PaymentProvider {
  return {
    name: "paymongo",
    async createCheckout(checkout) {
      const response = await fetch(`${paymongoApi}/checkout_sessions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Basic ${Buffer.from(`${input.secretKey}:`).toString("base64")}`,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              description: checkout.description,
              reference_number: checkout.paymentId,
              line_items: [
                {
                  currency: checkout.currency,
                  amount: checkout.amountCents,
                  name: checkout.description,
                  quantity: 1,
                },
              ],
              payment_method_types: ["card", "gcash", "paymaya"],
              success_url: checkout.successUrl,
              cancel_url: checkout.cancelUrl,
              metadata: { taskId: checkout.taskId },
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`PayMongo checkout failed with ${response.status}.`);
      }

      const body = (await response.json()) as {
        data?: { id?: string; attributes?: { checkout_url?: string } };
      };
      const reference = body.data?.id;
      const url = body.data?.attributes?.checkout_url;
      if (!reference || !url) throw new Error("PayMongo checkout response is incomplete.");

      return { provider: "paymongo", reference, url };
    },
    async parseWebhook(headers, rawBody) {
      const signature = headers.get("paymongo-signature");
      if (!signature) return null;
      if (!verifyPaymongoSignature(signature, rawBody, input.webhookSecret)) return null;

      try {
        const body = JSON.parse(rawBody) as {
          data?: {
            id?: string;
            attributes?: {
              type?: string;
              data?: { id?: string; attributes?: { amount?: number } };
            };
          };
        };
        const eventId = body.data?.id;
        const type = body.data?.attributes?.type ?? "";
        const reference = body.data?.attributes?.data?.id;
        if (!eventId || !reference) return null;

        const mapped: ProviderEventType | null = type.includes("paid")
          ? "succeeded"
          : type.includes("failed")
            ? "failed"
            : type.includes("refund")
              ? "refunded"
              : null;
        if (!mapped) return null;

        return {
          id: eventId,
          type: mapped,
          reference,
          amountCents: body.data?.attributes?.data?.attributes?.amount ?? null,
        };
      } catch {
        return null;
      }
    },
  };
}

/**
 * PayMongo signs `{timestamp}.{rawBody}` with HMAC-SHA256 and sends test and
 * live signatures in one header: `t=...,te=...,li=...`.
 */
export function verifyPaymongoSignature(
  header: string,
  rawBody: string,
  secret: string,
): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key.trim(), rest.join("=")];
    }),
  ) as Record<string, string | undefined>;

  const timestamp = parts.t;
  if (!timestamp) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return [parts.te, parts.li].some((candidate) => {
    if (!candidate || candidate.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
  });
}

/**
 * Selected when production has no real provider configured: checkout fails and
 * callbacks are rejected instead of trusting unsigned fake events.
 */
function disabledProvider(): PaymentProvider {
  return {
    name: "disabled",
    async createCheckout() {
      throw new Error("No payment provider is configured for production.");
    },
    async parseWebhook() {
      return null;
    },
  };
}

/** Picks the provider from configuration; the fake keeps local flows working. */
export function selectPaymentProvider(
  env: Record<string, string | undefined> = process.env,
): PaymentProvider {
  if (
    env.PAYMENT_PROVIDER === "paymongo" &&
    env.PAYMONGO_SECRET_KEY &&
    env.PAYMONGO_WEBHOOK_SECRET
  ) {
    return paymongoProvider({
      secretKey: env.PAYMONGO_SECRET_KEY,
      webhookSecret: env.PAYMONGO_WEBHOOK_SECRET,
    });
  }

  if (env.NODE_ENV === "production" && env.ALLOW_FAKE_PAYMENTS !== "1") {
    return disabledProvider();
  }

  return fakeProvider();
}
