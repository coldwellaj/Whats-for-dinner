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
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export const authRouter = Router();

type UsernameResult = { ok: true; value: string } | { ok: false; error: string };

// Normalizes and validates a claimed username (lowercased, like email, so uniqueness is
// effectively case-insensitive). Returns `ok: false` for anything that doesn't fit the
// allowed shape — callers still need to check the unique constraint separately.
function normalizeUsername(raw: string): UsernameResult {
  const trimmed = raw.trim().toLowerCase();
  if (!USERNAME_RE.test(trimmed)) {
    return { ok: false, error: "Username must be 3-20 characters, using only letters, numbers, and underscores" };
  }
  return { ok: true, value: trimmed };
}

// Logs the user in. For a brand-new account only (isNewUser), also auto-resolves a
// pending family invite for their email — signing up via that invite *is* their
// confirmation. An existing user must explicitly accept via the Family page instead;
// otherwise simply logging in again would silently join them to a family with no
// confirmation step at all, which is exactly what adding invite emails was meant to fix.
async function finishLogin(res: Response, user: User, isNewUser: boolean) {
  if (isNewUser && !user.familyId) {
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

// POST /api/auth/signup  { email, password, name?, username? }
authRouter.post("/signup", async (req, res) => {
  const { email, password, name, username } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    username?: string;
  };

  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "A valid email address is required" });
  }
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
  }

  let normalizedUsername: string | null = null;
  if (username?.trim()) {
    const result = normalizeUsername(username);
    if (!result.ok) return res.status(400).json({ error: result.error });
    normalizedUsername = result.value;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  if (normalizedUsername) {
    const usernameTaken = await prisma.user.findUnique({ where: { username: normalizedUsername } });
    if (usernameTaken) {
      return res.status(409).json({ error: "That username is already taken" });
    }
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
      name: name?.trim() || null,
      username: normalizedUsername,
    },
  });

  await finishLogin(res, user, true);
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

  await finishLogin(res, user, false);
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

  let user: User;
  let isNewUser = false;
  if (existingByEmail) {
    user = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        googleId: payload.sub,
        name: existingByEmail.name ?? payload.name ?? null,
        picture: payload.picture ?? existingByEmail.picture ?? null,
      },
    });
  } else {
    // Google account's email may have changed since a prior login; fall back to googleId.
    const existingByGoogleId = await prisma.user.findUnique({ where: { googleId: payload.sub } });
    if (existingByGoogleId) {
      user = await prisma.user.update({
        where: { id: existingByGoogleId.id },
        data: { email: payload.email, name: payload.name ?? null, picture: payload.picture ?? null },
      });
    } else {
      user = await prisma.user.create({
        data: { googleId: payload.sub, email: payload.email, name: payload.name ?? null, picture: payload.picture ?? null },
      });
      isNewUser = true;
    }
  }

  await finishLogin(res, user, isNewUser);
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

const NAME_MAX_LENGTH = 100;
const MAX_PICTURE_BYTES = 500_000;
// Client resizes/compresses to a small JPEG before sending; this just re-validates shape
// and enforces a hard ceiling server-side, since this endpoint can also be called directly.
const PICTURE_DATA_URL_RE = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/]+=*)$/;

// PUT /api/auth/me  { name?, picture?, username? } — updates the caller's own display name,
// profile picture, and/or username. Each field may be omitted to leave it unchanged; picture
// and username may be set to null to remove them.
authRouter.put("/me", requireAuth, async (req, res) => {
  const { name, picture, username } = req.body as {
    name?: string | null;
    picture?: string | null;
    username?: string | null;
  };

  const data: { name?: string | null; picture?: string | null; username?: string | null } = {};

  if (name !== undefined) {
    const trimmed = (name ?? "").trim();
    if (trimmed.length > NAME_MAX_LENGTH) {
      return res.status(400).json({ error: `Name must be ${NAME_MAX_LENGTH} characters or fewer` });
    }
    data.name = trimmed || null;
  }

  if (picture !== undefined) {
    if (picture === null) {
      data.picture = null;
    } else {
      const match = PICTURE_DATA_URL_RE.exec(picture);
      if (!match) {
        return res.status(400).json({ error: "Picture must be a PNG, JPEG, or WEBP image" });
      }
      const approxBytes = Math.floor((match[2].length * 3) / 4);
      if (approxBytes > MAX_PICTURE_BYTES) {
        return res.status(400).json({ error: "Picture is too large (max 500KB)" });
      }
      data.picture = picture;
    }
  }

  if (username !== undefined) {
    if (username === null || !username.trim()) {
      data.username = null;
    } else {
      const result = normalizeUsername(username);
      if (!result.ok) return res.status(400).json({ error: result.error });
      const usernameTaken = await prisma.user.findUnique({ where: { username: result.value } });
      if (usernameTaken && usernameTaken.id !== req.userId) {
        return res.status(409).json({ error: "That username is already taken" });
      }
      data.username = result.value;
    }
  }

  const user = await prisma.user.update({ where: { id: req.userId }, data });
  res.json({ user: toUserJson(user) });
});

function toUserJson(user: {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
  username: string | null;
  familyId: string | null;
}) {
  return { id: user.id, email: user.email, name: user.name, picture: user.picture, username: user.username, familyId: user.familyId };
}
