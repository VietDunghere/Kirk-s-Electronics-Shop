// presentation.controller — CustomerController: Register, Login, Logout, current user.
import { NextResponse } from "next/server";
import { customerService } from "../../application/service/customerService";
import { AUTH_COOKIE, fail, getSessionUser, setAuthCookie } from "./http";

export const customerController = {
  async register(req: Request) {
    try {
      const { user, token } = await customerService.register(await req.json());
      const res = NextResponse.json({ message: "Registration successful.", user }, { status: 201 });
      setAuthCookie(res, token);
      return res;
    } catch (e) {
      return fail(e, "Registration failed.");
    }
  },

  async login(req: Request) {
    try {
      const { email, password } = await req.json();
      const { user, token } = await customerService.login(email, password);
      const res = NextResponse.json({ message: "Login successful.", user });
      setAuthCookie(res, token);
      return res;
    } catch (e) {
      return fail(e, "Login failed.");
    }
  },

  logout() {
    const res = NextResponse.json({ message: "Logged out." });
    res.cookies.set(AUTH_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  },

  async me() {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ user: null });
    const user = await customerService.getProfile(session.id);
    if (!user) return NextResponse.json({ user: null });
    return NextResponse.json({ user });
  }
};
