import { Router } from "express";
import { prisma } from "../db.js";
import { asVisibility, canView, scopeWhereForUser } from "../lib/friends.js";
import { isVisibility } from "../lib/types.js";
import { sendFriendRequestEmail } from "../lib/email.js";

export const friendsRouter = Router();

const PUBLIC_USER_SELECT = { id: true, name: true, email: true, picture: true } as const;

function toUserJson(user: { id: string; name: string | null; email: string; picture: string | null }) {
  return user;
}

// GET/PUT /api/friends/privacy — the caller's own visibility settings.
friendsRouter.get("/privacy", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.userId },
    select: { mealPlanVisibility: true, recentlyMadeVisibility: true, recipeListVisibility: true },
  });
  res.json(user);
});

friendsRouter.put("/privacy", async (req, res) => {
  const { mealPlanVisibility, recentlyMadeVisibility, recipeListVisibility } = req.body as {
    mealPlanVisibility?: string;
    recentlyMadeVisibility?: string;
    recipeListVisibility?: string;
  };
  for (const [key, value] of Object.entries({ mealPlanVisibility, recentlyMadeVisibility, recipeListVisibility })) {
    if (value !== undefined && !isVisibility(value)) {
      return res.status(400).json({ error: `Invalid value for ${key}` });
    }
  }
  const updated = await prisma.user.update({
    where: { id: req.userId },
    data: {
      ...(mealPlanVisibility !== undefined ? { mealPlanVisibility } : {}),
      ...(recentlyMadeVisibility !== undefined ? { recentlyMadeVisibility } : {}),
      ...(recipeListVisibility !== undefined ? { recipeListVisibility } : {}),
    },
    select: { mealPlanVisibility: true, recentlyMadeVisibility: true, recipeListVisibility: true },
  });
  res.json(updated);
});

// GET /api/friends — the caller's accepted friends. Includes the Friendship row's own id
// (as `friendshipId`) alongside the other person's info, since removing a friendship is
// keyed by that row's id, not the friend's user id.
friendsRouter.get("/", async (req, res) => {
  const friendships = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ requesterId: req.userId }, { addresseeId: req.userId }] },
    include: { requester: { select: PUBLIC_USER_SELECT }, addressee: { select: PUBLIC_USER_SELECT } },
    orderBy: { respondedAt: "desc" },
  });
  const friends = friendships.map((f) => ({
    friendshipId: f.id,
    ...toUserJson(f.requesterId === req.userId ? f.addressee : f.requester),
  }));
  res.json(friends);
});

// GET /api/friends/requests — pending requests, split by direction.
friendsRouter.get("/requests", async (req, res) => {
  const pending = await prisma.friendship.findMany({
    where: { status: "PENDING", OR: [{ requesterId: req.userId }, { addresseeId: req.userId }] },
    include: { requester: { select: PUBLIC_USER_SELECT }, addressee: { select: PUBLIC_USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    incoming: pending.filter((f) => f.addresseeId === req.userId).map((f) => ({ id: f.id, from: toUserJson(f.requester) })),
    outgoing: pending.filter((f) => f.requesterId === req.userId).map((f) => ({ id: f.id, to: toUserJson(f.addressee) })),
  });
});

const FRIEND_SEARCH_LIMIT = 8;

// GET /api/friends/search?q=<partial username> — typeahead suggestions for the "Add a
// friend" search box. Matches by username prefix (usernames are stored lowercased, see
// auth.ts's normalizeUsername), excludes the caller, and never returns email — this is
// visible to any signed-in user who types a matching prefix. Registered before the
// `/:userId/...` routes below so "search" isn't swallowed as a userId param.
friendsRouter.get("/search", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim().toLowerCase().replace(/^@/, "");
  if (!q) return res.json([]);

  const users = await prisma.user.findMany({
    where: { username: { startsWith: q }, id: { not: req.userId } },
    select: { id: true, username: true, name: true, picture: true },
    orderBy: { username: "asc" },
    take: FRIEND_SEARCH_LIMIT,
  });
  res.json(users);
});

// POST /api/friends/requests  { username } — send a friend request by username. Auto-accepts
// if the target already sent the caller a pending request, instead of leaving two stuck rows.
friendsRouter.post("/requests", async (req, res) => {
  const { username } = req.body as { username?: string };
  const normalizedUsername = username?.trim().toLowerCase().replace(/^@/, "");
  if (!normalizedUsername) return res.status(400).json({ error: "username is required" });

  const target = await prisma.user.findUnique({ where: { username: normalizedUsername } });
  if (!target) return res.status(404).json({ error: "No user found with that username" });
  if (target.id === req.userId) return res.status(400).json({ error: "You can't friend yourself" });

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: req.userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: req.userId },
      ],
    },
  });

  if (existing?.status === "ACCEPTED") {
    return res.status(400).json({ error: "You're already friends with that person" });
  }

  if (existing && existing.requesterId === target.id) {
    // They already requested us — accept it instead of creating a duplicate/reverse row.
    const accepted = await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
    return res.status(200).json({ status: "accepted", friendship: accepted });
  }

  if (existing) {
    return res.status(400).json({ error: "A friend request is already pending with that person" });
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: req.userId, addresseeId: target.id },
  });

  const requester = await prisma.user.findUnique({ where: { id: req.userId } });
  if (requester) {
    void sendFriendRequestEmail(target.email, requester.name ?? requester.email);
  }

  res.status(201).json({ status: "requested", friendship });
});

// POST /api/friends/requests/:id/accept
friendsRouter.post("/requests/:id/accept", async (req, res) => {
  const request = await prisma.friendship.findFirst({
    where: { id: req.params.id, addresseeId: req.userId, status: "PENDING" },
  });
  if (!request) return res.status(404).json({ error: "Friend request not found" });

  const accepted = await prisma.friendship.update({
    where: { id: request.id },
    data: { status: "ACCEPTED", respondedAt: new Date() },
  });
  res.json(accepted);
});

// DELETE /api/friends/:id — cancel/decline a pending request, or remove an existing
// friendship. Either party may call this.
friendsRouter.delete("/:id", async (req, res) => {
  await prisma.friendship.deleteMany({
    where: { id: req.params.id, OR: [{ requesterId: req.userId }, { addresseeId: req.userId }] },
  });
  res.status(204).end();
});

// GET /api/friends/:userId/profile — basic identity, not gated by visibility settings.
friendsRouter.get("/:userId/profile", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.userId }, select: PUBLIC_USER_SELECT });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(toUserJson(user));
});

// GET /api/friends/:userId/meal-plan?start=&end=
friendsRouter.get("/:userId/meal-plan", async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (!(await canView(req.userId, target.id, asVisibility(target.mealPlanVisibility)))) {
    return res.status(403).json({ error: "This person's meal plan isn't shared with you" });
  }

  const { start, end } = req.query as { start?: string; end?: string };
  if (!start || !end) return res.status(400).json({ error: "start and end query params are required" });

  const entries = await prisma.mealPlanEntry.findMany({
    where: {
      ...scopeWhereForUser(target),
      date: { gte: new Date(`${start}T00:00:00.000Z`), lt: new Date(`${end}T00:00:00.000Z`) },
    },
    include: { recipe: true },
    orderBy: [{ date: "asc" }, { mealType: "asc" }],
  });
  res.json(entries);
});

// GET /api/friends/:userId/recently-made?limit=
friendsRouter.get("/:userId/recently-made", async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (!(await canView(req.userId, target.id, asVisibility(target.recentlyMadeVisibility)))) {
    return res.status(403).json({ error: "This person's recent activity isn't shared with you" });
  }

  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const entries = await prisma.mealPlanEntry.findMany({
    where: { ...scopeWhereForUser(target), status: "MADE" },
    include: { recipe: true },
    orderBy: { date: "desc" },
    take: limit,
  });
  res.json(entries);
});

// GET /api/friends/:userId/recipes — the target's full recipe list, independent of
// whether individual recipes are marked shareable via Discover.
friendsRouter.get("/:userId/recipes", async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!target) return res.status(404).json({ error: "User not found" });
  if (!(await canView(req.userId, target.id, asVisibility(target.recipeListVisibility)))) {
    return res.status(403).json({ error: "This person's recipe list isn't shared with you" });
  }

  const recipes = await prisma.recipe.findMany({
    where: scopeWhereForUser(target),
    include: { ingredients: { include: { ingredient: true } } },
    orderBy: { name: "asc" },
  });
  res.json(recipes);
});
