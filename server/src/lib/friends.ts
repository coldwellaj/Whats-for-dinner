import { prisma } from "../db.js";
import { isVisibility, type Visibility } from "./types.js";

/** Narrows a raw DB string to Visibility, defensively falling back to the safest value. */
export function asVisibility(value: string): Visibility {
  return isVisibility(value) ? value : "PRIVATE";
}

/** Where-clause for a target user's own scope: their family's shared data if they're in
 * one, else just their own. Mirrors requireAuth's scopeWhere, but for an arbitrary user
 * being viewed rather than the caller. */
export function scopeWhereForUser(user: { id: string; familyId: string | null }) {
  return user.familyId ? { familyId: user.familyId } : { familyId: null, userId: user.id };
}

export async function areFriends(userIdA: string, userIdB: string): Promise<boolean> {
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userIdA, addresseeId: userIdB },
        { requesterId: userIdB, addresseeId: userIdA },
      ],
    },
  });
  return !!friendship;
}

/** Whether `viewerId` may see content owned by `targetId` that's set to `visibility`. */
export async function canView(viewerId: string, targetId: string, visibility: Visibility): Promise<boolean> {
  if (viewerId === targetId) return true;
  if (visibility === "ALL") return true;
  if (visibility === "PRIVATE") return false;
  return areFriends(viewerId, targetId);
}
