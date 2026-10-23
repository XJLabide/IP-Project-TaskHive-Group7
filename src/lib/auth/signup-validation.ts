export type SignupInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  ageAttested: boolean;
  acceptedTerms: boolean;
};

export type SignupErrors = Partial<Record<keyof SignupInput, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneDigits = /^\+?[\d\s()-]{10,}$/;

/** Client-side checks that mirror the Basic-profile requirements before signup. */
export function validateSignup(input: SignupInput): SignupErrors {
  const errors: SignupErrors = {};

  if (input.name.trim().length < 2) {
    errors.name = "Enter the name Posters and Taskers should see.";
  }

  if (!emailPattern.test(input.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  const phone = input.phone.trim();
  if (phone && (!phoneDigits.test(phone) || phone.replace(/\D/g, "").length < 10)) {
    errors.phone = "Enter a valid phone number, including the area code.";
  }

  if (input.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }

  if (input.confirmPassword !== input.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!input.ageAttested) {
    errors.ageAttested = "TaskHive is an adults-only marketplace.";
  }

  if (!input.acceptedTerms) {
    errors.acceptedTerms = "Accept the terms to continue.";
  }

  return errors;
}
