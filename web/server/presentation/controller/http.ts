// presentation.controller — shared HTTP helpers: session cookie, login gate, error -> response mapping.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AppError } from "../../application/service/appError";
import { customerService, type SessionUser } from "../../application/service/customerService";

export const AUTH_COOKIE = "shopviet_token";

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  return customerService.resolveSession(token);
}

/** Login gate: returns the session user or raises 401 with the given message. */
export async function requireSession(message = "Login required."): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new AppError(401, message);
  return session;
}

export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set(AUTH_COOKIE, token, { httpOnly: true, path: "/", maxAge: 7 * 24 * 3600, sameSite: "lax" });
}

export function fail(e: unknown, fallback = "Something went wrong.") {
  if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
