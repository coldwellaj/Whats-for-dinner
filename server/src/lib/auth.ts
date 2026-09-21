import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}
const SESSION_SECRET: string = process.env.SESSION_SECRET;

const SESSION_COOKIE_NAME = "session";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId }, SESSION_SECRET, { expiresIn: "30d" });
}

export function verifySession(token: string): string | null {
  try {
    const payload = jwt.verify(token, SESSION_SECRET) as jwt.JwtPayload;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

const PASSWORD_SALT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const sessionCookieName = SESSION_COOKIE_NAME;
export const sessionCookieOptions = {
  httpOnly: true,
  // Secure cookies are dropped by browsers over plain http, which local dev uses.
  secure: process.env.NODE_ENV === "production",
  // The web client reaches the API through a same-origin Vercel rewrite, so "lax" is enough
  // there. The native (Capacitor) app bundle is served from its own origin and calls the API
  // cross-origin, which requires "none" — that only works paired with Secure, so it's gated
  // the same way, and dev keeps "lax" since local http can't use Secure cookies at all.
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: SESSION_MAX_AGE_MS,
  path: "/",
};
