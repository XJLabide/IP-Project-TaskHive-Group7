import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      description="Enter the email on your account and we will send a link to set a new password."
      title="Reset your password"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
