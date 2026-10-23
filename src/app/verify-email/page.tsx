import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <AuthCard
      description="Verify your email before posting or applying. Sign in to resend a new link."
      title="Verify your email"
    >
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <VerifyEmailForm />
      </Suspense>
    </AuthCard>
  );
}
