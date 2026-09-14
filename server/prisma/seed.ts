import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// A dedicated account that owns the curated examples so Discover isn't empty for new
// installs. It has no password/googleId, so it can't sign in — it's a data owner only.
const CURATOR_EMAIL = "hello@whatsfordinner.app";

interface ExampleIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface ExampleRecipe {
  name: string;
  description: string;
  instructions: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  tags: string;
  ingredients: ExampleIngredient[];
}

const EXAMPLE_RECIPES: ExampleRecipe[] = [
  {
    name: "Classic Grilled Cheese",
    description: "A quick, comforting classic — ready in minutes.",
    instructions:
      "1. Butter one side of each bread slice.\n2. Place the cheese between the unbuttered sides.\n3. Cook in a skillet over medium heat, 3-4 minutes per side, until golden and the cheese is melted.",
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    servings: 1,
    tags: "quick, comfort food, vegetarian",
    ingredients: [
      { name: "Bread", quantity: 2, unit: "slice" },
      { name: "Cheddar cheese", quantity: 2, unit: "slice" },
      { name: "Butter", quantity: 1, unit: "tbsp" },
    ],
  },
  {
    name: "Simple Weeknight Spaghetti",
    description: "A no-fuss tomato spaghetti you can make with pantry staples.",
    instructions:
      "1. Bring a large pot of salted water to a boil and cook the spaghetti according to package directions.\n2. Meanwhile, warm the marinara sauce with the garlic in a saucepan over medium-low heat.\n3. Drain the pasta, toss with the sauce, and top with parmesan before serving.",
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: 4,
    tags: "pasta, dinner, italian",
    ingredients: [
      { name: "Spaghetti", quantity: 1, unit: "lb" },
      { name: "Marinara sauce", quantity: 24, unit: "oz" },
      { name: "Garlic", quantity: 2, unit: "clove" },
      { name: "Parmesan cheese", quantity: 0.5, unit: "cup", notes: "grated, for serving" },
    ],
  },
];

async function main() {
  const curator = await prisma.user.upsert({
    where: { email: CURATOR_EMAIL },
    update: {},
    create: { email: CURATOR_EMAIL, name: "What's for Dinner" },
  });

  for (const example of EXAMPLE_RECIPES) {
    const existing = await prisma.recipe.findFirst({ where: { userId: curator.id, name: example.name } });
    if (existing) {
      console.log(`Skipping "${example.name}" — already seeded.`);
      continue;
    }

    const recipe = await prisma.recipe.create({
      data: {
        userId: curator.id,
        name: example.name,
        description: example.description,
        instructions: example.instructions,
        prepTimeMinutes: example.prepTimeMinutes,
        cookTimeMinutes: example.cookTimeMinutes,
        servings: example.servings,
        tags: example.tags,
        isShared: true,
      },
    });

    for (const ing of example.ingredients) {
      const ingredient = await prisma.ingredient.upsert({
        where: { name: ing.name },
        update: {},
        create: { name: ing.name, defaultUnit: ing.unit },
      });
      await prisma.recipeIngredient.create({
        data: {
          recipeId: recipe.id,
          ingredientId: ingredient.id,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes ?? null,
        },
      });
    }

    console.log(`Seeded "${example.name}".`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
