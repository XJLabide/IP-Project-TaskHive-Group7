import { createHmac, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";

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
 * Stripe signs `{timestamp}.{rawBody}` with HMAC-SHA256 and sends signatures as
 * `t=...,v1=...`.
 */
export function verifyStripeSignature(
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

  const signatures = header
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));

  return signatures.some((sig) => {
    if (sig.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  });
}

/**
 * Stripe Checkout adapter for international and card payments.
 * Selected when PAYMENT_PROVIDER=stripe and both secretKey and webhookSecret are set.
 */
export function stripeProvider(input: {
  secretKey: string;
  webhookSecret: string;
  stripeClient?: Stripe;
}): PaymentProvider {
  const stripe =
    input.stripeClient ??
    new Stripe(input.secretKey);

  return {
    name: "stripe",
    async createCheckout(checkout) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: checkout.currency.toLowerCase(),
              product_data: {
                name: checkout.description,
              },
              unit_amount: checkout.amountCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: checkout.successUrl,
        cancel_url: checkout.cancelUrl,
        client_reference_id: checkout.paymentId,
        metadata: {
          taskId: checkout.taskId,
          paymentId: checkout.paymentId,
        },
      });

      const reference = session.id;
      const url = session.url ?? checkout.successUrl;
      if (!reference) throw new Error("Stripe checkout response is incomplete.");

      return { provider: "stripe", reference, url };
    },
    async parseWebhook(headers, rawBody) {
      const signature = headers.get("stripe-signature");
      if (!signature) return null;

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          input.webhookSecret,
        );
      } catch {
        return null;
      }

      const eventId = event.id;
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          id: eventId,
          type: "succeeded",
          reference: session.id,
          amountCents: session.amount_total ?? null,
        };
      }

      if (
        event.type === "checkout.session.async_payment_failed" ||
        event.type === "checkout.session.expired"
      ) {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          id: eventId,
          type: "failed",
          reference: session.id,
          amountCents: session.amount_total ?? null,
        };
      }

      if (event.type === "payment_intent.payment_failed") {
        const pi = event.data.object as Stripe.PaymentIntent;
        const reference =
          (pi.metadata?.paymentReference as string | undefined) ||
          (pi.metadata?.checkoutSessionId as string | undefined) ||
          pi.id;
        return {
          id: eventId,
          type: "failed",
          reference,
          amountCents: pi.amount ?? null,
        };
      }

      if (event.type === "charge.refunded") {
        const charge = event.data.object as Stripe.Charge;
        const reference =
          (charge.metadata?.paymentReference as string | undefined) ||
          (charge.metadata?.checkoutSessionId as string | undefined) ||
          (charge.payment_intent as string | undefined) ||
          charge.id;
        return {
          id: eventId,
          type: "refunded",
          reference,
          amountCents: charge.amount_refunded ?? null,
        };
      }

      return null;
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

  if (
    env.PAYMENT_PROVIDER === "stripe" &&
    env.STRIPE_SECRET_KEY &&
    env.STRIPE_WEBHOOK_SECRET
  ) {
    return stripeProvider({
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    });
  }

  if (env.NODE_ENV === "production" && env.ALLOW_FAKE_PAYMENTS !== "1") {
    return disabledProvider();
  }

  return fakeProvider();
}
