// Comprehensive library of kitchen equipment organized into 8 categories

export type ApplianceLibraryItem = {
  name: string;
  category: 'cooking' | 'cookware' | 'bakeware' | 'utensil' | 'prep' | 'small' | 'refrigeration' | 'appliance';
  subcategory?: string;
  description?: string;
  capabilities?: string[];
  sizeOrCapacity?: string;
  material?: string;
  isCommon: boolean;
  searchTerms?: string[];
};

export const applianceLibraryData: ApplianceLibraryItem[] = [
  // === COOKING (Major cooking appliances) ===
  {
    name: "Oven",
    category: "cooking",
    subcategory: "major",
    description: "Standard kitchen oven for baking and roasting",
    capabilities: ["bake", "roast", "broil"],
    isCommon: true,
    searchTerms: ["stove oven", "range oven"]
  },
  {
    name: "Stovetop/Range",
    category: "cooking",
    subcategory: "major",
    description: "Cooktop with burners for stovetop cooking",
    capabilities: ["boil", "simmer", "sauté", "fry"],
    isCommon: true,
    searchTerms: ["cooktop", "range", "burners", "hob"]
  },
  {
    name: "Microwave",
    category: "cooking",
    subcategory: "countertop",
    description: "Microwave oven for quick heating and cooking",
    capabilities: ["reheat", "defrost", "steam"],
    isCommon: true,
    searchTerms: ["microwave oven"]
  },
  {
    name: "Toaster Oven",
    category: "cooking",
    subcategory: "countertop",
    description: "Small oven for toasting and light baking",
    capabilities: ["toast", "bake", "broil", "reheat"],
    isCommon: true,
    searchTerms: ["convection oven", "countertop oven"]
  },
  {
    name: "Air Fryer",
    category: "cooking",
    subcategory: "countertop",
    description: "Convection appliance for crispy cooking with less oil",
    capabilities: ["air fry", "bake", "roast", "reheat"],
    isCommon: true,
    searchTerms: ["airfryer"]
  },
  {
    name: "Instant Pot",
    category: "cooking",
    subcategory: "countertop",
    description: "Electric pressure cooker with multiple functions",
    capabilities: ["pressure cook", "slow cook", "sauté", "steam", "rice"],
    isCommon: true,
    searchTerms: ["pressure cooker", "multi-cooker"]
  },
  {
    name: "Slow Cooker",
    category: "cooking",
    subcategory: "countertop",
    description: "For slow-cooking stews, soups, and roasts",
    capabilities: ["slow cook", "keep warm"],
    isCommon: true,
    searchTerms: ["crock pot", "crockpot"]
  },
  {
    name: "Grill",
    category: "cooking",
    subcategory: "outdoor",
    description: "Outdoor or indoor grill for grilling",
    capabilities: ["grill", "barbecue"],
    isCommon: true,
    searchTerms: ["barbecue", "bbq", "gas grill", "charcoal grill"]
  },
  {
    name: "Griddle",
    category: "cooking",
    subcategory: "countertop",
    description: "Flat cooking surface for pancakes, eggs, etc.",
    capabilities: ["griddle", "fry"],
    isCommon: false,
    searchTerms: ["flat top", "electric griddle"]
  },

  // === COOKWARE (Pots and pans) ===
  {
    name: "Frying Pan",
    category: "cookware",
    subcategory: "pans",
    description: "Shallow pan for frying and sautéing",
    sizeOrCapacity: "8-12 inch",
    material: "various",
    isCommon: true,
    searchTerms: ["skillet", "fry pan", "saute pan"]
  },
  {
    name: "Saucepan",
    category: "cookware",
    subcategory: "pots",
    description: "Deep pan with lid for sauces and liquids",
    sizeOrCapacity: "1-4 qt",
    material: "various",
    isCommon: true,
    searchTerms: ["sauce pot", "small pot"]
  },
  {
    name: "Stock Pot",
    category: "cookware",
    subcategory: "pots",
    description: "Large pot for soups, stocks, and pasta",
    sizeOrCapacity: "6-12 qt",
    material: "various",
    isCommon: true,
    searchTerms: ["soup pot", "large pot"]
  },
  {
    name: "Dutch Oven",
    category: "cookware",
    subcategory: "pots",
    description: "Heavy pot with lid for braising and stews",
    sizeOrCapacity: "4-7 qt",
    material: "cast iron or enameled",
    isCommon: true,
    searchTerms: ["braiser", "casserole"]
  },
  {
    name: "Cast Iron Skillet",
    category: "cookware",
    subcategory: "pans",
    description: "Heavy iron pan for high heat cooking and searing",
    sizeOrCapacity: "10-12 inch",
    material: "cast iron",
    isCommon: true,
    searchTerms: ["cast iron pan"]
  },
  {
    name: "Wok",
    category: "cookware",
    subcategory: "pans",
    description: "Round-bottomed pan for stir-frying",
    sizeOrCapacity: "12-14 inch",
    material: "carbon steel or cast iron",
    isCommon: false,
    searchTerms: ["stir fry pan"]
  },
  {
    name: "Grill Pan",
    category: "cookware",
    subcategory: "pans",
    description: "Ridged pan for indoor grilling",
    sizeOrCapacity: "10-12 inch",
    material: "cast iron or non-stick",
    isCommon: false,
    searchTerms: ["griddle pan"]
  },
  {
    name: "Steamer Basket",
    category: "cookware",
    subcategory: "steamers",
    description: "Insert or basket for steaming vegetables",
    isCommon: false,
    searchTerms: ["steam basket", "bamboo steamer"]
  },
  {
    name: "Double Boiler",
    category: "cookware",
    subcategory: "specialty",
    description: "Two-part pot for gentle heating and melting",
    isCommon: false,
    searchTerms: ["bain marie"]
  },

  // === BAKEWARE (Baking pans and dishes) ===
  {
    name: "Baking Sheet",
    category: "bakeware",
    subcategory: "sheets",
    description: "Flat metal sheet for cookies and roasting",
    sizeOrCapacity: "half or full sheet",
    material: "aluminum or steel",
    isCommon: true,
    searchTerms: ["cookie sheet", "sheet pan"]
  },
  {
    name: "Cake Pan",
    category: "bakeware",
    subcategory: "pans",
    description: "Round or square pan for layer cakes",
    sizeOrCapacity: "8-9 inch",
    material: "aluminum or non-stick",
    isCommon: true,
    searchTerms: ["round pan", "square pan"]
  },
  {
    name: "Loaf Pan",
    category: "bakeware",
    subcategory: "pans",
    description: "Rectangular pan for bread and meatloaf",
    sizeOrCapacity: "9x5 inch",
    material: "aluminum or glass",
    isCommon: true,
    searchTerms: ["bread pan"]
  },
  {
    name: "Muffin Tin",
    category: "bakeware",
    subcategory: "pans",
    description: "Pan with cups for muffins and cupcakes",
    sizeOrCapacity: "12 cups",
    material: "aluminum or non-stick",
    isCommon: true,
    searchTerms: ["cupcake pan", "muffin pan"]
  },
  {
    name: "Pie Pan",
    category: "bakeware",
    subcategory: "pans",
    description: "Shallow round pan for pies and quiches",
    sizeOrCapacity: "9 inch",
    material: "glass or ceramic",
    isCommon: true,
    searchTerms: ["pie plate", "pie dish"]
  },
  {
    name: "Casserole Dish",
    category: "bakeware",
    subcategory: "dishes",
    description: "Deep baking dish for casseroles and lasagna",
    sizeOrCapacity: "9x13 inch",
    material: "glass or ceramic",
    isCommon: true,
    searchTerms: ["baking dish", "lasagna pan"]
  },
  {
    name: "Springform Pan",
    category: "bakeware",
    subcategory: "pans",
    description: "Pan with removable sides for cheesecakes",
    sizeOrCapacity: "9 inch",
    material: "aluminum",
    isCommon: false,
    searchTerms: ["cheesecake pan"]
  },
  {
    name: "Bundt Pan",
    category: "bakeware",
    subcategory: "pans",
    description: "Decorative ring-shaped cake pan",
    sizeOrCapacity: "10-12 cup",
    material: "aluminum or non-stick",
    isCommon: false,
    searchTerms: ["ring pan", "tube pan"]
  },
  {
    name: "Cooling Rack",
    category: "bakeware",
    subcategory: "accessories",
    description: "Wire rack for cooling baked goods",
    isCommon: true,
    searchTerms: ["wire rack"]
  },
  {
    name: "Pizza Stone",
    category: "bakeware",
    subcategory: "specialty",
    description: "Stone or ceramic for crispy pizza crusts",
    material: "stone or ceramic",
    isCommon: false,
    searchTerms: ["baking stone", "pizza steel"]
  },
  {
    name: "Ramekins",
    category: "bakeware",
    subcategory: "dishes",
    description: "Small individual baking dishes for soufflés",
    sizeOrCapacity: "4-6 oz",
    material: "ceramic",
    isCommon: false,
    searchTerms: ["souffle cups"]
  },

  // === UTENSILS (Hand tools and kitchen gadgets) ===
  {
    name: "Chef's Knife",
    category: "utensil",
    subcategory: "knives",
    description: "Large multipurpose kitchen knife",
    sizeOrCapacity: "8-10 inch",
    isCommon: true,
    searchTerms: ["kitchen knife", "cook's knife"]
  },
  {
    name: "Paring Knife",
    category: "utensil",
    subcategory: "knives",
    description: "Small knife for detail work and peeling",
    sizeOrCapacity: "3-4 inch",
    isCommon: true,
    searchTerms: ["small knife"]
  },
  {
    name: "Cutting Board",
    category: "utensil",
    subcategory: "prep",
    description: "Surface for cutting and chopping",
    material: "wood or plastic",
    isCommon: true,
    searchTerms: ["chopping board"]
  },
  {
    name: "Mixing Bowls",
    category: "utensil",
    subcategory: "bowls",
    description: "Set of bowls for mixing ingredients",
    material: "stainless steel or glass",
    isCommon: true,
    searchTerms: ["prep bowls"]
  },
  {
    name: "Measuring Cups",
    category: "utensil",
    subcategory: "measuring",
    description: "Cups for measuring dry ingredients",
    isCommon: true,
    searchTerms: ["dry measuring cups"]
  },
  {
    name: "Measuring Spoons",
    category: "utensil",
    subcategory: "measuring",
    description: "Spoons for measuring small amounts",
    isCommon: true,
    searchTerms: ["measuring set"]
  },
  {
    name: "Liquid Measuring Cup",
    category: "utensil",
    subcategory: "measuring",
    description: "Cup with spout for measuring liquids",
    sizeOrCapacity: "1-4 cups",
    material: "glass or plastic",
    isCommon: true,
    searchTerms: ["pyrex cup"]
  },
  {
    name: "Wooden Spoon",
    category: "utensil",
    subcategory: "spoons",
    description: "Spoon for stirring and mixing",
    material: "wood",
    isCommon: true,
    searchTerms: ["mixing spoon"]
  },
  {
    name: "Spatula",
    category: "utensil",
    subcategory: "spatulas",
    description: "Tool for flipping and turning",
    material: "silicone or metal",
    isCommon: true,
    searchTerms: ["turner", "flipper"]
  },
  {
    name: "Rubber Spatula",
    category: "utensil",
    subcategory: "spatulas",
    description: "Flexible scraper for mixing and folding",
    material: "silicone",
    isCommon: true,
    searchTerms: ["scraper", "silicone spatula"]
  },
  {
    name: "Whisk",
    category: "utensil",
    subcategory: "whisks",
    description: "Wire tool for whipping and mixing",
    isCommon: true,
    searchTerms: ["wire whisk", "balloon whisk"]
  },
  {
    name: "Tongs",
    category: "utensil",
    subcategory: "grippers",
    description: "Tool for gripping and turning food",
    material: "stainless steel or silicone",
    isCommon: true,
    searchTerms: ["kitchen tongs"]
  },
  {
    name: "Ladle",
    category: "utensil",
    subcategory: "spoons",
    description: "Large spoon for serving soups and sauces",
    isCommon: true,
    searchTerms: ["soup ladle"]
  },
  {
    name: "Can Opener",
    category: "utensil",
    subcategory: "openers",
    description: "Tool for opening cans",
    isCommon: true,
    searchTerms: ["tin opener"]
  },
  {
    name: "Vegetable Peeler",
    category: "utensil",
    subcategory: "peelers",
    description: "Tool for peeling vegetables and fruits",
    isCommon: true,
    searchTerms: ["potato peeler", "peeler"]
  },
  {
    name: "Grater",
    category: "utensil",
    subcategory: "graters",
    description: "Tool for grating cheese and vegetables",
    isCommon: true,
    searchTerms: ["box grater", "cheese grater"]
  },
  {
    name: "Colander",
    category: "utensil",
    subcategory: "strainers",
    description: "Bowl with holes for draining pasta",
    isCommon: true,
    searchTerms: ["strainer", "pasta strainer"]
  },
  {
    name: "Fine Mesh Strainer",
    category: "utensil",
    subcategory: "strainers",
    description: "Fine strainer for sifting and straining",
    isCommon: false,
    searchTerms: ["sieve", "sifter"]
  },
  {
    name: "Rolling Pin",
    category: "utensil",
    subcategory: "baking tools",
    description: "Tool for rolling out dough",
    material: "wood or marble",
    isCommon: true,
    searchTerms: ["dough roller"]
  },
  {
    name: "Pastry Brush",
    category: "utensil",
    subcategory: "brushes",
    description: "Brush for applying glazes and butter",
    isCommon: false,
    searchTerms: ["basting brush"]
  },
  {
    name: "Kitchen Shears",
    category: "utensil",
    subcategory: "scissors",
    description: "Heavy-duty scissors for kitchen use",
    isCommon: true,
    searchTerms: ["kitchen scissors"]
  },
  {
    name: "Meat Thermometer",
    category: "utensil",
    subcategory: "thermometers",
    description: "Thermometer for checking meat doneness",
    isCommon: true,
    searchTerms: ["instant-read thermometer", "probe thermometer"]
  },
  {
    name: "Kitchen Scale",
    category: "utensil",
    subcategory: "measuring",
    description: "Scale for precise ingredient weighing",
    isCommon: false,
    searchTerms: ["food scale", "digital scale"]
  },
  {
    name: "Mortar and Pestle",
    category: "utensil",
    subcategory: "grinders",
    description: "Tool for grinding spices and herbs",
    material: "stone or marble",
    isCommon: false,
    searchTerms: ["spice grinder"]
  },
  {
    name: "Potato Masher",
    category: "utensil",
    subcategory: "mashers",
    description: "Tool for mashing potatoes and vegetables",
    isCommon: true,
    searchTerms: ["masher"]
  },
  {
    name: "Garlic Press",
    category: "utensil",
    subcategory: "presses",
    description: "Tool for crushing garlic cloves",
    isCommon: false,
    searchTerms: ["garlic crusher"]
  },
  {
    name: "Zester",
    category: "utensil",
    subcategory: "graters",
    description: "Tool for zesting citrus fruits",
    isCommon: false,
    searchTerms: ["microplane", "citrus zester"]
  },
  {
    name: "Pizza Cutter",
    category: "utensil",
    subcategory: "cutters",
    description: "Wheel for cutting pizza slices",
    isCommon: false,
    searchTerms: ["pizza wheel"]
  },
  {
    name: "Ice Cream Scoop",
    category: "utensil",
    subcategory: "scoops",
    description: "Scoop for serving ice cream",
    isCommon: false,
    searchTerms: ["cookie scoop"]
  },
  {
    name: "Baster",
    category: "utensil",
    subcategory: "basters",
    description: "Tool for basting meats with juices",
    isCommon: false,
    searchTerms: ["turkey baster"]
  },

  // === PREP EQUIPMENT (Food preparation appliances) ===
  {
    name: "Food Processor",
    category: "prep",
    subcategory: "processors",
    description: "Multi-purpose food preparation appliance",
    capabilities: ["chop", "slice", "shred", "puree", "knead"],
    isCommon: true,
    searchTerms: ["cuisinart", "processor"]
  },
  {
    name: "Blender",
    category: "prep",
    subcategory: "blenders",
    description: "Electric blending appliance for smoothies",
    capabilities: ["blend", "puree", "crush ice"],
    isCommon: true,
    searchTerms: ["mixer", "vitamix", "ninja"]
  },
  {
    name: "Stand Mixer",
    category: "prep",
    subcategory: "mixers",
    description: "Heavy-duty electric mixer with bowl",
    capabilities: ["mix", "knead", "whip", "beat"],
    isCommon: true,
    searchTerms: ["kitchen aid", "kitchenaid", "mixer"]
  },
  {
    name: "Hand Mixer",
    category: "prep",
    subcategory: "mixers",
    description: "Portable handheld electric mixer",
    capabilities: ["mix", "whip", "beat"],
    isCommon: true,
    searchTerms: ["electric mixer", "beater"]
  },
  {
    name: "Immersion Blender",
    category: "prep",
    subcategory: "blenders",
    description: "Handheld stick blender for soups",
    capabilities: ["blend", "puree"],
    isCommon: true,
    searchTerms: ["stick blender", "hand blender"]
  },
  {
    name: "Knife Set",
    category: "prep",
    subcategory: "knives",
    description: "Complete set of kitchen knives",
    isCommon: true,
    searchTerms: ["knife block", "cutlery set"]
  },
  {
    name: "Cutting Boards",
    category: "prep",
    subcategory: "surfaces",
    description: "Set of cutting boards for food prep",
    material: "wood or plastic",
    isCommon: true,
    searchTerms: ["chopping boards"]
  },
  {
    name: "Mandoline",
    category: "prep",
    subcategory: "slicers",
    description: "Tool for uniform vegetable slicing",
    isCommon: false,
    searchTerms: ["mandolin slicer"]
  },

  // === SMALL APPLIANCES (Countertop convenience appliances) ===
  {
    name: "Toaster",
    category: "small",
    subcategory: "countertop",
    description: "Electric toaster for bread",
    capabilities: ["toast", "warm"],
    isCommon: true,
    searchTerms: ["bread toaster", "pop-up toaster"]
  },
  {
    name: "Coffee Maker",
    category: "small",
    subcategory: "beverage",
    description: "Drip coffee brewing machine",
    capabilities: ["brew coffee"],
    isCommon: true,
    searchTerms: ["coffee machine", "drip coffee"]
  },
  {
    name: "Electric Kettle",
    category: "small",
    subcategory: "beverage",
    description: "Electric water boiler for tea",
    capabilities: ["boil water"],
    isCommon: true,
    searchTerms: ["water kettle", "tea kettle"]
  },
  {
    name: "Espresso Machine",
    category: "small",
    subcategory: "beverage",
    description: "Machine for making espresso drinks",
    capabilities: ["brew espresso", "steam milk"],
    isCommon: false,
    searchTerms: ["coffee machine", "latte maker"]
  },
  {
    name: "Rice Cooker",
    category: "small",
    subcategory: "cookers",
    description: "Automatic rice cooking appliance",
    capabilities: ["cook rice", "steam", "keep warm"],
    isCommon: true,
    searchTerms: ["rice maker"]
  },
  {
    name: "Waffle Maker",
    category: "small",
    subcategory: "breakfast",
    description: "Electric waffle iron",
    capabilities: ["make waffles"],
    isCommon: false,
    searchTerms: ["waffle iron"]
  },
  {
    name: "Bread Maker",
    category: "small",
    subcategory: "baking",
    description: "Automatic bread baking machine",
    capabilities: ["knead", "rise", "bake bread"],
    isCommon: false,
    searchTerms: ["bread machine"]
  },
  {
    name: "Juicer",
    category: "small",
    subcategory: "beverage",
    description: "Appliance for extracting juice",
    capabilities: ["juice fruits", "juice vegetables"],
    isCommon: false,
    searchTerms: ["juice extractor"]
  },
  {
    name: "Sous Vide",
    category: "small",
    subcategory: "cookers",
    description: "Precision water bath cooker",
    capabilities: ["sous vide cooking"],
    isCommon: false,
    searchTerms: ["immersion circulator"]
  },

  // === REFRIGERATION (Cold storage appliances) ===
  {
    name: "Refrigerator",
    category: "refrigeration",
    subcategory: "major",
    description: "Main kitchen refrigerator",
    isCommon: true,
    searchTerms: ["fridge"]
  },
  {
    name: "Freezer",
    category: "refrigeration",
    subcategory: "major",
    description: "Standalone or built-in freezer",
    isCommon: true,
    searchTerms: ["deep freezer", "chest freezer"]
  },
  {
    name: "Mini Fridge",
    category: "refrigeration",
    subcategory: "compact",
    description: "Small compact refrigerator",
    isCommon: false,
    searchTerms: ["compact fridge", "dorm fridge"]
  },
  {
    name: "Wine Cooler",
    category: "refrigeration",
    subcategory: "specialty",
    description: "Temperature-controlled wine storage",
    isCommon: false,
    searchTerms: ["wine fridge", "wine refrigerator"]
  },

  // === OTHER APPLIANCES (Specialty and less common) ===
  {
    name: "Indoor Grill",
    category: "appliance",
    subcategory: "countertop",
    description: "Electric indoor grilling appliance",
    capabilities: ["grill", "sear"],
    isCommon: false,
    searchTerms: ["george foreman", "panini press", "electric grill"]
  },
  {
    name: "Stovetop",
    category: "appliance",
    subcategory: "specialty",
    description: "Portable or additional stovetop burner",
    capabilities: ["boil", "simmer", "sauté"],
    isCommon: false,
    searchTerms: ["hot plate", "induction burner"]
  }
];
