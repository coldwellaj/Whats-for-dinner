import { Router, type Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../db.js";
import type { User } from "@prisma/client";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  hashPassword,
  sessionCookieName,
  sessionCookieOptions,
  signSession,
  verifyPassword,
} from "../lib/auth.js";
import { joinFamily } from "../lib/family.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID environment variable is required");
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export const authRouter = Router();

// Resolves any pending family invite for a freshly-authenticated user, then
// logs them in. Shared by signup/login/Google so all three land the invite.
async function finishLogin(res: Response, user: User) {
  if (!user.familyId) {
    const invite = await prisma.familyInvite.findFirst({ where: { email: user.email } });
    if (invite) {
      await joinFamily(user.id, invite.familyId);
      await prisma.familyInvite.delete({ where: { id: invite.id } });
      user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    }
  }

  res.cookie(sessionCookieName, signSession(user.id), sessionCookieOptions);
  res.json({ user: toUserJson(user) });
}

// POST /api/auth/signup  { email, password, name? }
authRouter.post("/signup", async (req, res) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "A valid email address is required" });
  }
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      name: name?.trim() || null,
    },
  });

  await finishLogin(res, user);
});

// POST /api/auth/login  { email, password }
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  await finishLogin(res, user);
});

// POST /api/auth/google  { credential: <Google ID token> }
authRouter.post("/google", async (req, res) => {
  const { credential } = req.body as { credential?: string };
  if (!credential) {
    return res.status(400).json({ error: "credential is required" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Invalid Google credential" });
  }

  if (!payload?.sub || !payload.email) {
    return res.status(401).json({ error: "Invalid Google credential" });
  }

  // A user who originally signed up with email/password and later uses Google
  // with the same address should link onto that row, not collide on the unique
  // email constraint by trying to create a second user with it.
  const existingByEmail = await prisma.user.findUnique({ where: { email: payload.email } });

  const user = existingByEmail
    ? await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          googleId: payload.sub,
          name: existingByEmail.name ?? payload.name ?? null,
          picture: payload.picture ?? existingByEmail.picture ?? null,
        },
      })
    : await prisma.user.upsert({
        where: { googleId: payload.sub },
        update: { email: payload.email, name: payload.name ?? null, picture: payload.picture ?? null },
        create: {
          googleId: payload.sub,
          email: payload.email,
          name: payload.name ?? null,
          picture: payload.picture ?? null,
        },
      });

  await finishLogin(res, user);
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(sessionCookieName, { ...sessionCookieOptions, maxAge: undefined });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json({ user: toUserJson(user) });
});

function toUserJson(user: { id: string; email: string; name: string | null; picture: string | null; familyId: string | null }) {
  return { id: user.id, email: user.email, name: user.name, picture: user.picture, familyId: user.familyId };
}
