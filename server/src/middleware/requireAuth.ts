import type { NextFunction, Request, Response } from "express";
import { sessionCookieName, verifySession } from "../lib/auth.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[sessionCookieName];
  const userId = typeof token === "string" ? verifySession(token) : null;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.userId = userId;
  next();
}
