import { Router } from "express";
import { prisma } from "../db.js";
import { joinFamily } from "../lib/family.js";

export const familyRouter = Router();

familyRouter.get("/", async (req, res) => {
  if (!req.familyId) return res.json({ family: null });

  const family = await prisma.family.findUnique({
    where: { id: req.familyId },
    include: { members: { select: { id: true, email: true, name: true, picture: true } } },
  });
  if (!family) return res.json({ family: null });

  res.json({
    family: {
      id: family.id,
      name: family.name,
      ownerId: family.ownerId,
      members: family.members,
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

familyRouter.post("/invite", async (req, res) => {
  if (!req.familyId) return res.status(400).json({ error: "You're not in a family yet" });

  const { email } = req.body as { email?: string };
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return res.status(400).json({ error: "email is required" });

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existingUser) {
    if (existingUser.familyId === req.familyId) {
      return res.status(400).json({ error: "That person is already in your family" });
    }
    if (existingUser.familyId) {
      return res.status(400).json({ error: "That person is already in another family" });
    }
    await joinFamily(existingUser.id, req.familyId);
    return res.status(200).json({ status: "added" });
  }

  await prisma.familyInvite.upsert({
    where: { familyId_email: { familyId: req.familyId, email: normalizedEmail } },
    update: {},
    create: { familyId: req.familyId, email: normalizedEmail, invitedBy: req.userId },
  });
  res.status(202).json({ status: "invited" });
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
