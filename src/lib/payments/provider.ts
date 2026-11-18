import { createHmac, createVerify, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";

export type CheckoutInput = {
  taskId: string;
  paymentId: string;
  idempotencyKey: string;
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

export type ProviderEventType = "succeeded" | "failed" | "refunded" | "pending";

export type ProviderEvent = {
  id: string;
  type: ProviderEventType;
  /** The provider checkout/payment reference stored on the Payment row. */
  reference: string;
  amountCents: number | null;
};

export interface PaymentProvider {
  name: string;
  /** Whether repeated checkout calls with the same key are provider-deduplicated. */
  checkoutIdempotent: boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  parseWebhook(headers: Headers, rawBody: string): Promise<ProviderEvent | null>;
  getPaymentStatus?(reference: string): Promise<ProviderEvent | null>;
}

/**
 * Deterministic provider for development and tests. It accepts the event JSON
 * directly, so it must never be selected for production traffic.
 */
export function fakeProvider(): PaymentProvider {
  return {
    name: "fake",
    checkoutIdempotent: true,
    async createCheckout(input) {
      return {
        provider: "fake",
        reference: `fake_cs_${input.idempotencyKey}`,
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

// Maya publishes these shared sandbox credentials for quick integration trials.
// They are public test values; live deployments must provide a different provider.
const mayaSharedSandboxApiKey = "pk-Z0OSzLvIcOI2UIvDhdTGVVfRSSeiGStnceqwUE7n0Ah";
const mayaSandboxWebhookPublicKeys = [
  `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjNkSX6p+goDPaPAYuTzT
zKTCBeLhh8FkPMbZxDKTUxF93dOwiC7jsdx7KyopupeLosiVlbs+gpAJ7XBQP/Ex
giyzXC9TljpyvkUQfyRPMAMKq+BzxdUliTl6hgrLBsH28CP5FuPHCsfxDXe7mDtv
9H4mP3SKO0HfkZ45tudxD9CWbwWKF0lU9LRbLlJ0y7KEaK7Rv9fI1Dp/KPT+9pls
tU+CPNKaxJjGRKGuxW2AOCabSD0cTZNXki+K51mNoma7Mj1HMhnsR68FGJvCqk1q
Wsr3q8+EUMVPBMX+5nKATfZYGvxg4ytzT8pnEVeWl6phYKviB9aVVwurh1gDJB4r
lQIDAQAB
-----END PUBLIC KEY-----`,
  `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp14gezqq4dGWu7EZ7BHx
8wD3y1hqxwQR7UYPXtXJP+WngN4wqwatjsnQaRGnmdPRG8VEzUzw9PlR7t7P24uW
+J08xBrtTVouD2MKglcIcy13rt1XL79zr/LIAFMFI6f4O8/OQi1xsGsZ6xarD+wl
OQKG4W66I3yp2jNAbge25eSPuo0BNqPWvebMcIYJu4f3Fxu1eDgeM6zCEqLc6+jX
cNTP/zFHCvQaiIlLOqfgXDRPBcHPPZ2qcB99UVPAHXBKsKdtBB2w2qT2l99MlTAB
iRy+IKtVQcQyRP7T8blegO25x35G2CZ3VCKPkmUen3eXQ4+r5fVlzEIBSfNvBwT9
jQIDAQAB
-----END PUBLIC KEY-----`,
];

/** Maya Checkout adapter restricted to its sandbox environment. */
export function mayaProvider(input: {
  publicApiKey: string;
  mode: "sandbox";
  webhookPublicKeys?: string[];
}): PaymentProvider {
  const baseUrl = "https://pg-sandbox.paymaya.com";

  return {
    name: "maya",
    checkoutIdempotent: false,
    async createCheckout(checkout) {
      const response = await fetch(`${baseUrl}/checkout/v1/checkouts`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Basic ${Buffer.from(`${input.publicApiKey}:`).toString("base64")}`,
        },
        body: JSON.stringify({
          totalAmount: { value: checkout.amountCents / 100, currency: checkout.currency },
          redirectUrl: {
            success: checkout.successUrl,
            failure: checkout.cancelUrl,
            cancel: checkout.cancelUrl,
          },
          requestReferenceNumber: checkout.idempotencyKey,
          metadata: { taskId: checkout.taskId, paymentId: checkout.paymentId },
        }),
      });
      if (!response.ok) throw new Error(`Maya sandbox checkout failed with ${response.status}.`);
      const body = await response.json() as { checkoutId?: string; redirectUrl?: string };
      if (!body.checkoutId || !body.redirectUrl) throw new Error("Maya checkout response is incomplete.");
      const redirect = new URL(body.redirectUrl);
      if (redirect.protocol !== "https:" || !["payments-web-sandbox.paymaya.com", "payments-web-sandbox.maya.ph"].includes(redirect.hostname)) {
        throw new Error("Maya returned an unexpected sandbox checkout URL.");
      }
      return { provider: "maya", reference: body.checkoutId, url: body.redirectUrl };
    },
    async getPaymentStatus(reference) {
      const response = await fetch(`${baseUrl}/payments/v1/payments/${encodeURIComponent(reference)}/status`, {
        headers: { authorization: `Basic ${Buffer.from(`${input.publicApiKey}:`).toString("base64")}` },
      });
      if (!response.ok) throw new Error(`Maya sandbox status check failed with ${response.status}.`);
      const body = await response.json() as { id?: string; status?: string };
      if (body.id !== reference || !body.status) return null;
      const type: ProviderEventType | null = body.status === "PAYMENT_SUCCESS"
        ? "succeeded"
        : ["PAYMENT_FAILED", "PAYMENT_EXPIRED", "PAYMENT_CANCELLED"].includes(body.status)
          ? "failed"
          : body.status === "AUTHORIZED" || body.status === "PENDING_PAYMENT" || body.status === "PENDING_TOKEN"
            ? "pending" : null;
      if (!type) return null;
      return { id: `maya-status:${reference}:${body.status}`, type, reference, amountCents: null };
    },
    async parseWebhook(headers, rawBody) {
      const timestamp = headers.get("x-maya-webhook-timestamp");
      const signatureHeader = headers.get("x-maya-webhook-signature");
      if (!timestamp || !signatureHeader || input.webhookPublicKeys?.length !== 2) return null;
      const timestampMs = Number(timestamp);
      if (!Number.isSafeInteger(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return null;

      let payload: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(rawBody);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
        payload = parsed as Record<string, unknown>;
      } catch {
        return null;
      }
      const parts = Object.fromEntries(signatureHeader.split(",").map((part) => {
        const separator = part.indexOf("=");
        return separator < 0 ? [part.trim(), ""] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
      }));
      if (!parts.nonce || !parts.v1 || !/^[a-f\d]+$/i.test(parts.v1)) return null;
      const flattened: string[] = [];
      const visit = (value: unknown, prefix: string) => {
        if (value === null || value === undefined || value === "") return;
        if (typeof value === "object") {
          if (Array.isArray(value)) return;
          const entries = Object.entries(value);
          if (entries.length === 0) return;
          entries.forEach(([key, item]) => visit(item, prefix ? `${prefix}.${key}` : key));
        } else {
          flattened.push(`${prefix}=${String(value)}`);
        }
      };
      visit(payload, "");
      const signedContent = `${flattened.sort().join("&")}&nonce=${parts.nonce}`;
      const valid = input.webhookPublicKeys.some((key) => {
        try {
          const verifier = createVerify("RSA-SHA256");
          verifier.update(signedContent);
          verifier.end();
          return verifier.verify(key, Buffer.from(parts.v1, "hex"));
        } catch {
          return false;
        }
      });
      if (!valid) return null;

      const id = payload.id;
      const status = payload.paymentStatus ?? payload.status;
      const totalAmount = payload.totalAmount && typeof payload.totalAmount === "object" ? (payload.totalAmount as Record<string, unknown>).value : null;
      const amountValue = payload.amount ?? totalAmount;
      if (typeof id !== "string" || typeof status !== "string") return null;
      const type: ProviderEventType | null = status === "PAYMENT_SUCCESS" && payload.isPaid === true
        ? "succeeded"
        : ["PAYMENT_FAILED", "PAYMENT_EXPIRED", "PAYMENT_CANCELLED"].includes(status)
          ? "failed"
          : status === "AUTHORIZED" ? "pending" : null;
      if (!type) return null;
      const parsedAmount = typeof amountValue === "number" ? amountValue : typeof amountValue === "string" ? Number(amountValue) : NaN;
      const amountCents = Number.isFinite(parsedAmount) ? Math.round(parsedAmount * 100) : null;
      const updatedAt = typeof payload.updatedAt === "string" ? payload.updatedAt : timestamp;
      return { id: `${id}:${status}:${updatedAt}`, type, reference: id, amountCents };
    },
  };
}

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
    checkoutIdempotent: true,
    async createCheckout(checkout) {
      const response = await fetch(`${paymongoApi}/checkout_sessions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Basic ${Buffer.from(`${input.secretKey}:`).toString("base64")}`,
          "Idempotency-Key": checkout.idempotencyKey,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              description: checkout.description,
              reference_number: checkout.idempotencyKey,
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
    checkoutIdempotent: true,
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
      }, { idempotencyKey: checkout.idempotencyKey });

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
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        const session = event.data.object as Stripe.Checkout.Session;
        return {
          id: eventId,
          type: session.payment_status === "paid" ? "succeeded" : "pending",
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
    checkoutIdempotent: false,
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
    env.PAYMENT_PROVIDER === "maya" &&
    env.MAYA_MODE === "sandbox" &&
    env.VERCEL_ENV !== "production" &&
    !(env.NODE_ENV === "production" && !env.VERCEL_ENV)
  ) {
    return mayaProvider({
      publicApiKey: env.MAYA_PUBLIC_API_KEY || mayaSharedSandboxApiKey,
      mode: "sandbox",
      webhookPublicKeys: [
        env.MAYA_WEBHOOK_PUBLIC_KEY_1 || mayaSandboxWebhookPublicKeys[0],
        env.MAYA_WEBHOOK_PUBLIC_KEY_2 || mayaSandboxWebhookPublicKeys[1],
      ],
    });
  }

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

  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    return disabledProvider();
  }

  return fakeProvider();
}
