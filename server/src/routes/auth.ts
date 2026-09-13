import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { sessionCookieName, sessionCookieOptions, signSession } from "../lib/auth.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID environment variable is required");
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export const authRouter = Router();

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

  const user = await prisma.user.upsert({
    where: { googleId: payload.sub },
    update: { email: payload.email, name: payload.name ?? null, picture: payload.picture ?? null },
    create: {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      picture: payload.picture ?? null,
    },
  });

  res.cookie(sessionCookieName, signSession(user.id), sessionCookieOptions);
  res.json({ user: { id: user.id, email: user.email, name: user.name, picture: user.picture } });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(sessionCookieName, { ...sessionCookieOptions, maxAge: undefined });
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json({ user: { id: user.id, email: user.email, name: user.name, picture: user.picture } });
});
