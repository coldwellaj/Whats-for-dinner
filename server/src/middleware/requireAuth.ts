import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { sessionCookieName, verifySession } from "../lib/auth.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[sessionCookieName];
  const userId = typeof token === "string" ? verifySession(token) : null;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  req.userId = user.id;
  req.familyId = user.familyId;
  next();
}

/** Where-clause for rows scoped to the caller: their family's shared data if they're in one, else just their own. */
export function scopeWhere(req: Request) {
  return req.familyId ? { familyId: req.familyId } : { familyId: null, userId: req.userId };
}
