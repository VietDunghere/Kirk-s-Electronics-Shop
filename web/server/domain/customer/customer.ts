// domain.customer — Customer entity (with the login check), session data and registration rules.
import bcrypt from "bcryptjs";

export type CustomerRecord = { id: number; fullName: string; email: string; passwordHash: string; createdAt: Date };

export class Customer {
  constructor(
    public id: number,
    public fullName: string,
    public email: string,
    public passwordHash: string,
    public createdAt: Date
  ) {}

  static fromRecord(r: CustomerRecord): Customer {
    return new Customer(r.id, r.fullName, r.email, r.passwordHash, r.createdAt);
  }

  /** Hình 1 login(email, password): true when the e-mail is this customer's and the password matches the stored hash. */
  async login(email: string, password: string): Promise<boolean> {
    return normalizeEmail(email) === this.email && (await bcrypt.compare(password, this.passwordHash));
  }
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
