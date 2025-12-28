import { Router, Request, Response } from "express";

const router = Router();

interface InstacartProductSearchRequest {
  query: string;
  zipCode?: string;
  retailerId?: string;
}

interface InstacartProduct {
  id: string;
  name: string;
  brand?: string;
  price: number;
  unit: string;
  imageUrl?: string;
  retailer: string;
  available: boolean;
}

interface InstacartCartItem {
  name: string;
  quantity: number;
  unit: string;
  productId?: string;
}

interface InstacartCartRequest {
  items: InstacartCartItem[];
  retailerId: string;
  zipCode: string;
}

const INSTACART_API_CONFIGURED = !!process.env.INSTACART_API_KEY;

router.get("/status", (_req: Request, res: Response) => {
  res.json({
    configured: INSTACART_API_CONFIGURED,
    message: INSTACART_API_CONFIGURED 
      ? "Instacart API is configured and ready"
      : "Instacart API key not configured. Please set INSTACART_API_KEY environment variable.",
  });
});

router.post("/search", async (req: Request, res: Response) => {
  const { query, zipCode, retailerId } = req.body as InstacartProductSearchRequest;

  if (!INSTACART_API_CONFIGURED) {
    return res.status(503).json({
      error: "Instacart API not configured",
      message: "Please configure the Instacart API key to use product search.",
    });
  }

  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    const products = await searchInstacartProducts(query, zipCode, retailerId);
    res.json({ products });
  } catch (error) {
    console.error("Instacart search error:", error);
    res.status(500).json({ error: "Failed to search products" });
  }
});

router.post("/create-cart", async (req: Request, res: Response) => {
  const { items, retailerId, zipCode } = req.body as InstacartCartRequest;

  if (!INSTACART_API_CONFIGURED) {
    return res.status(503).json({
      error: "Instacart API not configured",
      message: "Please configure the Instacart API key to create carts.",
    });
  }

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Items are required" });
  }

  if (!retailerId || !zipCode) {
    return res.status(400).json({ error: "Retailer ID and zip code are required" });
  }

  try {
    const cartUrl = await createInstacartCart(items, retailerId, zipCode);
    res.json({ cartUrl, success: true });
  } catch (error) {
    console.error("Instacart cart creation error:", error);
    res.status(500).json({ error: "Failed to create cart" });
  }
});

router.get("/retailers", async (req: Request, res: Response) => {
  const { zipCode } = req.query;

  if (!INSTACART_API_CONFIGURED) {
    return res.status(503).json({
      error: "Instacart API not configured",
      message: "Please configure the Instacart API key to get retailers.",
    });
  }

  try {
    const retailers = await getInstacartRetailers(zipCode as string | undefined);
    res.json({ retailers });
  } catch (error) {
    console.error("Instacart retailers error:", error);
    res.status(500).json({ error: "Failed to get retailers" });
  }
});

router.post("/match-items", async (req: Request, res: Response) => {
  const { items, zipCode, retailerId } = req.body;

  if (!INSTACART_API_CONFIGURED) {
    return res.status(503).json({
      error: "Instacart API not configured",
      message: "Please configure the Instacart API key to match items.",
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items array is required" });
  }

  try {
    const matchedItems = await matchShoppingListItems(items, zipCode, retailerId);
    res.json({ matchedItems });
  } catch (error) {
    console.error("Instacart match items error:", error);
    res.status(500).json({ error: "Failed to match items" });
  }
});

async function searchInstacartProducts(
  query: string,
  zipCode?: string,
  retailerId?: string
): Promise<InstacartProduct[]> {
  const apiKey = process.env.INSTACART_API_KEY;
  if (!apiKey) {
    throw new Error("Instacart API key not configured");
  }

  console.log(`[Instacart] Searching for: ${query}, zip: ${zipCode}, retailer: ${retailerId}`);
  return [];
}

async function createInstacartCart(
  items: InstacartCartItem[],
  retailerId: string,
  zipCode: string
): Promise<string> {
  const apiKey = process.env.INSTACART_API_KEY;
  if (!apiKey) {
    throw new Error("Instacart API key not configured");
  }

  const itemNames = items.map(i => encodeURIComponent(i.name)).join(",");
  console.log(`[Instacart] Creating cart with ${items.length} items for retailer ${retailerId}: ${items.map(i => i.name).join(", ")}`);
  return `https://www.instacart.com/store/${retailerId}/storefront?search_term=${itemNames}`;
}

async function getInstacartRetailers(zipCode?: string): Promise<Array<{ id: string; name: string }>> {
  const apiKey = process.env.INSTACART_API_KEY;
  if (!apiKey) {
    throw new Error("Instacart API key not configured");
  }

  console.log(`[Instacart] Getting retailers for zip: ${zipCode}`);
  return [
    { id: "heb", name: "H-E-B" },
    { id: "randalls", name: "Randall's" },
    { id: "kroger", name: "Kroger" },
    { id: "walmart", name: "Walmart" },
    { id: "target", name: "Target" },
    { id: "costco", name: "Costco" },
  ];
}

interface ShoppingItem {
  name: string;
  quantity: number;
  unit: string;
}

interface MatchedItem {
  originalItem: ShoppingItem;
  matchedProduct?: InstacartProduct;
  confidence: "high" | "medium" | "low" | "no_match";
}

async function matchShoppingListItems(
  items: ShoppingItem[],
  zipCode?: string,
  retailerId?: string
): Promise<MatchedItem[]> {
  const matchedItems: MatchedItem[] = [];

  for (const item of items) {
    const products = await searchInstacartProducts(item.name, zipCode, retailerId);
    
    if (products.length > 0) {
      matchedItems.push({
        originalItem: item,
        matchedProduct: products[0],
        confidence: "high",
      });
    } else {
      matchedItems.push({
        originalItem: item,
        confidence: "no_match",
      });
    }
  }

  return matchedItems;
}

export default router;
