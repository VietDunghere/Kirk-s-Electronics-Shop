// application.service — Customer use cases: Register, Login, session token.
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { customerRepository } from "../../infrastructure/repository/customerRepository";
import { normalizeEmail, validateRegistration, type RegistrationInput, type SessionUser } from "../../domain/customer/customer";
import { AppError } from "./appError";

export type { SessionUser } from "../../domain/customer/customer";

const JWT_SECRET = process.env.JWT_SECRET || "httt-university-demo-secret-key-change-in-production";

function toSession(c: { id: number; fullName: string; email: string }): SessionUser {
  return { id: c.id, fullName: c.fullName, email: c.email };
}

export const customerService = {
  signToken(user: SessionUser): string {
    return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
  },

  verifyToken(token: string): SessionUser | null {
    try {
      return jwt.verify(token, JWT_SECRET) as SessionUser;
    } catch {
      return null;
    }
  },

  // Full session check: valid signature AND the user still exists in the DB.
  // After a DB reseed, old cookies point to deleted user ids — those must
  // become "logged out" (401), never ghost ids that break FK constraints.
  async resolveSession(token: string | undefined): Promise<SessionUser | null> {
    if (!token) return null;
    const payload = customerService.verifyToken(token);
    if (!payload || typeof payload.id !== "number") return null;
    const profile = await customerRepository.findProfileById(payload.id);
    if (!profile) return null;
    return { id: profile.id, fullName: profile.fullName, email: profile.email };
  },

  async register(input: RegistrationInput) {
    const invalid = validateRegistration(input);
    if (invalid) throw new AppError(400, invalid);
    const email = normalizeEmail(input.email as string);
    if (await customerRepository.findByEmail(email)) throw new AppError(409, "Email already exists.");
    const passwordHash = await bcrypt.hash(input.password as string, 10);
    const customer = await customerRepository.save({ fullName: (input.fullName as string).trim(), email, passwordHash });
    const user = toSession(customer);
    return { user, token: customerService.signToken(user) };
  },

  async login(email?: string, password?: string) {
    if (!email?.trim() || !password) throw new AppError(400, "Email and password are required.");
    const customer = await customerRepository.findByEmail(normalizeEmail(email));
    if (!customer) throw new AppError(401, "Invalid email or password.");
    if (!(await bcrypt.compare(password, customer.passwordHash))) throw new AppError(401, "Invalid email or password.");
    const user = toSession(customer);
    return { user, token: customerService.signToken(user) };
  },

  getProfile(id: number) {
    return customerRepository.findProfileById(id);
  }
};
