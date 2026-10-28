import { Resend } from "resend";

const from = process.env.EMAIL_FROM ?? "TaskHive <onboarding@resend.dev>";

export type MailResult = { delivered: boolean; reason?: string };

type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  idempotencyKey?: string;
};

/**
 * Transactional email boundary. With RESEND_API_KEY set, mail is delivered.
 * Without it, the message is logged so local flows can still be completed.
 */
export async function sendMail({
  to,
  subject,
  text,
  html,
  idempotencyKey,
}: Mail): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { delivered: false, reason: "RESEND_API_KEY is not configured" };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    text,
    html: html ?? `<pre style="font-family:inherit;white-space:pre-wrap">${text}</pre>`,
  }, idempotencyKey ? { idempotencyKey } : undefined);

  if (error) throw new Error(error.message);

  return { delivered: true };
}
