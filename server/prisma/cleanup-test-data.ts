import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Matches the QA agent's documented test-data conventions (see .claude/agents/qa-tester.md):
// throwaway accounts signed up as `qa-tester+<timestamp>@example.test` — ".test" is an
// IANA-reserved TLD that can never resolve to a real domain, so this can't collide with a
// real user's email — and anything titled with a "[QA]" prefix, regardless of which account
// it ended up under.
const TEST_EMAIL_DOMAIN = "@example.test";
const QA_TITLE_PREFIX = "[QA]";

// Defaults to a dry run (report only, deletes nothing) — pass --confirm to actually delete
// what it finds. Run via `npm run cleanup:test-data -w server` / `-- --confirm`.
const DRY_RUN = !process.argv.includes("--confirm");

async function main() {
  const testUsers = await prisma.user.findMany({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      _count: { select: { recipes: true, mealPlanEntries: true, shoppingListItems: true } },
    },
  });
  const testUserIds = testUsers.map((u) => u.id);

  // Recipes titled "[QA] ..." even under an account that doesn't otherwise look like a test
  // user (e.g. created against a real/curator account during manual testing).
  const qaRecipes = await prisma.recipe.findMany({
    where: { name: { startsWith: QA_TITLE_PREFIX } },
    select: { id: true, name: true, userId: true },
  });

  // Pending household invites sent to a test email that never got claimed (normally these
  // auto-resolve into membership on signup — see auth.ts's finishLogin — so a leftover one
  // means the invited test user never actually signed up before the run ended).
  const orphanInvites = await prisma.familyInvite.findMany({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
    select: { id: true, email: true },
  });

  // Households owned by a test user must be deleted before the owner, since Family.owner has
  // no cascade — deleting the owner first would fail on the FK constraint.
  const ownedFamilies = testUserIds.length
    ? await prisma.family.findMany({ where: { ownerId: { in: testUserIds } }, select: { id: true, name: true } })
    : [];

  console.log(`Test users (email ending in "${TEST_EMAIL_DOMAIN}"): ${testUsers.length}`);
  for (const u of testUsers) {
    console.log(
      `  - ${u.email} (${u.name ?? "no name"}, created ${u.createdAt.toISOString()}) — ` +
        `${u._count.recipes} recipe(s), ${u._count.mealPlanEntries} meal-plan entr(y/ies), ${u._count.shoppingListItems} shopping-list item(s)`,
    );
  }

  console.log(`\nRecipes titled "${QA_TITLE_PREFIX} ...": ${qaRecipes.length}`);
  for (const r of qaRecipes) console.log(`  - "${r.name}" (owner ${r.userId})`);

  console.log(`\nUnclaimed household invites to a test email: ${orphanInvites.length}`);
  for (const i of orphanInvites) console.log(`  - ${i.email}`);

  console.log(`\nHouseholds owned by a test user (deleted first, to unblock deleting the owner): ${ownedFamilies.length}`);
  for (const f of ownedFamilies) console.log(`  - ${f.name ?? "(unnamed)"} (${f.id})`);

  if (testUsers.length === 0 && qaRecipes.length === 0 && orphanInvites.length === 0) {
    console.log("\nNothing matched — nothing to clean up.");
    return;
  }

  if (DRY_RUN) {
    console.log("\nDry run only — nothing deleted. Re-run with --confirm to actually delete the above.");
    return;
  }

  await prisma.$transaction([
    prisma.familyInvite.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } }),
    ...(ownedFamilies.length ? [prisma.family.deleteMany({ where: { id: { in: ownedFamilies.map((f) => f.id) } } })] : []),
    ...(qaRecipes.length ? [prisma.recipe.deleteMany({ where: { id: { in: qaRecipes.map((r) => r.id) } } })] : []),
    // Cascades onto each user's remaining recipes, meal-plan entries, shopping-list items, and
    // friendships (see the schema's onDelete: Cascade relations) — this is the step that
    // actually removes the bulk of a test run's data.
    ...(testUserIds.length ? [prisma.user.deleteMany({ where: { id: { in: testUserIds } } })] : []),
  ]);

  console.log("\nDeleted the above test/QA data.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
