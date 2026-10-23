import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email/send";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }
    : null;

// Preview deployments need their own origin trusted; the production URL is separate.
const deploymentOrigins = [
  process.env.VERCEL_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
]
  .filter(Boolean)
  .map((host) => `https://${host}`);

async function safeSend(message: Parameters<typeof sendMail>[0]) {
  try {
    await sendMail(message);
  } catch (error) {
    // Email delivery must never block sign-up, sign-in, or a reset request.
    console.error("[email] delivery failed", error);
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await safeSend({
        to: user.email,
        subject: "Reset your TaskHive password",
        text: `Reset your TaskHive password: ${url}\n\nThis link expires in one hour. If you did not ask for a reset, ignore this email.`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await safeSend({
        to: user.email,
        subject: "Verify your TaskHive email",
        text: `Confirm your TaskHive email: ${url}\n\nVerified email is required before posting or applying.`,
      });
    },
  },
  ...(google ? { socialProviders: { google } } : {}),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "taskhive-development-secret-change-before-production"),
  baseURL,
  trustedOrigins: [
    ...new Set([baseURL, "http://localhost:3000", "http://localhost:3001", ...deploymentOrigins]),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
