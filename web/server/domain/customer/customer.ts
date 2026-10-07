// domain.customer — Customer entity, session data and registration rules.
export interface Customer {
  id: number;
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export type SessionUser = {
  id: number;
  fullName: string;
  email: string;
};

export type RegistrationInput = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Returns an error message, or null when the registration data is valid. */
export function validateRegistration(input: RegistrationInput): string | null {
  const { fullName, email, password, confirmPassword } = input;
  if (!fullName?.trim() || !email?.trim() || !password || !confirmPassword) return "All fields are required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (password !== confirmPassword) return "Password and confirmation must match.";
  return null;
}
