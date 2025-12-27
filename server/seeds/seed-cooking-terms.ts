import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { cookingTerms } from "@shared/schema";

const COOKING_TERMS_DATA = [
  // Techniques
  {
    term: "sauté",
    definition:
      "Cook food quickly in a small amount of fat over relatively high heat while stirring or tossing frequently.",
    category: "technique",
    difficulty: "beginner",
    pronunciation: "soh-TAY",
    relatedTerms: ["pan-fry", "stir-fry"],
  },
  {
    term: "braise",
    definition:
      "A cooking method that uses both wet and dry heat. Food is first seared at high temperature, then finished in a covered pot with liquid at low heat.",
    category: "technique",
    difficulty: "intermediate",
    relatedTerms: ["stew", "simmer"],
  },
  {
    term: "blanch",
    definition:
      "Briefly cook food in boiling water, then immediately plunge into ice water to stop the cooking process.",
    category: "technique",
    difficulty: "beginner",
    relatedTerms: ["shock", "parboil"],
  },
  {
    term: "deglaze",
    definition:
      "Add liquid to a hot pan to loosen and dissolve the browned bits (fond) stuck to the bottom after cooking meat or vegetables.",
    category: "technique",
    difficulty: "beginner",
    relatedTerms: ["fond", "reduce"],
  },
  {
    term: "fold",
    definition:
      "Gently combine a light mixture with a heavier one using a lifting and turning motion to preserve air and volume.",
    category: "technique",
    difficulty: "beginner",
    relatedTerms: ["whip", "incorporate"],
  },
  {
    term: "reduce",
    definition:
      "Simmer a liquid to evaporate water and concentrate its flavors, resulting in a thicker consistency.",
    category: "technique",
    difficulty: "beginner",
    relatedTerms: ["simmer", "concentrate"],
  },
  {
    term: "sear",
    definition:
      "Brown the surface of meat quickly over very high heat to create a flavorful crust.",
    category: "technique",
    difficulty: "beginner",
    relatedTerms: ["brown", "caramelize"],
  },
  {
    term: "poach",
    definition:
      "Cook food gently in liquid that is just below the boiling point, typically between 160-180°F (71-82°C).",
    category: "technique",
    difficulty: "intermediate",
    relatedTerms: ["simmer", "sous vide"],
  },
  {
    term: "baste",
    definition:
      "Pour liquid (such as pan drippings, melted butter, or marinade) over food while cooking to keep it moist and add flavor.",
    category: "technique",
    difficulty: "beginner",
    relatedTerms: ["drizzle", "brush"],
  },
  {
    term: "caramelize",
    definition:
      "Heat sugar until it melts and turns brown, or cook foods with natural sugars until they brown and develop a sweet, nutty flavor.",
    category: "technique",
    difficulty: "intermediate",
    relatedTerms: ["brown", "sear"],
  },
  {
    term: "emulsify",
    definition:
      "Combine two liquids that normally don't mix (like oil and water) into a smooth, stable mixture.",
    category: "technique",
    difficulty: "intermediate",
    relatedTerms: ["blend", "whisk"],
  },
  {
    term: "flambé",
    definition:
      "Add alcohol to a hot pan and ignite it to burn off the alcohol while adding flavor.",
    category: "technique",
    difficulty: "advanced",
    pronunciation: "flahm-BAY",
    relatedTerms: ["deglaze", "reduce"],
  },
  {
    term: "marinate",
    definition:
      "Soak food in a seasoned liquid to add flavor and sometimes tenderize it.",
    category: "technique",
    difficulty: "beginner",
    relatedTerms: ["brine", "tenderize"],
  },
  {
    term: "pan-fry",
    definition:
      "Cook food in a moderate amount of fat in an uncovered pan over medium to high heat.",
    category: "technique",
    difficulty: "beginner",
    relatedTerms: ["sauté", "deep-fry"],
  },
  {
    term: "roast",
    definition:
      "Cook food uncovered in an oven using dry heat, typically at higher temperatures for browning and caramelization.",
    category: "technique",
    difficulty: "beginner",
    relatedTerms: ["bake", "broil"],
  },
  {
    term: "stir-fry",
    definition:
      "Cook small pieces of food quickly over very high heat in a wok or large pan while constantly stirring.",
    category: "technique",
    difficulty: "beginner",
    relatedTerms: ["sauté", "wok"],
  },
  {
    term: "steam",
    definition:
      "Cook food over boiling water using the steam's heat, preserving nutrients and moisture.",
    category: "technique",
    difficulty: "beginner",
    relatedTerms: ["blanch", "poach"],
  },
  {
    term: "sweat",
    definition:
      "Cook vegetables slowly in a small amount of fat over low heat until soft but not browned.",
    category: "technique",
    difficulty: "beginner",
    relatedTerms: ["sauté", "soften"],
  },
  {
    term: "temper",
    definition:
      "Gradually raise the temperature of a cold ingredient by slowly adding a hot liquid to prevent curdling or separation.",
    category: "technique",
    difficulty: "intermediate",
    relatedTerms: ["emulsify", "fold"],
  },
  {
    term: "brine",
    definition:
      "Soak food in a solution of salt and water (often with sugar and spices) to enhance moisture and flavor.",
    category: "technique",
    difficulty: "intermediate",
    relatedTerms: ["marinate", "cure"],
  },

  // Cuts
  {
    term: "julienne",
    definition:
      "Cut vegetables or other foods into thin, matchstick-sized strips, typically 1/8 inch by 1/8 inch by 2 inches.",
    category: "cut",
    difficulty: "intermediate",
    pronunciation: "joo-lee-EN",
    relatedTerms: ["chiffonade", "batonnet"],
  },
  {
    term: "dice",
    definition:
      "Cut food into small cubes of uniform size, typically 1/4 to 1/2 inch.",
    category: "cut",
    difficulty: "beginner",
    relatedTerms: ["cube", "mince"],
  },
  {
    term: "mince",
    definition: "Cut food into very small, fine pieces, smaller than a dice.",
    category: "cut",
    difficulty: "beginner",
    relatedTerms: ["dice", "chop"],
  },
  {
    term: "chiffonade",
    definition:
      "Stack leafy vegetables or herbs, roll them tightly, and slice into thin ribbons.",
    category: "cut",
    difficulty: "intermediate",
    pronunciation: "shif-oh-NAHD",
    relatedTerms: ["julienne", "shred"],
  },
  {
    term: "brunoise",
    definition:
      "Cut food into tiny, uniform cubes about 1/8 inch on each side, smaller than a dice.",
    category: "cut",
    difficulty: "advanced",
    pronunciation: "broo-NWAHZ",
    relatedTerms: ["dice", "mince"],
  },
  {
    term: "batonnet",
    definition:
      "Cut vegetables into stick shapes about 1/4 inch by 1/4 inch by 2-3 inches.",
    category: "cut",
    difficulty: "intermediate",
    pronunciation: "bah-toh-NAY",
    relatedTerms: ["julienne", "french fry cut"],
  },
  {
    term: "chop",
    definition: "Cut food into irregular pieces of roughly the same size.",
    category: "cut",
    difficulty: "beginner",
    relatedTerms: ["dice", "mince"],
  },
  {
    term: "cube",
    definition:
      "Cut food into uniform square pieces, typically 1/2 inch or larger.",
    category: "cut",
    difficulty: "beginner",
    relatedTerms: ["dice", "chop"],
  },
  {
    term: "slice",
    definition: "Cut food into flat, thin pieces of uniform thickness.",
    category: "cut",
    difficulty: "beginner",
    relatedTerms: ["julienne", "chop"],
  },
  {
    term: "score",
    definition:
      "Make shallow cuts in a crosshatch pattern on the surface of food to help it cook evenly or absorb marinades.",
    category: "cut",
    difficulty: "beginner",
    relatedTerms: ["slash", "mark"],
  },

  // Equipment
  {
    term: "mandoline",
    definition:
      "A kitchen tool with an adjustable blade for slicing vegetables and fruits into uniform, thin slices.",
    category: "equipment",
    difficulty: "intermediate",
    pronunciation: "MAN-doh-lin",
    relatedTerms: ["slicer", "grater"],
  },
  {
    term: "bain-marie",
    definition:
      "A water bath used for gentle cooking or keeping food warm, where a container is placed inside a larger pan of simmering water.",
    category: "equipment",
    difficulty: "intermediate",
    pronunciation: "ban-mah-REE",
    relatedTerms: ["double boiler", "water bath"],
  },
  {
    term: "ramekin",
    definition:
      "A small ceramic or glass dish used for baking and serving individual portions.",
    category: "equipment",
    difficulty: "beginner",
    pronunciation: "RAM-ih-kin",
    relatedTerms: ["soufflé dish", "custard cup"],
  },
  {
    term: "chinois",
    definition:
      "A fine-mesh conical strainer used to strain sauces, soups, and custards for a smooth texture.",
    category: "equipment",
    difficulty: "intermediate",
    pronunciation: "shin-WAH",
    relatedTerms: ["strainer", "sieve"],
  },
  {
    term: "dutch oven",
    definition:
      "A heavy, thick-walled cooking pot with a tight-fitting lid, ideal for braising and slow cooking.",
    category: "equipment",
    difficulty: "beginner",
    relatedTerms: ["casserole", "braiser"],
  },
  {
    term: "wok",
    definition:
      "A round-bottomed cooking pan originating from China, used especially for stir-frying.",
    category: "equipment",
    difficulty: "beginner",
    relatedTerms: ["skillet", "frying pan"],
  },
  {
    term: "immersion blender",
    definition:
      "A handheld blender that can be immersed directly into a pot or container to blend soups and sauces.",
    category: "equipment",
    difficulty: "beginner",
    relatedTerms: ["blender", "food processor"],
  },
  {
    term: "kitchen scale",
    definition:
      "A device used to measure the weight of ingredients for precise cooking and baking.",
    category: "equipment",
    difficulty: "beginner",
    relatedTerms: ["measuring cups", "measuring spoons"],
  },

  // Temperatures
  {
    term: "room temperature",
    definition:
      "Food brought to approximately 68-72°F (20-22°C) before cooking, often required for even cooking or proper emulsification.",
    category: "temperature",
    difficulty: "beginner",
    relatedTerms: ["temper", "rest"],
  },
  {
    term: "simmer",
    definition:
      "Heat liquid to 185-205°F (85-96°C) where small bubbles rise gently to the surface.",
    category: "temperature",
    difficulty: "beginner",
    relatedTerms: ["boil", "poach"],
  },
  {
    term: "rolling boil",
    definition:
      "Vigorous boiling at 212°F (100°C) with large, rapidly breaking bubbles that cannot be disrupted by stirring.",
    category: "temperature",
    difficulty: "beginner",
    relatedTerms: ["boil", "simmer"],
  },
  {
    term: "low heat",
    definition:
      "Cooking at temperatures around 200-300°F (93-149°C), ideal for gentle cooking and simmering.",
    category: "temperature",
    difficulty: "beginner",
    relatedTerms: ["simmer", "warm"],
  },
  {
    term: "medium heat",
    definition:
      "Cooking at temperatures around 300-400°F (149-204°C), suitable for most sautéing and pan-frying.",
    category: "temperature",
    difficulty: "beginner",
    relatedTerms: ["sauté", "pan-fry"],
  },
  {
    term: "high heat",
    definition:
      "Cooking at temperatures above 400°F (204°C), used for searing and stir-frying.",
    category: "temperature",
    difficulty: "beginner",
    relatedTerms: ["sear", "stir-fry"],
  },
  {
    term: "carry-over cooking",
    definition:
      "The continued cooking that occurs after food is removed from the heat source, as residual heat continues to raise the internal temperature.",
    category: "temperature",
    difficulty: "intermediate",
    relatedTerms: ["rest", "internal temperature"],
  },

  // Ingredients
  {
    term: "fond",
    definition:
      "The caramelized bits of food that stick to the bottom of a pan after cooking, used to add flavor to sauces.",
    category: "ingredient",
    difficulty: "intermediate",
    pronunciation: "FAHN",
    relatedTerms: ["deglaze", "pan sauce"],
  },
  {
    term: "zest",
    definition:
      "The colorful outer layer of citrus peel, containing flavorful oils, grated or cut into thin strips.",
    category: "ingredient",
    difficulty: "beginner",
    relatedTerms: ["citrus", "peel"],
  },
  {
    term: "bouquet garni",
    definition:
      "A bundle of herbs (typically thyme, parsley, and bay leaf) tied together or in cheesecloth, used to flavor soups and stews.",
    category: "ingredient",
    difficulty: "intermediate",
    pronunciation: "boo-KAY gar-NEE",
    relatedTerms: ["herbs", "sachet"],
  },
  {
    term: "mirepoix",
    definition:
      "A mixture of diced onions, carrots, and celery used as a flavor base for stocks, soups, and sauces.",
    category: "ingredient",
    difficulty: "intermediate",
    pronunciation: "meer-PWAH",
    relatedTerms: ["soffritto", "trinity"],
  },
  {
    term: "roux",
    definition:
      "A mixture of equal parts fat and flour cooked together, used to thicken sauces and soups.",
    category: "ingredient",
    difficulty: "intermediate",
    pronunciation: "ROO",
    relatedTerms: ["béchamel", "gravy"],
  },
  {
    term: "al dente",
    definition:
      "Pasta or vegetables cooked until just firm when bitten, with a slight resistance to the tooth.",
    category: "ingredient",
    difficulty: "beginner",
    pronunciation: "al-DEN-tay",
    relatedTerms: ["pasta", "tender"],
  },

  // Measurements
  {
    term: "pinch",
    definition:
      "A small amount of a dry ingredient that can be held between the thumb and forefinger, roughly 1/16 teaspoon.",
    category: "measurement",
    difficulty: "beginner",
    relatedTerms: ["dash", "sprinkle"],
  },
  {
    term: "dash",
    definition:
      "A small amount of liquid, typically 1/8 teaspoon or a few drops.",
    category: "measurement",
    difficulty: "beginner",
    relatedTerms: ["pinch", "splash"],
  },
  {
    term: "splash",
    definition:
      "A small but visible amount of liquid added quickly, roughly 1-2 tablespoons.",
    category: "measurement",
    difficulty: "beginner",
    relatedTerms: ["dash", "drizzle"],
  },
  {
    term: "drizzle",
    definition:
      "A thin stream of liquid poured slowly over food, typically oil, sauce, or dressing.",
    category: "measurement",
    difficulty: "beginner",
    relatedTerms: ["splash", "pour"],
  },
];

async function seedCookingTerms() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log("Seeding cooking terms...");

  try {
    for (const term of COOKING_TERMS_DATA) {
      await db.insert(cookingTerms).values(term).onConflictDoNothing();
    }

    console.log(
      `Successfully seeded ${COOKING_TERMS_DATA.length} cooking terms!`,
    );
  } catch (error) {
    console.error("Error seeding cooking terms:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedCookingTerms()
  .then(() => {
    console.log("Seed complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
