import { Router } from "express";
import { prisma, Prisma } from "../db.js";
import { joinFamily } from "../lib/family.js";
import { sendFamilyInviteEmail } from "../lib/email.js";

export const familyRouter = Router();

familyRouter.get("/", async (req, res) => {
  if (!req.familyId) return res.json({ family: null });

  const family = await prisma.family.findUnique({
    where: { id: req.familyId },
    include: {
      members: { select: { id: true, email: true, name: true, picture: true } },
      invites: { select: { id: true, email: true, createdAt: true } },
    },
  });
  if (!family) return res.json({ family: null });

  res.json({
    family: {
      id: family.id,
      name: family.name,
      ownerId: family.ownerId,
      members: family.members,
      invites: family.invites,
    },
  });
});

familyRouter.post("/", async (req, res) => {
  if (req.familyId) return res.status(400).json({ error: "You're already in a family" });

  const { name } = req.body as { name?: string };

  const family = await prisma.family.create({
    data: { name: name?.trim() || null, ownerId: req.userId },
  });
  await joinFamily(req.userId, family.id);

  res.status(201).json({ family: { id: family.id, name: family.name, ownerId: family.ownerId } });
});

// POST /api/family/invite  { email } — always creates a pending invite the recipient
// must accept, even for an existing user (previously this auto-joined existing users
// with no confirmation at all).
familyRouter.post("/invite", async (req, res) => {
  if (!req.familyId) return res.status(400).json({ error: "You're not in a family yet" });

  const { email } = req.body as { email?: string };
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return res.status(400).json({ error: "email is required" });

  const [family, inviter, existingUser] = await Promise.all([
    prisma.family.findUniqueOrThrow({ where: { id: req.familyId } }),
    prisma.user.findUniqueOrThrow({ where: { id: req.userId } }),
    prisma.user.findUnique({ where: { email: normalizedEmail } }),
  ]);

  if (existingUser) {
    if (existingUser.familyId === req.familyId) {
      return res.status(400).json({ error: "That person is already in your family" });
    }
    if (existingUser.familyId) {
      return res.status(400).json({ error: "That person is already in another family" });
    }
  }

  await prisma.familyInvite.upsert({
    where: { familyId_email: { familyId: req.familyId, email: normalizedEmail } },
    update: {},
    create: { familyId: req.familyId, email: normalizedEmail, invitedBy: req.userId },
  });

  void sendFamilyInviteEmail(normalizedEmail, {
    familyName: family.name || "their family",
    invitedByName: inviter.name ?? inviter.email,
    hasAccount: !!existingUser,
  });

  res.status(202).json({ status: "invited" });
});

// GET /api/family/invites — pending invites addressed to the caller's own email.
familyRouter.get("/invites", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  const invites = await prisma.familyInvite.findMany({
    where: { email: user.email },
    include: { family: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(invites.map((i) => ({ id: i.id, familyName: i.family.name, createdAt: i.createdAt })));
});

// POST /api/family/invites/:id/accept
familyRouter.post("/invites/:id/accept", async (req, res) => {
  if (req.familyId) return res.status(400).json({ error: "You're already in a family" });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  const invite = await prisma.familyInvite.findFirst({ where: { id: req.params.id, email: user.email } });
  if (!invite) return res.status(404).json({ error: "Invite not found" });

  await joinFamily(req.userId, invite.familyId);
  await prisma.familyInvite.delete({ where: { id: invite.id } });
  res.status(204).end();
});

// DELETE /api/family/invites/:id — the invited person may decline; any current member of
// the inviting family may cancel it.
familyRouter.delete("/invites/:id", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  // Built as an array rather than `{ familyId: req.familyId ?? undefined }` inside the OR:
  // an `undefined` value there doesn't filter, it *drops* the key, leaving `{}` — which
  // matches every row — silently turning "same family" into "any invite" when the caller
  // has no family at all.
  const conditions: Prisma.FamilyInviteWhereInput[] = [{ email: user.email }];
  if (req.familyId) conditions.push({ familyId: req.familyId });

  await prisma.familyInvite.deleteMany({
    where: { id: req.params.id, OR: conditions },
  });
  res.status(204).end();
});

familyRouter.delete("/members/:userId", async (req, res) => {
  if (!req.familyId) return res.status(400).json({ error: "You're not in a family" });

  const family = await prisma.family.findUnique({ where: { id: req.familyId } });
  if (!family || family.ownerId !== req.userId) {
    return res.status(403).json({ error: "Only the family owner can remove members" });
  }
  if (req.params.userId === family.ownerId) {
    return res.status(400).json({ error: "The owner can't remove themselves" });
  }

  await prisma.user.updateMany({
    where: { id: req.params.userId, familyId: req.familyId },
    data: { familyId: null },
  });
  res.status(204).end();
});
