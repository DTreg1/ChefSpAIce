import { Router, Request, Response } from "express";
import { normalizeUnitForInstacart, convert, getUnitType } from "../../lib/unit-conversion";

const router = Router();

interface Measurement {
  quantity: number;
  unit: string;
}

function getAlternateMeasurements(quantity: number, unit: string | undefined): Measurement[] {
  if (!unit || !quantity) return [];
  
  const instacartUnit = normalizeUnitForInstacart(unit);
  if (!instacartUnit) return [];
  
  const measurements: Measurement[] = [{ quantity, unit: instacartUnit }];
  const unitType = getUnitType(unit);
  
  if (unitType === "weight") {
    if (["oz", "lb"].includes(instacartUnit)) {
      const grams = convert(quantity, unit, "g");
      if (grams && grams >= 1) {
        measurements.push({ quantity: Math.round(grams), unit: "g" });
      }
    } else if (["g", "kg"].includes(instacartUnit)) {
      const oz = convert(quantity, unit, "oz");
      if (oz && oz >= 0.1) {
        measurements.push({ quantity: Math.round(oz * 10) / 10, unit: "oz" });
      }
    }
  } else if (unitType === "volume") {
    if (["fl oz", "cup", "tbsp", "tsp", "pt", "qt", "gal"].includes(instacartUnit)) {
      const ml = convert(quantity, unit, "ml");
      if (ml && ml >= 1) {
        measurements.push({ quantity: Math.round(ml), unit: "ml" });
      }
    } else if (["ml", "l"].includes(instacartUnit)) {
      const floz = convert(quantity, unit, "fl oz");
      if (floz && floz >= 0.1) {
        measurements.push({ quantity: Math.round(floz * 10) / 10, unit: "fl oz" });
      }
    }
  }
  
  return measurements;
}

const INSTACART_BASE_URL = process.env.NODE_ENV === "production" 
  ? "https://connect.instacart.com"
  : "https://connect.instacart.com";

const INSTACART_API_CONFIGURED = !!process.env.INSTACART_API_KEY;

interface ItemFilters {
  brand_filters?: string[];
  health_filters?: string[];
}

interface LineItem {
  name: string;
  quantity?: number;
  unit?: string;
  display_text?: string;
  product_ids?: number[];
  upcs?: string[];
  filters?: ItemFilters;
}

interface CreateShoppingListRequest {
  title: string;
  items: LineItem[];
  imageUrl?: string;
  partnerLinkbackUrl?: string;
}

interface CreateRecipeListRequest {
  title: string;
  ingredients: LineItem[];
  instructions?: string[];
  imageUrl?: string;
  partnerLinkbackUrl?: string;
  author?: string;
  source_url?: string;
}

interface InstacartApiResponse {
  products_link_url?: string;
  recipe_link_url?: string;
  error?: string;
}

router.get("/status", (_req: Request, res: Response) => {
  res.json({
    configured: INSTACART_API_CONFIGURED,
    message: INSTACART_API_CONFIGURED 
      ? "Instacart API is configured and ready"
      : "Instacart API key not configured. Please set INSTACART_API_KEY environment variable.",
  });
});

router.post("/create-shopping-list", async (req: Request, res: Response) => {
  const { title, items, imageUrl, partnerLinkbackUrl } = req.body as CreateShoppingListRequest;

  if (!INSTACART_API_CONFIGURED) {
    return res.status(503).json({
      error: "Instacart API not configured",
      message: "Please configure the Instacart API key to create shopping lists.",
    });
  }

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "At least one item is required" });
  }

  try {
    const result = await createInstacartShoppingList(title, items, imageUrl, partnerLinkbackUrl);
    res.json(result);
  } catch (error: any) {
    console.error("Instacart shopping list creation error:", error);
    res.status(500).json({ 
      error: "Failed to create shopping list",
      message: error.message || "Unknown error occurred"
    });
  }
});

router.post("/create-recipe", async (req: Request, res: Response) => {
  const { title, ingredients, instructions, imageUrl, partnerLinkbackUrl, author, source_url } = req.body as CreateRecipeListRequest;

  if (!INSTACART_API_CONFIGURED) {
    return res.status(503).json({
      error: "Instacart API not configured",
      message: "Please configure the Instacart API key to create recipe lists.",
    });
  }

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: "At least one ingredient is required" });
  }

  try {
    const result = await createInstacartRecipe(
      title, 
      ingredients, 
      instructions, 
      imageUrl, 
      partnerLinkbackUrl,
      author,
      source_url
    );
    res.json(result);
  } catch (error: any) {
    console.error("Instacart recipe creation error:", error);
    res.status(500).json({ 
      error: "Failed to create recipe list",
      message: error.message || "Unknown error occurred"
    });
  }
});

router.get("/retailers", async (_req: Request, res: Response) => {
  const retailers = [
    { id: "heb", name: "H-E-B", logo: "heb" },
    { id: "randalls", name: "Randall's", logo: "randalls" },
    { id: "kroger", name: "Kroger", logo: "kroger" },
    { id: "walmart", name: "Walmart", logo: "walmart" },
    { id: "target", name: "Target", logo: "target" },
    { id: "costco", name: "Costco", logo: "costco" },
    { id: "safeway", name: "Safeway", logo: "safeway" },
    { id: "albertsons", name: "Albertsons", logo: "albertsons" },
    { id: "publix", name: "Publix", logo: "publix" },
    { id: "sprouts", name: "Sprouts", logo: "sprouts" },
    { id: "whole-foods", name: "Whole Foods", logo: "whole-foods" },
    { id: "aldi", name: "ALDI", logo: "aldi" },
  ];
  
  res.json({ retailers });
});

async function createInstacartShoppingList(
  title: string,
  items: LineItem[],
  imageUrl?: string,
  partnerLinkbackUrl?: string
): Promise<{ shoppingListUrl: string; success: boolean }> {
  const apiKey = process.env.INSTACART_API_KEY;
  if (!apiKey) {
    throw new Error("Instacart API key not configured");
  }

  const lineItems = items.map(item => {
    const measurements = getAlternateMeasurements(item.quantity || 0, item.unit);
    
    const baseItem: Record<string, any> = {
      name: item.name,
      ...(item.display_text && { display_text: item.display_text }),
      ...(item.product_ids && item.product_ids.length > 0 && { product_ids: item.product_ids }),
      ...(item.upcs && item.upcs.length > 0 && { upcs: item.upcs }),
      ...(item.filters && { filters: item.filters }),
    };
    
    if (measurements.length > 0) {
      return {
        ...baseItem,
        line_item_measurements: measurements,
      };
    }
    
    const instacartUnit = normalizeUnitForInstacart(item.unit);
    return {
      ...baseItem,
      ...(item.quantity && { quantity: item.quantity }),
      ...(instacartUnit && { unit: instacartUnit }),
    };
  });

  const requestBody: Record<string, any> = {
    title,
    line_items: lineItems,
    landing_page_configuration: {
      enable_pantry_items: true,
      ...(partnerLinkbackUrl && { partner_linkback_url: partnerLinkbackUrl }),
    },
  };

  if (imageUrl) {
    requestBody.image_url = imageUrl;
  }

  console.log(`[Instacart] Creating shopping list: "${title}" with ${items.length} items`);

  const response = await fetch(`${INSTACART_BASE_URL}/idp/v1/products/products_link`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Instacart] API error (${response.status}):`, errorText);
    
    if (response.status === 401) {
      throw new Error("Invalid Instacart API key");
    } else if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    } else {
      throw new Error(`Instacart API error: ${response.status}`);
    }
  }

  const data: InstacartApiResponse = await response.json();
  
  if (!data.products_link_url) {
    throw new Error("No shopping list URL returned from Instacart");
  }

  console.log(`[Instacart] Shopping list created: ${data.products_link_url}`);

  return {
    shoppingListUrl: data.products_link_url,
    success: true,
  };
}

async function createInstacartRecipe(
  title: string,
  ingredients: LineItem[],
  instructions?: string[],
  imageUrl?: string,
  partnerLinkbackUrl?: string,
  author?: string,
  sourceUrl?: string
): Promise<{ recipeUrl: string; success: boolean }> {
  const apiKey = process.env.INSTACART_API_KEY;
  if (!apiKey) {
    throw new Error("Instacart API key not configured");
  }

  const lineItems = ingredients.map(item => {
    const measurements = getAlternateMeasurements(item.quantity || 0, item.unit);
    
    const baseItem: Record<string, any> = {
      name: item.name,
      ...(item.display_text && { display_text: item.display_text }),
      ...(item.product_ids && item.product_ids.length > 0 && { product_ids: item.product_ids }),
      ...(item.upcs && item.upcs.length > 0 && { upcs: item.upcs }),
      ...(item.filters && { filters: item.filters }),
    };
    
    if (measurements.length > 0) {
      return {
        ...baseItem,
        line_item_measurements: measurements,
      };
    }
    
    const instacartUnit = normalizeUnitForInstacart(item.unit);
    return {
      ...baseItem,
      ...(item.quantity && { quantity: item.quantity }),
      ...(instacartUnit && { unit: instacartUnit }),
    };
  });

  const requestBody: Record<string, any> = {
    title,
    line_items: lineItems,
    landing_page_configuration: {
      enable_pantry_items: true,
      ...(partnerLinkbackUrl && { partner_linkback_url: partnerLinkbackUrl }),
    },
  };

  if (imageUrl) {
    requestBody.image_url = imageUrl;
  }

  if (instructions && instructions.length > 0) {
    requestBody.instructions = instructions;
  }

  if (author) {
    requestBody.author = author;
  }

  if (sourceUrl) {
    requestBody.source_url = sourceUrl;
  }

  console.log(`[Instacart] Creating recipe: "${title}" with ${ingredients.length} ingredients`);

  const response = await fetch(`${INSTACART_BASE_URL}/idp/v1/products/recipe`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Instacart] API error (${response.status}):`, errorText);
    
    if (response.status === 401) {
      throw new Error("Invalid Instacart API key");
    } else if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    } else {
      throw new Error(`Instacart API error: ${response.status}`);
    }
  }

  const data = await response.json();
  
  const recipeUrl = data.recipe_link_url || data.products_link_url;
  if (!recipeUrl) {
    throw new Error("No recipe URL returned from Instacart");
  }

  console.log(`[Instacart] Recipe created: ${recipeUrl}`);

  return {
    recipeUrl,
    success: true,
  };
}

export default router;
