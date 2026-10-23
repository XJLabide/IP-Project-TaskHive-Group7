import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export default function VerifyEmailPage() {
  return (
    <AuthCard
      description="Verified email is required before posting or applying. Enter the address you signed up with to get a new link."
      title="Verify your email"
    >
      <VerifyEmailForm />
    </AuthCard>
  );
}
